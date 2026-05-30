import { MoreVertical, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { TemplateListItem } from "../types";

interface Props {
	template: TemplateListItem;
	onDelete: (id: string) => void;
}

export default function TemplateCard({ template, onDelete }: Props) {
	const [menuOpen, setMenuOpen] = useState(false);
	const navigate = useNavigate();

	return (
		<div
			className={`rounded-xl border border-slate-200 bg-white p-5 pb-6 min-h-[160px] shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 ${template.status === "complete" ? "cursor-pointer" : "cursor-default"}`}
			onClick={template.status === "complete" ? () => navigate(`/templates/${template.id}/reports`) : undefined}
			role={template.status === "complete" ? "link" : undefined}
			tabIndex={template.status === "complete" ? 0 : undefined}
			onKeyDown={template.status === "complete" ? (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					navigate(`/templates/${template.id}/reports`);
				}
			} : undefined}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<h3 className="text-base font-semibold text-slate-900 truncate hover:underline">
						{template.name}
					</h3>
					<p className="text-xs text-slate-500 mt-0.5">
						{relative(template.createdAt)}
					</p>
					{template.description && (
						<p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
							{template.description}
						</p>
					)}
				</div>
				<div className="relative flex items-center gap-1.5">
					<StatusBadge status={template.status} />
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setMenuOpen((v) => !v);
						}}
						aria-label="Template actions"
						className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
					>
						<MoreVertical className="w-4 h-4" aria-hidden="true" />
					</button>
					{menuOpen && (
						<div
							className="absolute right-0 top-full mt-1 w-32 rounded-md border border-slate-200 bg-white shadow-lg z-10"
							onMouseLeave={() => setMenuOpen(false)}
						>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setMenuOpen(false);
									if (
										window.confirm(
											`Delete template "${template.name}"? This cannot be undone.`,
										)
									) {
										onDelete(template.id);
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
			</div>

			<div className="flex gap-2 mt-auto pt-2">
				{template.status === "complete" ? (
					<Link
						to={`/templates/${template.id}/generate`}
						onClick={(e) => e.stopPropagation()}
						className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
					>
						<Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
						Generate report
					</Link>
				) : (
					<span className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed">
						<Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
						Generate report
					</span>
				)}
				<Link
					to={`/templates/${template.id}/edit`}
					onClick={(e) => e.stopPropagation()}
					className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100"
				>
					<Pencil className="w-3.5 h-3.5" aria-hidden="true" />
					Edit
				</Link>
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: "complete" | "draft" }) {
	const styles =
		status === "complete"
			? "bg-green-50 text-green-700 border-green-200"
			: "bg-amber-50 text-amber-700 border-amber-200";
	return (
		<span
			className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${styles}`}
		>
			{status}
		</span>
	);
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
