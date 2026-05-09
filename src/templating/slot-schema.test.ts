import { describe, expect, it } from "vitest";
import { SlotSchemaFile, validateData } from "./slot-schema";

describe("SlotSchemaFile", () => {
	it("accepts a minimal valid schema", () => {
		const parsed = SlotSchemaFile.parse({
			version: 1,
			slots: { title: { type: "string", required: true } },
			input: {},
		});
		expect(parsed.version).toBe(1);
	});

	it("rejects an unknown slot type", () => {
		expect(() =>
			SlotSchemaFile.parse({
				version: 1,
				slots: { x: { type: "weird" } },
				input: {},
			}),
		).toThrow();
	});
});

describe("validateData", () => {
	const schema = {
		version: 1 as const,
		slots: {
			title: { type: "string" as const, required: true },
			sections: {
				type: "array" as const,
				items: {
					type: "object" as const,
					shape: {
						heading: { type: "string" as const, required: true },
						body: { type: "string" as const, required: true },
					},
				},
			},
		},
		input: {},
	};

	it("returns ok=true when data matches", () => {
		const result = validateData(schema, {
			title: "Hello",
			sections: [{ heading: "S1", body: "Body" }],
		});
		expect(result.ok).toBe(true);
	});

	it("returns ok=false with field paths when a required slot is missing", () => {
		const result = validateData(schema, { sections: [] });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.some((e) => e.path === "title")).toBe(true);
		}
	});

	it("flags extra slots not declared in the schema", () => {
		const result = validateData(schema, {
			title: "x",
			sections: [],
			rogue: "no",
		});
		expect(result.ok).toBe(false);
	});
});
