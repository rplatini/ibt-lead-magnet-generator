import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import Handlebars from "handlebars";
import { renderHtmlToPdf } from "../pdf/render";
import { renderTemplate } from "../templating/handlebars-runtime";

interface ToolsConfig {
	templatesRoot: string;
}

const ALLOWED_FILES = new Set([
	"template.html",
	"slot-schema.json",
	"style-tokens.json",
	"meta.json",
	"brand-context.json",
]);

const KNOWN_HANDLEBARS_HELPERS = {
	if: true,
	unless: true,
	each: true,
	with: true,
	lookup: true,
	log: true,
};

function precompileHandlebars(source: string): string | null {
	try {
		Handlebars.precompile(source, {
			knownHelpers: KNOWN_HANDLEBARS_HELPERS,
			knownHelpersOnly: true,
			strict: false,
		});
		return null;
	} catch (err) {
		return err instanceof Error ? err.message : String(err);
	}
}

export function createTemplateBuilderTools(cfg: ToolsConfig) {
	async function writeTemplateFile(args: {
		templateId: string;
		file: string;
		content: string;
	}): Promise<void> {
		if (!ALLOWED_FILES.has(args.file)) {
			throw new Error(`disallowed file: ${args.file}`);
		}
		if (args.file === "template.html") {
			const error = precompileHandlebars(args.content);
			if (error) {
				throw new Error(
					`template.html failed Handlebars compile: ${error}\n` +
						"Only built-in helpers are allowed (if, unless, each, with, lookup). " +
						"Custom helpers are NOT registered.",
				);
			}
		}
		if (
			args.file === "slot-schema.json" ||
			args.file === "style-tokens.json" ||
			args.file === "meta.json" ||
			args.file === "brand-context.json"
		) {
			try {
				JSON.parse(args.content);
			} catch (err) {
				throw new Error(
					`${args.file} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}
		const dir = join(cfg.templatesRoot, args.templateId);
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, args.file), args.content);
	}

	async function readTemplateFile(args: {
		templateId: string;
		file: string;
	}): Promise<string> {
		const path = join(cfg.templatesRoot, args.templateId, args.file);
		return readFile(path, "utf8");
	}

	async function renderPreview(args: {
		templateId: string;
		dummyData: Record<string, unknown>;
	}): Promise<string> {
		const dir = join(cfg.templatesRoot, args.templateId);
		const tpl = await readFile(join(dir, "template.html"), "utf8");
		const tokensRaw = await readFile(
			join(dir, "style-tokens.json"),
			"utf8",
		).catch(() => "{}");
		const tokens = JSON.parse(tokensRaw);
		const html = renderTemplate(tpl, {
			...args.dummyData,
			styleTokens: tokens,
		});
		const out = join(dir, "preview.pdf");
		await renderHtmlToPdf(html, out);
		return out;
	}

	return { readFile: readTemplateFile, writeTemplateFile, renderPreview };
}
