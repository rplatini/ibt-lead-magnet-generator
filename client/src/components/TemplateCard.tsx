import { MoreVertical, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { TemplateListItem } from "../types";

interface Props {
	template: TemplateListItem;
	onDelete: (id: string) => void;
}

export default function TemplateCard({ template, onDelete }: Props) {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<h3 className="text-base font-semibold text-slate-900 truncate">
						{template.name}
					</h3>
					<p className="text-xs text-slate-500 mt-0.5">
						{template.slotKeys.length} slot
						{template.slotKeys.length === 1 ? "" : "s"} ·{" "}
						{relative(template.createdAt)}
					</p>
				</div>
				<div className="relative">
					<button
						type="button"
						onClick={() => setMenuOpen((v) => !v)}
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
								onClick={() => {
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

			<div className="flex flex-wrap gap-1">
				{template.slotKeys.slice(0, 6).map((k) => (
					<span
						key={k}
						className="text-[10px] font-normal px-1.5 py-0.5 border border-slate-200 bg-slate-50 text-slate-600 rounded"
					>
						{k}
					</span>
				))}
				{template.slotKeys.length > 6 && (
					<span className="text-[10px] text-slate-400">
						+{template.slotKeys.length - 6}
					</span>
				)}
			</div>

			<div className="flex gap-2 mt-auto pt-2">
				<Link
					to={`/templates/${template.id}/generate`}
					className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
				>
					<Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
					Generate
				</Link>
				<Link
					to={`/templates/${template.id}/edit`}
					className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100"
				>
					<Pencil className="w-3.5 h-3.5" aria-hidden="true" />
					Edit
				</Link>
			</div>
		</div>
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
