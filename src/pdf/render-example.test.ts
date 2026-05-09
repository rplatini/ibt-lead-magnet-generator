import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { renderTemplate } from "../templating/handlebars-runtime";
import { closeBrowser } from "./puppeteer-setup";
import { renderHtmlToPdf } from "./render";

describe("example template renders to PDF", () => {
	const dir = mkdtempSync(join(tmpdir(), "lmg-render-"));
	afterAll(async () => {
		await closeBrowser();
		rmSync(dir, { recursive: true, force: true });
	});

	it("produces a valid PDF", async () => {
		const root = resolve(__dirname, "..", "..");
		const tplPath = join(root, "templates/_example/template.html");
		const tokensPath = join(root, "templates/_example/style-tokens.json");
		const tpl = await readFile(tplPath, "utf8");
		const tokens = JSON.parse(await readFile(tokensPath, "utf8"));

		const html = renderTemplate(tpl, {
			styleTokens: tokens,
			eyebrow: "Industry brief",
			title: "How [Industry] is being reshaped",
			subtitle:
				"Three trends driving the next 18 months for operators in this sector.",
			targetName: "Acme Corp",
			sections: [
				{ heading: "Trend 1", body: "<p>Body for trend one.</p>" },
				{ heading: "Trend 2", body: "<p>Body for trend two.</p>" },
			],
			cta: {
				heading: "Want a deeper read?",
				body: "Reply to this email for a 30-min strategy call.",
			},
		});

		const out = join(dir, "example.pdf");
		await renderHtmlToPdf(html, out);
		expect(existsSync(out)).toBe(true);
		expect(readFileSync(out).length).toBeGreaterThan(5000);
	});
});
