import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, streamEvents } from "../api";
import ChatStream, {
	type TimelineItem,
	timelineFromEvents,
} from "../components/ChatStream";
import NewTemplateDialog from "../components/NewTemplateDialog";
import PdfViewer from "../components/PdfViewer";
import type { AgentEvent } from "../types";

export default function TemplateBuilder() {
	const { id } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const isNew = !id;

	const [templateId, setTemplateId] = useState<string | null>(id ?? null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [events, setEvents] = useState<AgentEvent[]>([]);
	const [previewKey, setPreviewKey] = useState<number>(0);
	const [hasPreview, setHasPreview] = useState<boolean>(false);
	const [pendingUserText, setPendingUserText] = useState<string | null>(null);
	const [composer, setComposer] = useState("");
	const [awaiting, setAwaiting] = useState(true);
	const [creatingTemplate, setCreatingTemplate] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(isNew);
	const [error, setError] = useState<string | null>(null);
	const closeRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		if (!isNew && id) {
			void (async () => {
				try {
					const res = await api.resumeTemplateSession(id);
					setTemplateId(id);
					setSessionId(res.sessionId);
				} catch (e) {
					setError((e as Error).message);
				}
			})();
		}
	}, [isNew, id]);

	useEffect(() => {
		if (!templateId) return;
		void (async () => {
			try {
				const detail = await api.getTemplate(templateId);
				setHasPreview(Boolean(detail.hasPreview));
			} catch {
				// new templates won't have a detail yet, that's fine
			}
		})();
	}, [templateId]);

	useEffect(() => {
		if (!templateId || !sessionId) return;
		closeRef.current?.();
		setAwaiting(true);
		closeRef.current = streamEvents(
			`/api/templates/${encodeURIComponent(templateId)}/stream?sessionId=${encodeURIComponent(sessionId)}`,
			(event) => {
				setEvents((prev) => [...prev, event]);
				if (event.type === "preview-ready") {
					setHasPreview(true);
					setPreviewKey((k) => k + 1);
				}
				if (event.type === "user_text") {
					setPendingUserText(null);
				}
				if (
					event.type === "text" ||
					event.type === "tool_use" ||
					event.type === "preview-ready" ||
					event.type === "error"
				) {
					setAwaiting(false);
				}
			},
			() => {
				setAwaiting(false);
			},
		);
		return () => {
			closeRef.current?.();
			closeRef.current = null;
		};
	}, [templateId, sessionId]);

	const onCreateTemplate = useCallback(
		async (args: {
			name: string;
			files: File[];
			companyOffering: string;
			leadMagnetPurpose: string;
			writingRules: string;
		}) => {
			setCreatingTemplate(true);
			setError(null);
			try {
				const res = await api.createTemplate(args);
				setTemplateId(res.templateId);
				setSessionId(res.sessionId);
				setDialogOpen(false);
				queryClient.invalidateQueries({ queryKey: ["templates"] });
				navigate(`/templates/${res.templateId}/edit`, { replace: true });
			} catch (e) {
				setError((e as Error).message);
			} finally {
				setCreatingTemplate(false);
			}
		},
		[navigate, queryClient],
	);

	const onSend = useCallback(async () => {
		const message = composer.trim();
		if (!message || !templateId || !sessionId || pendingUserText) return;
		setComposer("");
		setPendingUserText(message);
		setAwaiting(true);
		try {
			await api.chat(templateId, sessionId, message);
		} catch (e) {
			setError((e as Error).message);
			setPendingUserText(null);
			setAwaiting(false);
		}
	}, [composer, templateId, sessionId, pendingUserText]);

	const items = useMemo<TimelineItem[]>(
		() => timelineFromEvents(events),
		[events],
	);

	const previewUrl = templateId
		? `/api/templates/${encodeURIComponent(templateId)}/preview.pdf`
		: null;

	return (
		<div className="h-[calc(100vh-3.5rem)] flex flex-col">
			<div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Link
						to="/"
						className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
					>
						<ArrowLeft className="w-3 h-3" aria-hidden="true" />
						Templates
					</Link>
					<span className="text-slate-200">/</span>
					<h1 className="text-sm font-semibold">
						{templateId ?? "New template"}
					</h1>
				</div>
			</div>

			{error && (
				<div className="px-6 py-2 border-b border-red-200 bg-red-50 text-sm text-red-700">
					{error}
				</div>
			)}

			<div className="flex-1 flex overflow-hidden">
				<div className="w-2/5 flex flex-col border-r border-slate-200 bg-white">
					<ChatStream
						items={items}
						pendingUserText={pendingUserText}
						awaiting={awaiting}
					/>
					<div className="border-t border-slate-200 px-3 py-3 bg-slate-50">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								void onSend();
							}}
							className="flex items-end gap-2"
						>
							<textarea
								value={composer}
								onChange={(e) => setComposer(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										void onSend();
									}
								}}
								disabled={!templateId || !sessionId || !!pendingUserText}
								placeholder={
									!templateId
										? "Create a template first"
										: pendingUserText
											? "Waiting for the agent…"
											: "Message the builder"
								}
								rows={2}
								className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
							<button
								type="submit"
								disabled={
									!templateId ||
									!sessionId ||
									!!pendingUserText ||
									!composer.trim()
								}
								className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
								aria-label="Send message"
							>
								<Send className="w-4 h-4" aria-hidden="true" />
							</button>
						</form>
					</div>
				</div>
				<div className="flex-1">
					<PdfViewer
						src={previewUrl}
						refreshKey={previewKey}
						hasPreview={hasPreview}
						onRefresh={() => setPreviewKey((k) => k + 1)}
					/>
				</div>
			</div>

			<NewTemplateDialog
				open={dialogOpen}
				submitting={creatingTemplate}
				onClose={() => {
					if (!templateId) navigate("/", { replace: true });
					else setDialogOpen(false);
				}}
				onSubmit={onCreateTemplate}
			/>
		</div>
	);
}
