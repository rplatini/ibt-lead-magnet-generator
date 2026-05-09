import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { closeBrowser } from "./puppeteer-setup";
import { renderHtmlToPdf } from "./render";

describe("renderHtmlToPdf", () => {
	const dir = mkdtempSync(join(tmpdir(), "lmg-"));

	afterAll(async () => {
		await closeBrowser();
		rmSync(dir, { recursive: true, force: true });
	});

	it("writes a non-empty PDF to the requested path", async () => {
		const out = join(dir, "out.pdf");
		await renderHtmlToPdf("<html><body><h1>Hi</h1></body></html>", out);
		expect(existsSync(out)).toBe(true);
		const buf = readFileSync(out);
		expect(buf.length).toBeGreaterThan(1024);
		expect(buf.subarray(0, 4).toString()).toBe("%PDF");
	});
});
