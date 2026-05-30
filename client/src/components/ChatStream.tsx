import {
	CheckCircle2,
	Eye,
	FileText,
	ImageIcon,
	Loader2,
	Search,
	Wrench,
	XCircle,
} from "lucide-react";
import Markdown from "react-markdown";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { AgentEvent } from "../types";

export type TimelineItem =
	| { id: string; kind: "user"; text: string }
	| { id: string; kind: "agent"; text: string }
	| {
			id: string;
			kind: "tool";
			name: string;
			input: unknown;
			status: "running" | "ok" | "fail";
			preview?: string;
	  }
	| { id: string; kind: "preview" }
	| { id: string; kind: "error"; text: string };

interface Props {
	items: TimelineItem[];
	pendingUserText: string | null;
	awaiting: boolean;
}

export default function ChatStream({
	items,
	pendingUserText,
	awaiting,
}: Props) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const node = scrollRef.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	}, [items.length, pendingUserText, awaiting]);

	return (
		<div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 space-y-3">
			{items.length === 0 && !pendingUserText && !awaiting && (
				<div className="text-sm text-slate-500">
					Waiting for the agent to start…
				</div>
			)}
			{items.map((item) => (
				<TimelineRow key={item.id} item={item} />
			))}
			{pendingUserText && <UserBubble text={pendingUserText} />}
			{awaiting && <Thinking />}
		</div>
	);
}

function TimelineRow({ item }: { item: TimelineItem }) {
	if (item.kind === "user") return <UserBubble text={item.text} />;
	if (item.kind === "agent") return <AgentBubble text={item.text} />;
	if (item.kind === "tool") return <ToolChip item={item} />;
	if (item.kind === "preview") return <PreviewChip />;
	if (item.kind === "error")
		return (
			<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
				{item.text}
			</div>
		);
	return null;
}

function UserBubble({ text }: { text: string }) {
	return (
		<div className="flex justify-end">
			<div className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 text-white px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed">
				{text}
			</div>
		</div>
	);
}

function AgentBubble({ text }: { text: string }) {
	return (
		<div className="flex justify-start">
			<div className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 px-3.5 py-2 text-sm leading-relaxed prose prose-sm [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:my-1">
				<Markdown>{text}</Markdown>
			</div>
		</div>
	);
}

function Thinking() {
	return (
		<div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
			<Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
			Thinking…
		</div>
	);
}

function PreviewChip() {
	return (
		<ToolRow
			icon={<ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />}
			label="Preview updated"
			status="ok"
		/>
	);
}

function ToolChip({ item }: { item: Extract<TimelineItem, { kind: "tool" }> }) {
	const meta = describeTool(item.name, item.input);
	return (
		<ToolRow
			icon={meta.icon}
			label={meta.label}
			detail={meta.detail}
			status={item.status}
		/>
	);
}

function ToolRow({
	icon,
	label,
	detail,
	status,
}: {
	icon: ReactNode;
	label: string;
	detail?: string;
	status: "running" | "ok" | "fail";
}) {
	const statusIcon =
		status === "ok" ? (
			<CheckCircle2
				className="w-3.5 h-3.5 text-emerald-600"
				aria-hidden="true"
			/>
		) : status === "fail" ? (
			<XCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
		) : (
			<Loader2
				className="w-3.5 h-3.5 text-slate-400 animate-spin"
				aria-hidden="true"
			/>
		);
	return (
		<div className="flex items-start gap-2 text-xs text-slate-600 pl-1 leading-relaxed">
			<span className="mt-0.5 text-slate-400">{icon}</span>
			<span className="flex-1">
				<span className="font-medium text-slate-700">{label}</span>
				{detail && <span className="text-slate-500"> · {detail}</span>}
			</span>
			<span className="mt-0.5">{statusIcon}</span>
		</div>
	);
}

function describeTool(
	name: string,
	input: unknown,
): { icon: ReactNode; label: string; detail?: string } {
	if (name === "mcp__lmg-template-builder__write_template_file") {
		const file = (input as { file?: string } | undefined)?.file ?? "file";
		return {
			icon: <FileText className="w-3.5 h-3.5" aria-hidden="true" />,
			label: `Wrote ${file}`,
		};
	}
	if (name === "mcp__lmg-template-builder__read_template_file") {
		const file = (input as { file?: string } | undefined)?.file ?? "file";
		const tplId = (input as { templateId?: string } | undefined)?.templateId;
		return {
			icon: <Eye className="w-3.5 h-3.5" aria-hidden="true" />,
			label: `Read ${file}`,
			detail: tplId,
		};
	}
	if (name === "mcp__lmg-template-builder__render_preview") {
		return {
			icon: <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />,
			label: "Rendering preview",
		};
	}
	if (name === "WebSearch") {
		const query = (input as { query?: string } | undefined)?.query;
		return {
			icon: <Search className="w-3.5 h-3.5" aria-hidden="true" />,
			label: "Searching",
			detail: query,
		};
	}
	if (name === "mcp__lmg-filler__validate_data") {
		return {
			icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
			label: "Validating payload",
		};
	}
	if (name === "mcp__lmg-filler__render_pdf") {
		return {
			icon: <FileText className="w-3.5 h-3.5" aria-hidden="true" />,
			label: "Rendering PDF",
		};
	}
	return {
		icon: <Wrench className="w-3.5 h-3.5" aria-hidden="true" />,
		label: name,
	};
}

export function timelineFromEvents(events: AgentEvent[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	const toolIndexById = new Map<string, number>();
	let agentSeq = 0;
	let userSeq = 0;
	let previewSeq = 0;
	let errorSeq = 0;

	for (const event of events) {
		if (event.type === "user_text") {
			items.push({
				id: `user-${userSeq++}`,
				kind: "user",
				text: event.text,
			});
		} else if (event.type === "text") {
			items.push({
				id: `agent-${agentSeq++}`,
				kind: "agent",
				text: event.text,
			});
		} else if (event.type === "tool_use") {
			toolIndexById.set(event.id, items.length);
			items.push({
				id: `tool-${event.id}`,
				kind: "tool",
				name: event.name,
				input: event.input,
				status: "running",
			});
		} else if (event.type === "tool_result") {
			const idx = toolIndexById.get(event.toolUseId);
			if (idx !== undefined) {
				const existing = items[idx];
				if (existing.kind === "tool") {
					items[idx] = {
						...existing,
						status: event.ok ? "ok" : "fail",
						preview: event.preview,
					};
				}
			}
		} else if (event.type === "preview-ready") {
			items.push({
				id: `preview-${previewSeq++}`,
				kind: "preview",
			});
		} else if (event.type === "error") {
			items.push({
				id: `error-${errorSeq++}`,
				kind: "error",
				text: event.message,
			});
		}
	}
	return items;
}
