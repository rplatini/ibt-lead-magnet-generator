import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	createSdkMcpServer,
	query,
	tool,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { ParsedGuidelines } from "../parsing/brand-guidelines";
import { type AgentEvent, truncateForLog } from "./agent-events";
import { createTemplateBuilderTools } from "./template-builder-tools";

const SYSTEM_PROMPT = `You are a brand-savvy designer. The user pastes brand guidelines and chats with you to design a custom lead-magnet template.

Your job:
1. Read the guidelines (provided in the first user message). For PDFs you receive BOTH the extracted text AND the rendered page images. Use both: text gives you factual content (font names, color names, voice and tone copy), images give you visual fidelity (actual color, layout, what the design looks like).
2. **Cross-reference text and images**. Brandbooks have dedicated pages for: cover/intro, color palette, typography, logo usage, voice/tone. The extracted text usually contains the exact font and color names labeled on those pages. The images confirm what they look like.
3. For typography: read the typeface name from the text. Do NOT guess from visual cues alone. If the brandbook lists multiple fonts (e.g. a display face and a body face), record the body face as "fontFamily" and add an optional "displayFontFamily" entry. Use Google Fonts–compatible names; if the exact font is not on Google Fonts, pick the closest Google Fonts match and note the original in voiceGuidelines.
4. Read the example template at templateId='_example' (template.html, slot-schema.json, style-tokens.json) to understand the required shape.
5. **CONFIRMATION GATE — DO NOT skip this step.** Before writing any files or rendering anything, post a confirmation summary. Keep it under 1000 characters total. Use this exact structure — nothing more:

   **Colors:** <hex1 label>, <hex2 label>, …\n
   **Font:** <font name>\n
   **Voice:** <2–3 keywords>\n
   **Structure:** <e.g. 5 pages: cover, 3 content sections, CTA>\n
   **Brand context:**
   - companyOffering: <value or "(missing — please provide)">\n
   - leadMagnetPurpose: <value or "(missing — please provide)">\n
   - writingRules: <value or "(missing — please provide)">\n

   Every item must be in a different line, and the brand context fields must be in a bullet list. Be concise but specific.

   End with exactly this line: "Reply **go** to build the template, or tell me what to adjust."

   Then STOP. Do not call write_template_file or render_preview yet.
6. Once the user approves (e.g. "go", "yes", "looks good", "proceed"), iteratively WRITE four files under templates/<id>/:
   - template.html  (Tailwind via CDN, Handlebars slots like {{title}}, {{#each sections}})
   - slot-schema.json  (declares slots and input fields the filler agent must produce); targetCompany is always required, DO NOT skip it
   - style-tokens.json  (brandColor, accentColor, fontFamily, logoUrl, voiceGuidelines, plus any other tokens you read from the brandbook)
   - brand-context.json  (companyUrl, companyOffering, leadMagnetPurpose, writingRules — possibly refined based on the conversation)
7. After all four files are written, call render_preview with realistic dummy data and tell the user the preview is ready.
8. Keep iterating with the user until they approve.

The template MUST follow the example shape under templates/_example/. Read it first if you are uncertain.

HANDLEBARS RULES (strict):
- Only use built-ins: {{var}}, {{{var}}} (raw HTML), {{#if x}}{{else}}{{/if}}, {{#unless}}, {{#each list}}{{this}}{{@index}}{{@first}}{{@last}}{{/each}}, {{lookup obj key}}.
- Do NOT use custom helpers. There is no {{format}}, {{padNumber}}, {{uppercase}}, {{truncate}}, {{add}}, {{numberLabel}}, etc. registered. Calling one will fail at compile time.
- If you need a formatted value (e.g. zero-padded section number, uppercase eyebrow), require it as a slot in slot-schema.json and let the filler agent produce the formatted string.

PDF PAGINATION RULES (strict — these prevent the most common bug: trailing whitespace on the last page):
- The renderer is Puppeteer with format A4 (794×1123 px @ 96dpi). The viewport is set to A4, so 1vh = 11.23px and 100vh = exactly one A4 page.
- Treat each "logical page" of the lead magnet (cover, content section group, CTA) as a section with min-height: 100vh. This ensures every page is full and there is no orphan whitespace.
- Always end the document with a section that has min-height: 100vh (typically the CTA). Never let the last element be a short block — Chromium will leave the rest of the A4 page blank.
- If you have a single short content element (e.g. just stats, no body), still wrap it in a section with min-height: 100vh, and use flex (display:flex; flex-direction:column; justify-content:center) to vertically center the content.
- Use page-break-after: always between page-defining sections to force a clean break (otherwise Chromium may try to fit two short sections on one page and you get awkward gaps).
- DO NOT try to "fix" trailing whitespace by reducing padding/margins. The fix is always: make the last visible section min-height: 100vh.

Use the write_template_file tool to write each file. Use render_preview after every meaningful change so the user can see what they're getting.

You may also edit meta.json (fields: templateId, name, createdAt, description) to refine the human-readable template name during the conversation. When you write the four template files, also update meta.json with these exact rules:
- "name": the company name only — no subtitle, no colon, no extra words (e.g. "Acme Corp", not "Acme Corp: Hiring Benchmarks").
- "description": one sentence, 12 words maximum, describing what kind of document this template generates (e.g. "Hiring benchmarks and AI recruitment strategies for HR leaders.").`;

