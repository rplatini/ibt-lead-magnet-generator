import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { closeBrowser } from "../pdf/puppeteer-setup";
import { createTemplateBuilderTools } from "./template-builder-tools";

describe("template-builder-tools", () => {
	const root = mkdtempSync(join(tmpdir(), "lmg-tools-"));
	const tools = createTemplateBuilderTools({ templatesRoot: root });

	afterAll(async () => {
		await closeBrowser();
		rmSync(root, { recursive: true, force: true });
	});

	it("write_template_file creates the file under templates/<id>/", async () => {
		await tools.writeTemplateFile({
			templateId: "t1",
			file: "template.html",
			content: "<html><body>Hi</body></html>",
		});
		expect(existsSync(join(root, "t1/template.html"))).toBe(true);
	});

	it("read_file reads a previously written file", async () => {
		await tools.writeTemplateFile({
			templateId: "t1",
			file: "slot-schema.json",
			content: '{"version":1,"slots":{},"input":{}}',
		});
		const text = await tools.readFile({
			templateId: "t1",
			file: "slot-schema.json",
		});
		expect(text).toContain('"version"');
	});

	it("render_preview emits a PDF in output/", async () => {
		await tools.writeTemplateFile({
			templateId: "t2",
			file: "template.html",
			content: "<html><body><h1>{{title}}</h1></body></html>",
		});
		await tools.writeTemplateFile({
			templateId: "t2",
			file: "style-tokens.json",
			content: "{}",
		});
		const out = await tools.renderPreview({
			templateId: "t2",
			dummyData: { title: "Hello" },
		});
		expect(existsSync(out)).toBe(true);
		const buf = await readFile(out);
		expect(buf.subarray(0, 4).toString()).toBe("%PDF");
	});
});
