import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import TemplateCard from "../components/TemplateCard";

export default function TemplatesList() {
	const queryClient = useQueryClient();
	const { data, isLoading, error } = useQuery({
		queryKey: ["templates"],
		queryFn: api.listTemplates,
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => api.deleteTemplate(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["templates"] });
		},
	});

	return (
		<div className="max-w-6xl mx-auto px-6 py-10">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
					<p className="text-sm text-slate-500 mt-1">
						Chat with the builder agent to design a lead-magnet template, then
						generate personalized PDFs from it.
					</p>
				</div>
				<Link
					to="/templates/new"
					className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
				>
					<Plus className="w-4 h-4" aria-hidden="true" />
					New template
				</Link>
			</div>

			{isLoading && (
				<div className="text-sm text-slate-500">Loading templates…</div>
			)}

			{error && (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					Failed to load templates: {(error as Error).message}
				</div>
			)}

			{!isLoading && data && data.length === 0 && (
				<div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center flex flex-col items-center gap-3">
					<FilePlus className="w-10 h-10 text-slate-300" aria-hidden="true" />
					<div>
						<p className="text-sm font-medium text-slate-700">
							No templates yet
						</p>
						<p className="text-xs text-slate-500 mt-1">
							Create one to get started.
						</p>
					</div>
					<Link
						to="/templates/new"
						className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
					>
						<Plus className="w-4 h-4" aria-hidden="true" />
						New template
					</Link>
				</div>
			)}

			{data && data.length > 0 && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{data.map((tpl) => (
						<TemplateCard
							key={tpl.id}
							template={tpl}
							onDelete={(id) => deleteMutation.mutate(id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