interface RunOptions {
	templateId: string;
	templatesRoot: string;
	guidelines: ParsedGuidelines[];
}

export async function runTemplateBuilder(opts: RunOptions): Promise<void> {
	await ensureMetaFile({
		templateId: opts.templateId,
		templatesRoot: opts.templatesRoot,
	});

	const tools = createTemplateBuilderTools({
		templatesRoot: opts.templatesRoot,
	});

	const { writeTpl, readTpl, preview } = buildTools(tools, opts.templateId);

	const mcpServer = createSdkMcpServer({
		name: "lmg-template-builder",
		tools: [writeTpl, readTpl, preview],
	});

	const guidelinesText = opts.guidelines
		.map((g) => `--- ${g.source} (${g.kind}) ---\n${g.text}`)
		.join("\n\n");

	const session = query({
		prompt: `Brand guidelines:\n\n${guidelinesText}\n\nLet's start.`,
		options: queryOptions(mcpServer),
	});

	for await (const event of session) {
		if (event.type === "assistant") {
			for (const block of event.message.content) {
				if (block.type === "text") {
					process.stdout.write(block.text);
				}
			}
		}
	}
}

export interface BrandContext {
	companyUrl: string;
	companyOffering: string;
	leadMagnetPurpose: string;
	writingRules: string;
}

interface StreamingRunOptions {
	templateId: string;
	templatesRoot: string;
	guidelines: ParsedGuidelines[];
	brandContext?: BrandContext;
	userTurns: AsyncIterable<{ text: string }>;
}

export async function* runTemplateBuilderStreaming(
	opts: StreamingRunOptions,
): AsyncGenerator<AgentEvent> {
	await ensureMetaFile({
		templateId: opts.templateId,
		templatesRoot: opts.templatesRoot,
	});

	const tools = createTemplateBuilderTools({
		templatesRoot: opts.templatesRoot,
	});

	let previewUpdated = false;

	const { writeTpl, readTpl, preview } = buildTools(
		tools,
		opts.templateId,
		() => {
			previewUpdated = true;
		},
	);

	const mcpServer = createSdkMcpServer({
		name: "lmg-template-builder",
		tools: [writeTpl, readTpl, preview],
	});

	const initialContent = buildInitialContent(
		opts.guidelines,
		opts.templateId,
		opts.brandContext,
	);

	const promptIterable = mergeUserTurns({
		initialContent,
		turns: opts.userTurns,
	});

	const session = query({
		prompt: promptIterable,
		options: queryOptions(mcpServer),
	});

	try {
		for await (const event of session) {
			// biome-ignore lint/suspicious/noExplicitAny: SDK message shape varies
			const e = event as any;
			if (e.type === "assistant" && Array.isArray(e.message?.content)) {
				const textParts: string[] = [];
				const toolUses: Array<{ id: string; name: string; input: unknown }> =
					[];
				for (const block of e.message.content) {
					if (block.type === "text") {
						textParts.push(block.text);
					} else if (block.type === "tool_use") {
						toolUses.push({
							id: block.id,
							name: block.name,
							input: block.input,
						});
					}
				}
				const combined = textParts.join("\n\n").trim();
				if (combined) {
					yield { type: "text", text: truncateForLog(combined) };
				}
				for (const tu of toolUses) {
					yield {
						type: "tool_use",
						id: tu.id,
						name: tu.name,
						input: tu.input,
					};
				}
			} else if (e.type === "user" && Array.isArray(e.message?.content)) {
				for (const block of e.message.content) {
					if (block.type === "tool_result") {
						const text =
							typeof block.content === "string"
								? block.content
								: JSON.stringify(block.content);
						yield {
							type: "tool_result",
							toolUseId: block.tool_use_id ?? "",
							ok: !block.is_error,
							preview: truncateForLog(text),
						};
					}
				}
			}

			if (previewUpdated) {
				previewUpdated = false;
				yield {
					type: "preview-ready",
					url: `/api/templates/${opts.templateId}/preview.pdf`,
				};
			}
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		yield { type: "error", message };
	}
}

function buildTools(
	tools: ReturnType<typeof createTemplateBuilderTools>,
	templateId: string,
	onPreview?: () => void,
) {
	const writeTpl = tool(
		"write_template_file",
		"Write one of the template files (template.html, slot-schema.json, style-tokens.json, meta.json, brand-context.json).",
		{
			file: z.enum([
				"template.html",
				"slot-schema.json",
				"style-tokens.json",
				"meta.json",
				"brand-context.json",
			]),
			content: z.string(),
		},
		async (args) => {
			try {
				await tools.writeTemplateFile({
					templateId,
					file: args.file,
					content: args.content,
				});
				return { content: [{ type: "text", text: `wrote ${args.file}` }] };
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `error: ${message}` }],
					isError: true,
				};
			}
		},
	);

	const readTpl = tool(
		"read_template_file",
		"Read a file from this template or from the _example template (use templateId='_example').",
		{
			templateId: z.string(),
			file: z.enum([
				"template.html",
				"slot-schema.json",
				"style-tokens.json",
				"meta.json",
				"brand-context.json",
			]),
		},
		async (args) => {
			try {
				const text = await tools.readFile({
					templateId: args.templateId,
					file: args.file,
				});
				return { content: [{ type: "text", text }] };
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text", text: `error reading file: ${message}` }],
					isError: true,
				};
			}
		},
	);

	const preview = tool(
		"render_preview",
		"Render the current template with placeholder data and write a preview PDF. Returns the path.",
		{ dummyData: z.record(z.string(), z.unknown()) },
		async (args) => {
			const out = await tools.renderPreview({
				templateId,
				dummyData: args.dummyData,
			});
			onPreview?.();
			return { content: [{ type: "text", text: `preview written: ${out}` }] };
		},
	);

	return { writeTpl, readTpl, preview };
}

