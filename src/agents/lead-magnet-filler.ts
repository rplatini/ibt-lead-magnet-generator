import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import {
	createSdkMcpServer,
	query,
	tool,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { type AgentEvent, truncateForLog } from "./agent-events";
import { createLeadMagnetFillerTools } from "./lead-magnet-filler-tools";

const SYSTEM_PROMPT_PREFIX = `You are a research-driven copywriter generating a personalized PDF lead magnet from a template. The template author defined a slot schema; your job is to produce a JSON payload matching that schema, grounded in factual research about the target.

Workflow:
1. Read slot-schema.json to know what slots you must produce.
2. Use the WebSearch built-in tool to research the target company, contact, and sector.
3. Draft the JSON payload.
4. Call validate_data — if it fails, fix and retry.
5. Once valid, call render_pdf and return its path.

`;

interface RunOptions {
	templateId: string;
	input: Record<string, unknown>;
	templatesRoot: string;
	outputDir: string;
	runId: string;
}

export async function runLeadMagnetFiller(opts: RunOptions): Promise<string> {
	let renderedPath: string | undefined;
	let errorMessage: string | undefined;
	for await (const event of runLeadMagnetFillerStreaming(opts)) {
		if (event.type === "tool_use") {
			process.stderr.write(
				`[tool_use] ${event.name} ${JSON.stringify(event.input).slice(0, 400)}\n`,
			);
		} else if (event.type === "text") {
			process.stderr.write(`[asst] ${event.text}\n`);
		} else if (event.type === "tool_result") {
			process.stderr.write(
				`[tool_result] ${event.ok ? "ok" : "fail"}${event.preview ? ` ${event.preview.slice(0, 200)}` : ""}\n`,
			);
		} else if (event.type === "done" && event.pdfUrl) {
			renderedPath = event.pdfUrl;
		} else if (event.type === "error") {
			errorMessage = event.message;
		}
	}
	if (errorMessage) throw new Error(errorMessage);
	if (!renderedPath) throw new Error("agent did not call render_pdf");
	return renderedPath;
}

export async function* runLeadMagnetFillerStreaming(
	opts: RunOptions,
): AsyncGenerator<AgentEvent> {
	const startedAtMs = Date.now();
	const startedAtIso = new Date(startedAtMs).toISOString();
	const collectedEvents: AgentEvent[] = [];

	const tools = createLeadMagnetFillerTools({
		templatesRoot: opts.templatesRoot,
		outputDir: opts.outputDir,
	});

	const dir = join(opts.templatesRoot, opts.templateId);
	const tokens = JSON.parse(
		await readFile(join(dir, "style-tokens.json"), "utf8"),
	);
	const slotSchemaText = await readFile(join(dir, "slot-schema.json"), "utf8");
	const brandContextRaw = await readFile(
		join(dir, "brand-context.json"),
		"utf8",
	).catch(() => null);
	const brandContext = brandContextRaw
		? (JSON.parse(brandContextRaw) as {
				companyOffering?: string;
				leadMagnetPurpose?: string;
				writingRules?: string;
			})
		: null;
	const metaRaw = await readFile(join(dir, "meta.json"), "utf8").catch(
		() => null,
	);
	const customerName = metaRaw
		? ((JSON.parse(metaRaw) as { name?: string }).name ?? opts.templateId)
		: opts.templateId;

	const validate = tool(
		"validate_data",
		"Check a JSON payload against the template's slot schema. Returns {ok:true} or {ok:false, errors:[...]}.",
		{ data: z.record(z.string(), z.unknown()) },
		async (args) => {
			const result = await tools.validateData({
				templateId: opts.templateId,
				data: args.data,
			});
			return { content: [{ type: "text", text: JSON.stringify(result) }] };
		},
	);

	let renderedPath = "";
	const render = tool(
		"render_pdf",
		"Render the final PDF with a validated payload. Returns the output path.",
		{ data: z.record(z.string(), z.unknown()) },
		async (args) => {
			renderedPath = await tools.renderPdf({
				templateId: opts.templateId,
				data: args.data,
				runId: opts.runId,
			});
			return { content: [{ type: "text", text: renderedPath }] };
		},
	);

	const mcpServer = createSdkMcpServer({
		name: "lmg-filler",
		tools: [validate, render],
	});

	const targetCompany =
		(opts.input as { targetCompany?: string }).targetCompany ?? "the target";
	const framingBlock = brandContext
		? buildFramingBlock(customerName, targetCompany, brandContext)
		: `Voice / style guidelines from the customer:\n${tokens.voiceGuidelines ?? ""}`;

	const session = query({
		prompt: `Slot schema for templateId=${opts.templateId}:\n\n${slotSchemaText}\n\nCaller input:\n${JSON.stringify(opts.input)}\n\nGenerate the lead magnet.`,
		options: {
			model: "claude-haiku-4-5",
			systemPrompt: SYSTEM_PROMPT_PREFIX + framingBlock,
			mcpServers: { "lmg-filler": mcpServer },
			tools: [
				"WebSearch",
				"mcp__lmg-filler__validate_data",
				"mcp__lmg-filler__render_pdf",
			],
			allowedTools: [
				"WebSearch",
				"mcp__lmg-filler__validate_data",
				"mcp__lmg-filler__render_pdf",
			],
			permissionMode: "bypassPermissions",
			allowDangerouslySkipPermissions: true,
			maxTurns: 20,
		},
	});

	const emit = (event: AgentEvent): AgentEvent => {
		collectedEvents.push(event);
		return event;
	};

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
					yield emit({ type: "text", text: truncateForLog(combined) });
				}
				for (const tu of toolUses) {
					yield emit({
						type: "tool_use",
						id: tu.id,
						name: tu.name,
						input: tu.input,
					});
				}
			} else if (e.type === "user" && Array.isArray(e.message?.content)) {
				for (const block of e.message.content) {
					if (block.type === "tool_result") {
						const text =
							typeof block.content === "string"
								? block.content
								: JSON.stringify(block.content);
						const truncated = truncateForLog(text);
						let ok = !block.is_error;
						if (ok) {
							try {
								const parsed = JSON.parse(text);
								if (parsed && typeof parsed === "object" && "ok" in parsed) {
									ok = Boolean(parsed.ok);
								}
							} catch {
								// non-JSON tool result; default to ok
							}
						}
						yield emit({
							type: "tool_result",
							toolUseId: block.tool_use_id ?? "",
							ok,
							preview: truncated,
						});
					}
				}
			}
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		yield emit({ type: "error", message });
		await writeSidecar({
			opts,
			startedAtIso,
			startedAtMs,
			status: "error",
			pdfPath: renderedPath || null,
			events: collectedEvents,
		});
		return;
	}

	if (!renderedPath) {
		const msg = "agent did not call render_pdf";
		yield emit({ type: "error", message: msg });
		await writeSidecar({
			opts,
			startedAtIso,
			startedAtMs,
			status: "error",
			pdfPath: null,
			events: collectedEvents,
		});
		return;
	}

	await writeSidecar({
		opts,
		startedAtIso,
		startedAtMs,
		status: "ok",
		pdfPath: renderedPath,
		events: collectedEvents,
	});

	yield emit({
		type: "done",
		runId: opts.runId,
		pdfUrl: renderedPath,
	});
}

