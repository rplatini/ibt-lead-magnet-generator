import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { renderHtmlToPdf } from "../pdf/render";
import { renderTemplate } from "../templating/handlebars-runtime";
import { SlotSchemaFile, validateData } from "../templating/slot-schema";

interface ToolsConfig {
	templatesRoot: string;
	outputDir: string;
}

export function createLeadMagnetFillerTools(cfg: ToolsConfig) {
	async function loadSchema(templateId: string) {
		const raw = await readFile(
			join(cfg.templatesRoot, templateId, "slot-schema.json"),
			"utf8",
		);
		return SlotSchemaFile.parse(JSON.parse(raw));
	}

	async function validateDataTool(args: {
		templateId: string;
		data: Record<string, unknown>;
	}) {
		const schema = await loadSchema(args.templateId);
		return validateData(schema, args.data);
	}

	async function renderPdf(args: {
		templateId: string;
		data: Record<string, unknown>;
		runId: string;
	}): Promise<string> {
		const dir = join(cfg.templatesRoot, args.templateId);
		const schema = await loadSchema(args.templateId);
		const result = validateData(schema, args.data);
		if (!result.ok) {
			throw new Error(
				`data does not match slot-schema: ${JSON.stringify(result.errors)}`,
			);
		}
		const tpl = await readFile(join(dir, "template.html"), "utf8");
		const tokens = JSON.parse(
			await readFile(join(dir, "style-tokens.json"), "utf8").catch(() => "{}"),
		);
		const html = renderTemplate(tpl, { ...args.data, styleTokens: tokens });
		const out = join(cfg.outputDir, `${args.runId}.pdf`);
		await renderHtmlToPdf(html, out);
		return out;
	}

	return { validateData: validateDataTool, renderPdf };
}
