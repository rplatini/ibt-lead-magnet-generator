import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { closeBrowser } from "../pdf/puppeteer-setup";
import { createLeadMagnetFillerTools } from "./lead-magnet-filler-tools";

describe("lead-magnet-filler-tools", () => {
	const root = mkdtempSync(join(tmpdir(), "lmg-filler-"));
	const outDir = mkdtempSync(join(tmpdir(), "lmg-filler-out-"));

	afterAll(async () => {
		await closeBrowser();
		rmSync(root, { recursive: true, force: true });
		rmSync(outDir, { recursive: true, force: true });
	});

	it("validate_data flags missing slots", async () => {
		await mkdir(join(root, "t1"), { recursive: true });
		await writeFile(
			join(root, "t1/slot-schema.json"),
			'{"version":1,"slots":{"title":{"type":"string","required":true}},"input":{}}',
		);
		const tools = createLeadMagnetFillerTools({
			templatesRoot: root,
			outputDir: outDir,
		});
		const result = await tools.validateData({ templateId: "t1", data: {} });
		expect(result.ok).toBe(false);
	});

	it("render_pdf produces a file when data is valid", async () => {
		await mkdir(join(root, "t2"), { recursive: true });
		await writeFile(
			join(root, "t2/template.html"),
			"<html><body><h1>{{title}}</h1></body></html>",
		);
		await writeFile(
			join(root, "t2/slot-schema.json"),
			'{"version":1,"slots":{"title":{"type":"string","required":true}},"input":{}}',
		);
		await writeFile(join(root, "t2/style-tokens.json"), "{}");
		const tools = createLeadMagnetFillerTools({
			templatesRoot: root,
			outputDir: outDir,
		});
		const out = await tools.renderPdf({
			templateId: "t2",
			data: { title: "Hello" },
			runId: "run1",
		});
		expect(existsSync(out)).toBe(true);
		expect(out.endsWith("run1.pdf")).toBe(true);
	});
});
