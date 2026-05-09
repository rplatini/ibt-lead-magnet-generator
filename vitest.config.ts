import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Puppeteer cold-start can take a while (Chromium launch); render-tests
		// occasionally hit the wire for Tailwind CDN + Google Fonts.
		testTimeout: 30000,
		hookTimeout: 30000,
		include: ["src/**/*.test.ts"],
	},
});
