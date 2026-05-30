import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { GenerationListItem } from "../types";

export default function TemplateReports() {
	const { id = "" } = useParams<{ id: string }>();
	const queryClient = useQueryClient();

	const { data: template } = useQuery({
		queryKey: ["templates", id],
		queryFn: () => api.getTemplate(id),
		enabled: !!id,
	});

	const { data, isLoading, error } = useQuery({
		queryKey: ["generations", id],
		queryFn: () => api.listGenerations(id),
		enabled: !!id,
	});

	const deleteMutation = useMutation({
		mutationFn: (runId: string) => api.deleteGeneration(runId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["generations", id] });
		},
	});

	const heading = template?.name ?? id;

	return (
		<div className="max-w-6xl mx-auto px-6 py-10">
			<div className="flex items-center justify-between gap-3 mb-1">
				<div className="flex items-center gap-3">
					<Link
						to="/"
						className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
						aria-label="Back to templates"
					>
						<ArrowLeft className="w-4 h-4" />
					</Link>
					<h1 className="text-2xl font-semibold tracking-tight">
						Reports · {heading}
					</h1>
				</div>
				{template?.status === "complete" ? (
					<Link
						to={`/templates/${id}/generate`}
						state={{ fromTemplateId: id }}
						className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
					>
						<Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
						Generate report
					</Link>
				) : (
					<span className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed">
						<Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
						Generate report
					</span>
				)}
			</div>
			{template?.description && (
				<p className="text-sm text-slate-500 mb-6 ml-8">
					{template.description}
				</p>
			)}

			{isLoading && <div className="text-sm text-slate-500">Loading runs…</div>}
			{error && (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					Failed to load runs: {(error as Error).message}
				</div>
			)}
			{data && data.length === 0 && (
				<div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
					No generations for this template yet.
				</div>
			)}

			{data && data.length > 0 && (
				<div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
							<tr>
								<Th>Run</Th>
								<Th>Target</Th>
								<Th>Created</Th>
								<Th>Duration</Th>
								<Th>Status</Th>
								<th className="px-4 py-2" />
							</tr>
						</thead>
						<tbody className="[&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-gray-100">
							{data.map((row) => (
								<ReportRow
									key={row.runId}
									row={row}
									templateId={id}
									onDelete={(runId) => deleteMutation.mutate(runId)}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function Th({ children }: { children: React.ReactNode }) {
	return (
		<th className="px-4 py-2 text-left font-medium text-[11px]">{children}</th>
	);
}

function ReportRow({
	row,
	templateId,
	onDelete,
}: {
	row: GenerationListItem;
	templateId: string;
	onDelete: (runId: string) => void;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const target = pickTarget(row.input);

	useEffect(() => {
		if (!menuOpen) return;
		menuRef.current?.querySelector("button")?.focus();
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setMenuOpen(false);
				triggerRef.current?.focus();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [menuOpen]);

	return (
		<tr className="hover:bg-slate-50">
			<td className="px-4 py-2.5">
				<Link
					to={`/history/${row.runId}`}
					state={{ fromTemplateId: templateId }}
					className="font-medium text-slate-900 hover:underline"
				>
					{row.runId}
				</Link>
			</td>
			<td className="px-4 py-2.5 text-slate-600">{target ?? "—"}</td>
			<td className="px-4 py-2.5 text-slate-500 tabular-nums text-xs">
				{relative(row.createdAt)}
			</td>
			<td className="px-4 py-2.5 text-slate-500 tabular-nums text-xs">
				{row.durationMs != null ? `${(row.durationMs / 1000).toFixed(1)}s` : "—"}
			</td>
			<td className="px-4 py-2.5">
				<StatusBadge status={row.status} />
			</td>
			<td className="px-4 py-2.5">
				<div className="relative flex justify-end">
					<button
						ref={triggerRef}
						type="button"
						onClick={() => setMenuOpen((v) => !v)}
						aria-label="Run actions"
						aria-expanded={menuOpen}
						aria-haspopup="menu"
						className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
					>
						<MoreVertical className="w-4 h-4" aria-hidden="true" />
					</button>
					{menuOpen && (
						<div
							ref={menuRef}
							role="menu"
							className="absolute right-0 bottom-full mb-1 w-32 rounded-md border border-slate-200 bg-white shadow-lg z-10"
							onMouseLeave={() => setMenuOpen(false)}
						>
							<button
								role="menuitem"
								type="button"
								onClick={() => {
									setMenuOpen(false);
									triggerRef.current?.focus();
									if (window.confirm(`Delete run "${row.runId}"? This cannot be undone.`)) {
										onDelete(row.runId);
									}
								}}
								className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
							>
								<Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
								Delete
							</button>
						</div>
					)}
				</div>
			</td>
		</tr>
	);
}

function StatusBadge({ status }: { status: "ok" | "error" }) {
	return (
		<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-gray-50 text-gray-700 border border-gray-200 font-normal">
			<span
				aria-hidden="true"
				className={`inline-block w-1.5 h-1.5 rounded-full ${
					status === "ok" ? "bg-green-500" : "bg-red-500"
				}`}
			/>
			{status}
		</span>
	);
}

function pickTarget(input: Record<string, unknown>): string | null {
	if (typeof input.targetCompany === "string") return input.targetCompany;
	for (const v of Object.values(input)) {
		if (typeof v === "string" && v.length > 0) return v;
	}
	return null;
}

function relative(iso: string): string {
	const ts = new Date(iso).getTime();
	if (!Number.isFinite(ts)) return "—";
	const diff = Date.now() - ts;
	const minute = 60_000;
	const hour = 60 * minute;
	const day = 24 * hour;
	if (diff < minute) return "just now";
	if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
	if (diff < day) return `${Math.floor(diff / hour)}h ago`;
	if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
	return new Date(iso).toLocaleDateString();
}
