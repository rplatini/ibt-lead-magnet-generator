import { z } from "zod";

export type SlotDef =
	| {
			type: "string" | "html";
			required?: boolean;
			maxLength?: number;
	  }
	| {
			type: "url";
			required?: boolean;
	  }
	| {
			type: "number";
			required?: boolean;
	  }
	| {
			type: "boolean";
			required?: boolean;
	  }
	| {
			type: "object";
			required?: boolean;
			shape: Record<string, SlotDef>;
	  }
	| {
			type: "array";
			required?: boolean;
			minItems?: number;
			maxItems?: number;
			items: SlotDef;
	  };

const Slot: z.ZodType<SlotDef> = z.lazy(() =>
	z.union([
		z.object({
			type: z.enum(["string", "html"]),
			required: z.boolean().optional(),
			maxLength: z.number().int().positive().optional(),
		}),
		z.object({
			type: z.literal("url"),
			required: z.boolean().optional(),
		}),
		z.object({
			type: z.literal("number"),
			required: z.boolean().optional(),
		}),
		z.object({
			type: z.literal("boolean"),
			required: z.boolean().optional(),
		}),
		z.object({
			type: z.literal("object"),
			required: z.boolean().optional(),
			shape: z.record(z.string(), Slot),
		}),
		z.object({
			type: z.literal("array"),
			required: z.boolean().optional(),
			minItems: z.number().int().nonnegative().optional(),
			maxItems: z.number().int().positive().optional(),
			items: Slot,
		}),
	]),
);

export const SlotSchemaFile = z.object({
	version: z.literal(1),
	slots: z.record(z.string(), Slot),
	input: z.record(z.string(), Slot),
});
export type SlotSchemaFile = z.infer<typeof SlotSchemaFile>;

interface ValidationError {
	path: string;
	message: string;
}

export function validateData(
	schema: SlotSchemaFile,
	data: unknown,
): { ok: true } | { ok: false; errors: ValidationError[] } {
	const errors: ValidationError[] = [];
	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		return {
			ok: false,
			errors: [{ path: "$", message: "data must be object" }],
		};
	}
	const obj = data as Record<string, unknown>;

	for (const key of Object.keys(obj)) {
		if (!(key in schema.slots)) {
			errors.push({ path: key, message: "unknown slot" });
		}
	}

	for (const [key, def] of Object.entries(schema.slots)) {
		validate(def, obj[key], key, errors);
	}

	return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function validate(
	def: SlotDef,
	value: unknown,
	path: string,
	errors: ValidationError[],
): void {
	const required = "required" in def ? def.required : false;
	if (value === undefined || value === null) {
		if (required) errors.push({ path, message: "required" });
		return;
	}
	if (def.type === "string" || def.type === "html") {
		if (typeof value !== "string") {
			errors.push({ path, message: "expected string" });
			return;
		}
		if (def.maxLength && value.length > def.maxLength) {
			errors.push({ path, message: `> maxLength ${def.maxLength}` });
		}
	} else if (def.type === "url") {
		if (typeof value !== "string") {
			errors.push({ path, message: "expected string" });
			return;
		}
		try {
			new URL(value);
		} catch {
			errors.push({ path, message: "expected valid absolute URL" });
		}
	} else if (def.type === "number") {
		if (typeof value !== "number")
			errors.push({ path, message: "expected number" });
	} else if (def.type === "boolean") {
		if (typeof value !== "boolean")
			errors.push({ path, message: "expected boolean" });
	} else if (def.type === "array") {
		if (!Array.isArray(value)) {
			errors.push({ path, message: "expected array" });
			return;
		}
		if (def.minItems !== undefined && value.length < def.minItems) {
			errors.push({ path, message: `< minItems ${def.minItems}` });
		}
		if (def.maxItems !== undefined && value.length > def.maxItems) {
			errors.push({ path, message: `> maxItems ${def.maxItems}` });
		}
		value.forEach((item, i) => {
			validate(def.items, item, `${path}[${i}]`, errors);
		});
	} else if (def.type === "object") {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			errors.push({ path, message: "expected object" });
			return;
		}
		for (const [k, child] of Object.entries(def.shape)) {
			validate(
				child,
				(value as Record<string, unknown>)[k],
				`${path}.${k}`,
				errors,
			);
		}
	}
}
