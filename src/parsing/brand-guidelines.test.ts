import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGuidelines } from "./brand-guidelines";

describe("parseGuidelines", () => {
	it("returns text and source path for a TXT file", async () => {
		const p = resolve(__dirname, "__fixtures__/sample.txt");
		const result = await parseGuidelines(p);
		expect(result.text).toContain("Primary color");
		expect(result.source).toBe(p);
		expect(result.kind).toBe("txt");
	});

	it("rejects unsupported extensions", async () => {
		await expect(parseGuidelines("/tmp/x.docx")).rejects.toThrow(
			/unsupported/i,
		);
	});
});
