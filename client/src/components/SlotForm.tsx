import { useState } from "react";
import type { SlotDef, SlotSchema } from "../types";

interface Props {
	schema: SlotSchema;
	value: Record<string, unknown>;
	onChange: (next: Record<string, unknown>) => void;
	onSubmit: () => void;
	submitting?: boolean;
	submitLabel?: string;
	readonly?: boolean;
}

function camelToLabel(key: string): string {
	const spaced = key.replace(/([A-Z])/g, " $1").toLowerCase();
	const capitalized = spaced.charAt(0).toUpperCase() + spaced.slice(1);
	return capitalized.replace(/\burl\b/gi, "URL");
}

function validateUrl(val: string): string | null {
	if (!val.trim()) return "Please enter a URL";
	try {
		const u = new URL(val);
		if (u.protocol !== "https:") throw new Error();
		return null;
	} catch {
		return "Please enter a valid URL starting with https://";
	}
}

export default function SlotForm({
	schema,
	value,
	onChange,
	onSubmit,
	submitting,
	submitLabel = "Generate",
	readonly = false,
}: Props) {
	const inputDefs = schema.input ?? {};
	const entries = Object.entries(inputDefs);

	const [errors, setErrors] = useState<Record<string, string | null>>({});

	const handleChange = (key: string, next: unknown) => {
		onChange({ ...value, [key]: next });
	};

	const setError = (key: string, msg: string | null) => {
		setErrors((prev) => ({ ...prev, [key]: msg }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const nextErrors: Record<string, string | null> = {};
		let hasError = false;
		for (const [key, def] of entries) {
			if (def.type === "url") {
				const msg = validateUrl((value[key] as string) ?? "");
				nextErrors[key] = msg;
				if (msg) hasError = true;
			}
		}
		if (hasError) {
			setErrors((prev) => ({ ...prev, ...nextErrors }));
			return;
		}
		onSubmit();
	};

	if (readonly) {
		return (
			<div className="space-y-4">
				{entries.length === 0 && (
					<div className="text-sm text-slate-500">
						This template has no input fields.
					</div>
				)}
				{entries.map(([key, def]) => (
					<Field
						key={key}
						fieldKey={key}
						def={def}
						value={value[key]}
						onChange={() => {}}
						error={null}
						onError={() => {}}
						readonly
					/>
				))}
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{entries.length === 0 && (
				<div className="text-sm text-slate-500">
					This template has no input fields.
				</div>
			)}
			{entries.map(([key, def]) => (
				<Field
					key={key}
					fieldKey={key}
					def={def}
					value={value[key]}
					onChange={(v) => handleChange(key, v)}
					error={errors[key] ?? null}
					onError={(msg) => setError(key, msg)}
				/>
			))}
			<button
				type="submit"
				disabled={submitting}
				className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
			>
				{submitting ? "Working…" : submitLabel}
			</button>
		</form>
	);
}

function Field({
	fieldKey,
	def,
	value,
	onChange,
	error,
	onError,
	readonly = false,
}: {
	fieldKey: string;
	def: SlotDef;
	value: unknown;
	onChange: (next: unknown) => void;
	error: string | null;
	onError: (msg: string | null) => void;
	readonly?: boolean;
}) {
	const label = (
		<label
			htmlFor={`slot-${fieldKey}`}
			className="block text-sm font-medium text-slate-700"
		>
			{camelToLabel(fieldKey)}
			{def.required && <span className="text-red-500 ml-0.5">*</span>}
		</label>
	);
	const hint = def.hint ? (
		<p className="text-xs text-slate-500 mt-0.5">{def.hint}</p>
	) : null;

	if (readonly) {
		const displayValue =
			value === undefined || value === null
				? "—"
				: typeof value === "object"
					? JSON.stringify(value, null, 2)
					: String(value);
		return (
			<div>
				<p className="block text-sm font-medium text-slate-700">
					{camelToLabel(fieldKey)}
				</p>
				<p className="mt-1 px-3 py-2 text-sm text-slate-700 bg-slate-50 rounded-md border border-slate-200 whitespace-pre-wrap break-all">
					{displayValue}
				</p>
				{hint}
			</div>
		);
	}

	if (def.type === "url") {
		const borderClass = error
			? "border-red-400 focus:ring-red-300"
			: "border-slate-200 focus:ring-slate-300";
		return (
			<div>
				{label}
				<input
					id={`slot-${fieldKey}`}
					type="text"
					value={(value as string) ?? ""}
					onChange={(e) => {
						onError(null);
						onChange(e.target.value);
					}}
					onBlur={(e) => {
						onError(validateUrl(e.target.value));
					}}
					placeholder="https://example.com"
					className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${borderClass}`}
				/>
				{error && <p className="text-xs text-red-600 mt-1">{error}</p>}
				{hint}
			</div>
		);
	}

	if (def.type === "string" || def.type === "html") {
		const useTextarea = (def.maxLength ?? 0) > 200 || def.type === "html";
		return (
			<div>
				{label}
				{useTextarea ? (
					<textarea
						id={`slot-${fieldKey}`}
						value={(value as string) ?? ""}
						onChange={(e) => onChange(e.target.value)}
						rows={4}
						className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
					/>
				) : (
					<input
						id={`slot-${fieldKey}`}
						type="text"
						value={(value as string) ?? ""}
						onChange={(e) => onChange(e.target.value)}
						className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
					/>
				)}
				{hint}
			</div>
		);
	}
	if (def.type === "number") {
		return (
			<div>
				{label}
				<input
					id={`slot-${fieldKey}`}
					type="number"
					value={value === undefined || value === null ? "" : String(value)}
					onChange={(e) =>
						onChange(e.target.value === "" ? undefined : Number(e.target.value))
					}
					className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
				/>
				{hint}
			</div>
		);
	}
	if (def.type === "boolean") {
		return (
			<div className="flex items-start gap-2">
				<input
					id={`slot-${fieldKey}`}
					type="checkbox"
					checked={Boolean(value)}
					onChange={(e) => onChange(e.target.checked)}
					className="mt-1"
				/>
				<div>
					{label}
					{hint}
				</div>
			</div>
		);
	}
	return (
		<div>
			{label}
			<textarea
				id={`slot-${fieldKey}`}
				value={value === undefined ? "" : JSON.stringify(value, null, 2)}
				onChange={(e) => {
					try {
						onChange(JSON.parse(e.target.value));
					} catch {
						// allow invalid JSON during editing
					}
				}}
				rows={6}
				className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
			/>
			{hint}
			<p className="text-xs text-amber-600 mt-1">
				Complex field — edit as JSON.
			</p>
		</div>
	);
}
