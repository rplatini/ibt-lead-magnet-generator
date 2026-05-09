import { resolve } from "node:path";
import { runTemplateBuilder } from "../agents/template-builder";
import { parseGuidelines } from "../parsing/brand-guidelines";
import { closeBrowser } from "../pdf/puppeteer-setup";

function arg(name: string): string | undefined {
	const idx = process.argv.indexOf(`--${name}`);
	return idx > -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
	const guidelinesArgs = process.argv
		.map((v, i) => (v === "--guidelines" ? process.argv[i + 1] : null))
		.filter((v): v is string => Boolean(v));
	const templateId = arg("output-id");

	if (guidelinesArgs.length === 0 || !templateId) {
		console.error(
			"usage: build-template.ts --guidelines <path> [--guidelines <path> ...] --output-id <id>",
		);
		process.exit(1);
	}

	const guidelines = await Promise.all(guidelinesArgs.map(parseGuidelines));
	const root = resolve(__dirname, "..", "..", "templates");
	await runTemplateBuilder({ templateId, templatesRoot: root, guidelines });
	await closeBrowser();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