function buildFramingBlock(
	customerName: string,
	targetCompany: string,
	bc: {
		companyOffering?: string;
		leadMagnetPurpose?: string;
		writingRules?: string;
	},
): string {
	const lines = [
		`You are writing a lead magnet FROM ${customerName} TO ${targetCompany}.`,
		"",
		"The customer's offering:",
		bc.companyOffering?.trim() || "(not provided)",
		"",
		"This lead magnet's purpose:",
		bc.leadMagnetPurpose?.trim() || "(not provided)",
		"",
		"Writing rules:",
		bc.writingRules?.trim() || "(not provided)",
		"",
		"CRITICAL framing rules:",
		`- Frame all content as how the TARGET (${targetCompany}) benefits from the CUSTOMER's (${customerName}) offering.`,
		`- Do NOT pitch the target's own products. Do NOT write a sales page for the target.`,
		`- Research the target to find concrete pain points, initiatives, or use cases that fit the customer's offering, then position the offering as the solution.`,
	];
	return lines.join("\n");
}

async function writeSidecar(args: {
	opts: RunOptions;
	startedAtIso: string;
	startedAtMs: number;
	status: "ok" | "error";
	pdfPath: string | null;
	events: AgentEvent[];
}): Promise<void> {
	const sidecar = {
		runId: args.opts.runId,
		templateId: args.opts.templateId,
		input: args.opts.input,
		createdAt: args.startedAtIso,
		durationMs: Date.now() - args.startedAtMs,
		status: args.status,
		pdfPath: args.pdfPath ? basename(args.pdfPath) : null,
		events: args.events,
	};
	await writeFile(
		join(args.opts.outputDir, `${args.opts.runId}.json`),
		JSON.stringify(sidecar, null, 2),
	);
}
