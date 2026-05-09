import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { runLeadMagnetFiller } from "../agents/lead-magnet-filler";
import { closeBrowser } from "../pdf/puppeteer-setup";

function arg(name: string): string | undefined {
	const idx = process.argv.indexOf(`--${name}`);
	return idx > -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
	const templateId = arg("template");
	const inputJson = arg("input");
	if (!templateId || !inputJson) {
		console.error("usage: generate-magnet.ts --template <id> --input '<json>'");
		process.exit(1);
	}
	const input = JSON.parse(inputJson) as Record<string, unknown>;
	const root = resolve(__dirname, "..", "..", "templates");
	const outputDir = resolve(__dirname, "..", "..", "output");
	const out = await runLeadMagnetFiller({
		templateId,
		input,
		templatesRoot: root,
		outputDir,
		runId: `${templateId}-${randomUUID().slice(0, 8)}`,
	});
	console.log(out);
	await closeBrowser();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
