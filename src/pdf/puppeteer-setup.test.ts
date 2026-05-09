import { afterAll, describe, expect, it } from "vitest";
import { closeBrowser, getBrowser } from "./puppeteer-setup";

describe("puppeteer-setup", () => {
	afterAll(async () => {
		await closeBrowser();
	});

	it("returns the same browser instance across calls", async () => {
		const a = await getBrowser();
		const b = await getBrowser();
		expect(a).toBe(b);
	});

	it("closeBrowser nullifies the singleton", async () => {
		const a = await getBrowser();
		await closeBrowser();
		const b = await getBrowser();
		expect(a).not.toBe(b);
	});
});
