import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import ProgressPanel from "../components/ProgressPanel";

export default function HistoryDetail() {
	const { runId } = useParams();
	const { data, isLoading, error } = useQuery({
		queryKey: ["generation", runId],
		queryFn: () => api.getGeneration(runId ?? ""),
		enabled: Boolean(runId),
	});

	if (!runId) {
		return (
			<div className="max-w-4xl mx-auto px-6 py-10 text-sm text-slate-500">
				Missing run id.
			</div>
		);
	}

	const prefill = data ? btoa(JSON.stringify(data.input)) : undefined;

	return (
		<div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
			<Link
				to="/history"
				className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
			>
				<ArrowLeft className="w-3 h-3" aria-hidden="true" />
				History
			</Link>

			{isLoading && <div className="text-sm text-slate-500">Loading run…</div>}
			{error && (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					Failed to load run: {(error as Error).message}
				</div>
			)}

			{data && (
				<>
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<h1 className="text-2xl font-semibold tracking-tight truncate">
								{runId}
							</h1>
							<p className="text-sm text-slate-500 mt-1">
								Template <span className="font-medium">{data.templateId}</span>{" "}
								· {(data.durationMs / 1000).toFixed(1)}s · {data.status}
							</p>
						</div>
						{prefill && (
							<Link
								to={`/templates/${data.templateId}/generate?prefill=${encodeURIComponent(prefill)}`}
								className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100"
							>
								<RefreshCcw className="w-3.5 h-3.5" aria-hidden="true" />
								Re-run
							</Link>
						)}
					</div>

					{data.status === "ok" && data.pdfPath && (
						<div className="rounded-xl border border-slate-200 bg-white p-5">
							<iframe
								title={`pdf-${runId}`}
								src={`/api/generations/${runId}/pdf`}
								className="w-full h-[800px] rounded-md border border-slate-200"
							/>
						</div>
					)}

					<div className="rounded-xl border border-slate-200 bg-white p-5">
						<h3 className="text-sm font-semibold mb-2">Input</h3>
						<pre className="bg-slate-50 rounded p-3 text-xs overflow-auto">
							{JSON.stringify(data.input, null, 2)}
						</pre>
					</div>

					<ProgressPanel
						events={data.events}
						verbose={true}
						onToggleVerbose={() => {}}
					/>
				</>
			)}
		</div>
	);
}
