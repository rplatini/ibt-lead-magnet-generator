import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { api, streamEvents } from "../api";
import ProgressPanel from "../components/ProgressPanel";
import SlotForm from "../components/SlotForm";
import type { AgentEvent } from "../types";

export default function Generator() {
	const { id } = useParams();
	const templateId = id ?? "";
	const [searchParams] = useSearchParams();
	const { state } = useLocation();
	const backTo = state?.fromRunId ? `/history/${state.fromRunId}` : "/";
	const backLabel = state?.fromRunId ? "Report" : "Templates";
	const prefill = searchParams.get("prefill");

	const { data: template, isLoading } = useQuery({
		queryKey: ["template", templateId],
		queryFn: () => api.getTemplate(templateId),
		enabled: Boolean(templateId),
	});

	const initialInput = useMemo<Record<string, unknown>>(() => {
		if (!prefill) return {};
		try {
			return JSON.parse(atob(prefill)) as Record<string, unknown>;
		} catch {
			return {};
		}
	}, [prefill]);

	const isRerun = prefill !== null;

	const [input, setInput] = useState<Record<string, unknown>>(initialInput);
	useEffect(() => {
		setInput(initialInput);
	}, [initialInput]);

	const [feedback, setFeedback] = useState("");
	const [runId, setRunId] = useState<string | null>(null);
	const [events, setEvents] = useState<AgentEvent[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [doneAt, setDoneAt] = useState<number | null>(null);
	const startedAtRef = useRef<number | null>(null);
	const closeRef = useRef<(() => void) | null>(null);
	const [verbose, setVerbose] = useState(false);

	const reset = useCallback(() => {
		closeRef.current?.();
		closeRef.current = null;
		setRunId(null);
		setEvents([]);
		setError(null);
		setSubmitting(false);
		setDoneAt(null);
		startedAtRef.current = null;
	}, []);

	const onGenerate = useCallback(async () => {
		setError(null);
		setEvents([]);
		setDoneAt(null);
		setSubmitting(true);
		startedAtRef.current = Date.now();
		try {
			const res = await api.startGeneration(templateId, input, feedback || undefined);
			setRunId(res.runId);
			closeRef.current?.();
			closeRef.current = streamEvents(
				`/api/generations/${res.runId}/stream`,
				(event) => {
					setEvents((prev) => [...prev, event]);
					if (event.type === "done") {
						setDoneAt(Date.now());
						setSubmitting(false);
					}
					if (event.type === "error") {
						setError(event.message);
						setSubmitting(false);
					}
				},
				() => {
					setSubmitting(false);
				},
			);
		} catch (e) {
			setError((e as Error).message);
			setSubmitting(false);
		}
	}, [templateId, input, feedback]);

	useEffect(() => {
		return () => {
			closeRef.current?.();
		};
	}, []);

	if (!templateId) {
		return (
			<div className="max-w-4xl mx-auto px-6 py-10 text-sm text-slate-500">
				Missing template id.
			</div>
		);
	}

	const durationMs =
		doneAt && startedAtRef.current ? doneAt - startedAtRef.current : undefined;

	return (
		<div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
			<div>
				<Link
					to={backTo}
					className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-3"
				>
					<ArrowLeft className="w-3 h-3" aria-hidden="true" />
					{backLabel}
				</Link>
				<h1 className="text-2xl font-semibold tracking-tight">
					Generate from {template?.name ?? templateId}
				</h1>
			</div>

			{isLoading && (
				<div className="text-sm text-slate-500">Loading template…</div>
			)}

			{template && template.slotSchema && (
				<div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
					<SlotForm
						schema={template.slotSchema}
						value={input}
						onChange={setInput}
						onSubmit={onGenerate}
						submitting={submitting}
						readonly={isRerun}
					/>
					{isRerun && (
						<div className="space-y-2 border-t border-slate-100 pt-5">
							<div>
								<label
									htmlFor="feedback"
									className="block text-sm font-medium text-slate-700"
								>
									Feedback &amp; improvements
								</label>
								<p className="text-xs text-slate-500 mt-0.5">
									Describe what you'd like to change in this report.
								</p>
							</div>
							<textarea
								id="feedback"
								value={feedback}
								onChange={(e) => setFeedback(e.target.value)}
								rows={4}
								placeholder="e.g. Make the tone more formal, focus more on ROI metrics, shorten the introduction…"
								className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
							<button
								type="button"
								onClick={onGenerate}
								disabled={submitting}
								className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
							>
								{submitting ? "Working…" : "Re-generate"}
							</button>
						</div>
					)}
				</div>
			)}

			{error && (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					{error}
				</div>
			)}

			{(submitting || events.length > 0) && (
				<ProgressPanel
					events={events}
					verbose={verbose}
					onToggleVerbose={() => setVerbose((v) => !v)}
					durationMs={durationMs}
				/>
			)}

			{doneAt && runId && (
				<div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
					<div className="flex items-center justify-between gap-2">
						<h3 className="text-sm font-semibold">Generated PDF</h3>
						<div className="flex items-center gap-2">
							<a
								href={`/api/generations/${runId}/pdf`}
								download={`${runId}.pdf`}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
							>
								<Download className="w-3.5 h-3.5" aria-hidden="true" />
								Download
							</a>
							<button
								type="button"
								onClick={reset}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100"
							>
								<RefreshCcw className="w-3.5 h-3.5" aria-hidden="true" />
								Generate another
							</button>
						</div>
					</div>
					<iframe
						title={`pdf-${runId}`}
						src={`/api/generations/${runId}/pdf`}
						className="w-full h-[800px] rounded-md border border-slate-200"
					/>
				</div>
			)}
		</div>
	);
}
