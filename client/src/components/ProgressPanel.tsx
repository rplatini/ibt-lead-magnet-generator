import { CheckCircle2, ChevronRight, Sparkles, XCircle } from "lucide-react";
import type { AgentEvent } from "../types";

interface Props {
	events: AgentEvent[];
	verbose: boolean;
	onToggleVerbose: () => void;
	durationMs?: number;
}

export default function ProgressPanel({
	events,
	verbose,
	onToggleVerbose,
	durationMs,
}: Props) {
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-semibold text-slate-900">Progress</h3>
				<label className="inline-flex items-center gap-2 text-xs text-slate-600">
					<input
						type="checkbox"
						checked={verbose}
						onChange={onToggleVerbose}
						className="rounded"
					/>
					Verbose
				</label>
			</div>
			{events.length === 0 && (
				<div className="text-sm text-slate-500">Waiting for first event…</div>
			)}
			<ol className="space-y-2">
				{events.map((event, i) => (
					<EventLine
						// biome-ignore lint/suspicious/noArrayIndexKey: event order is stable
						key={i}
						event={event}
						next={events[i + 1]}
						verbose={verbose}
					/>
				))}
			</ol>
			{durationMs !== undefined && (
				<div className="mt-4 text-xs text-slate-500 inline-flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
					Done in {(durationMs / 1000).toFixed(1)}s
				</div>
			)}
		</div>
	);
}

function EventLine({
	event,
	next,
	verbose,
}: {
	event: AgentEvent;
	next: AgentEvent | undefined;
	verbose: boolean;
}) {
	if (event.type === "tool_use") {
		const matchingResult =
			next && next.type === "tool_result" ? next : undefined;
		return (
			<li className="text-sm text-slate-700">
				<div className="flex items-start gap-2">
					<ChevronRight
						className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"
						aria-hidden="true"
					/>
					<span className="flex-1">
						{prettyToolUse(event.name, event.input)}
					</span>
					{matchingResult &&
						(matchingResult.ok ? (
							<CheckCircle2
								className="w-4 h-4 text-green-500 shrink-0"
								aria-hidden="true"
							/>
						) : (
							<XCircle
								className="w-4 h-4 text-red-500 shrink-0"
								aria-hidden="true"
							/>
						))}
				</div>
				{verbose && (
					<details className="mt-1 ml-6 text-xs text-slate-500">
						<summary className="cursor-pointer">raw</summary>
						<pre className="mt-1 p-2 bg-slate-50 rounded overflow-auto">
							{JSON.stringify(event, null, 2)}
						</pre>
					</details>
				)}
			</li>
		);
	}
	if (event.type === "tool_result") {
		if (!verbose) return null; // shown next to the tool_use already
		return (
			<li className="ml-6">
				<details className="text-xs text-slate-500">
					<summary className="cursor-pointer">tool_result</summary>
					<pre className="mt-1 p-2 bg-slate-50 rounded overflow-auto">
						{event.preview ?? "(no preview)"}
					</pre>
				</details>
			</li>
		);
	}
	if (event.type === "text") {
		const trimmed = trimToTwoSentences(event.text);
		if (!trimmed) return null;
		return (
			<li className="text-sm italic text-slate-500 pl-6">
				{trimmed}
				{verbose && (
					<details className="text-xs text-slate-400 mt-1">
						<summary className="cursor-pointer">full</summary>
						<pre className="mt-1 p-2 bg-slate-50 rounded overflow-auto whitespace-pre-wrap">
							{event.text}
						</pre>
					</details>
				)}
			</li>
		);
	}
	if (event.type === "preview-ready") {
		return (
			<li className="text-sm text-slate-700 pl-6 inline-flex items-center gap-1.5">
				🖼 Preview updated
			</li>
		);
	}
	if (event.type === "done") {
		return (
			<li className="text-sm font-medium text-green-700 pl-6 inline-flex items-center gap-1.5">
				<Sparkles className="w-4 h-4" aria-hidden="true" />
				Done
			</li>
		);
	}
	if (event.type === "error") {
		return (
			<li className="text-sm font-medium text-red-700 pl-6 inline-flex items-center gap-1.5">
				<XCircle className="w-4 h-4" aria-hidden="true" />
				{event.message}
			</li>
		);
	}
	return null;
}

function prettyToolUse(name: string, input: unknown): string {
	if (name === "WebSearch") {
		const q = (input as { query?: string } | undefined)?.query;
		return q ? `🔍 Searching: ${q}` : "🔍 Web search";
	}
	if (name === "mcp__lmg-filler__validate_data") return "🧪 Validating payload";
	if (name === "mcp__lmg-filler__render_pdf") return "📄 Rendering PDF";
	if (name === "mcp__lmg-template-builder__write_template_file") {
		const file = (input as { file?: string } | undefined)?.file;
		return file ? `📝 Writing ${file}` : "📝 Writing template file";
	}
	if (name === "mcp__lmg-template-builder__read_template_file") {
		const file = (input as { file?: string } | undefined)?.file;
		return file ? `📖 Reading ${file}` : "📖 Reading template file";
	}
	if (name === "mcp__lmg-template-builder__render_preview") {
		return "🖼 Rendering preview";
	}
	return `🔧 ${name}`;
}

function trimToTwoSentences(text: string): string {
	const trimmed = text.trim();
	if (!trimmed) return "";
	const matches = trimmed.match(/[^.!?]+[.!?]+/g);
	if (!matches || matches.length === 0) {
		return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
	}
	return matches.slice(0, 2).join(" ").trim();
}
