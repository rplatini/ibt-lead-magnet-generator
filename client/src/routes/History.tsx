import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { GenerationListItem } from "../types";

export default function History() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["generations"],
		queryFn: api.listGenerations,
	});

	return (
		<div className="max-w-6xl mx-auto px-6 py-10">
			<h1 className="text-2xl font-semibold tracking-tight mb-1">History</h1>
			<p className="text-sm text-slate-500 mb-6">
				Past generations. Each row links to the run detail with PDF and event
				log.
			</p>

			{isLoading && <div className="text-sm text-slate-500">Loading runs…</div>}
			{error && (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					Failed to load runs: {(error as Error).message}
				</div>
			)}
			{data && data.length === 0 && (
				<div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
					No generations yet.
				</div>
			)}

			{data && data.length > 0 && (
				<div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
							<tr>
								<Th>Run</Th>
								<Th>Template</Th>
								<Th>Target</Th>
								<Th>Created</Th>
								<Th>Duration</Th>
								<Th>Status</Th>
							</tr>
						</thead>
						<tbody className="[&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-gray-100">
							{data.map((row) => (
								<HistoryRow key={row.runId} row={row} />
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

function HistoryRow({ row }: { row: GenerationListItem }) {
	const target = pickTarget(row.input);
	return (
		<tr className="hover:bg-slate-50">
			<td className="px-4 py-2.5">
				<Link
					to={`/history/${row.runId}`}
					className="font-medium text-slate-900 hover:underline"
				>
					{row.runId}
				</Link>
			</td>
			<td className="px-4 py-2.5 text-slate-600">{row.templateId}</td>
			<td className="px-4 py-2.5 text-slate-600">{target ?? "—"}</td>
			<td className="px-4 py-2.5 text-slate-500 tabular-nums text-xs">
				{relative(row.createdAt)}
			</td>
			<td className="px-4 py-2.5 text-slate-500 tabular-nums text-xs">
				{(row.durationMs / 1000).toFixed(1)}s
			</td>
			<td className="px-4 py-2.5">
				<StatusBadge status={row.status} />
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