function queryOptions(
	// biome-ignore lint/suspicious/noExplicitAny: SDK type re-export friction
	mcpServer: any,
) {
	return {
		model: "claude-haiku-4-5",
		systemPrompt: SYSTEM_PROMPT,
		mcpServers: { "lmg-template-builder": mcpServer },
		tools: [
			"mcp__lmg-template-builder__write_template_file",
			"mcp__lmg-template-builder__read_template_file",
			"mcp__lmg-template-builder__render_preview",
		],
		allowedTools: [
			"mcp__lmg-template-builder__write_template_file",
			"mcp__lmg-template-builder__read_template_file",
			"mcp__lmg-template-builder__render_preview",
		],
		permissionMode: "bypassPermissions" as const,
		allowDangerouslySkipPermissions: true,
		maxTurns: 30,
	};
}

// biome-ignore lint/suspicious/noExplicitAny: SDK content block types vary
type ContentBlock = any;

async function* mergeUserTurns(args: {
	initialContent: ContentBlock[];
	turns: AsyncIterable<{ text: string }>;
	// biome-ignore lint/suspicious/noExplicitAny: SDKUserMessage type compatibility
}): AsyncIterable<any> {
	yield buildUserMessage(args.initialContent);
	for await (const turn of args.turns) {
		yield buildUserMessage([{ type: "text", text: turn.text }]);
	}
}

function buildUserMessage(content: ContentBlock[]) {
	return {
		type: "user" as const,
		message: {
			role: "user" as const,
			content,
		},
		parent_tool_use_id: null,
	};
}

function buildInitialContent(
	guidelines: ParsedGuidelines[],
	templateId: string,
	brandContext: BrandContext | undefined,
): ContentBlock[] {
	const blocks: ContentBlock[] = [];
	const headerLines: string[] = [`The template id is "${templateId}".`, ""];
	if (brandContext) {
		headerLines.push(
			`- companyUrl: ${brandContext.companyUrl || "(not provided — ask during confirmation)"}`,
		);
		headerLines.push(
			`- companyOffering: ${brandContext.companyOffering || "(not provided — ask during confirmation)"}`,
		);
		headerLines.push(
			`- leadMagnetPurpose: ${brandContext.leadMagnetPurpose || "(not provided — ask during confirmation)"}`,
		);
		headerLines.push(
			`- writingRules: ${brandContext.writingRules || "(not provided — ask during confirmation)"}`,
		);
		headerLines.push("");
	}
	headerLines.push("Brand guidelines below.");
	blocks.push({ type: "text", text: headerLines.join("\n") });

	for (const g of guidelines) {
		const imageNote =
			g.images && g.images.length > 0
				? `, ${g.images.length} page images attached`
				: "";
		const header = `--- ${g.source} (${g.kind}${imageNote}) ---`;
		const textPart =
			g.text.trim().length > 0 ? g.text : "(no extractable text)";
		blocks.push({ type: "text", text: `${header}\n${textPart}` });
		if (g.images && g.images.length > 0) {
			for (const img of g.images) {
				blocks.push({
					type: "image",
					source: {
						type: "base64",
						media_type: img.mediaType,
						data: img.pngBase64,
					},
				});
			}
		}
	}

	blocks.push({
		type: "text",
		text: "Let's start. Inspect any provided images carefully and extract colors, typography, and visual style cues directly from them.",
	});
	return blocks;
}

async function ensureMetaFile(args: {
	templateId: string;
	templatesRoot: string;
}): Promise<void> {
	const dir = join(args.templatesRoot, args.templateId);
	await mkdir(dir, { recursive: true });
	const metaPath = join(dir, "meta.json");
	try {
		await access(metaPath);
		return;
	} catch {
		// not present, create it
	}
	const meta = {
		templateId: args.templateId,
		name: args.templateId,
		createdAt: new Date().toISOString(),
	};
	await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
}
