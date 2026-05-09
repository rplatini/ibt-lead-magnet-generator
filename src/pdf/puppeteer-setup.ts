import puppeteer, { type Browser } from "puppeteer";

let cached: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
	if (cached?.connected) return cached;
	cached = await puppeteer.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	return cached;
}

export async function closeBrowser(): Promise<void> {
	if (cached) {
		await cached.close().catch(() => {});
		cached = null;
	}
}
