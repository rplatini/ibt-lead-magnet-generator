import { CheckCircle, Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import type { SummarizeResponse } from "../types";

interface Props {
	open: boolean;
	onClose: () => void;
	onNext: (data: { name: string; suggestions?: SummarizeResponse }) => void;
}

export default function CompanyStepDialog({ open, onClose, onNext }: Props) {
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [fetching, setFetching] = useState(false);
	const [suggestions, setSuggestions] = useState<SummarizeResponse | undefined>();
	const [fetchError, setFetchError] = useState<string | null>(null);

	if (!open) return null;

	const handleFetch = async () => {
		setFetching(true);
		setFetchError(null);
		setSuggestions(undefined);
		try {
			const result = await api.summarizeCompany(name.trim(), url.trim());
			setSuggestions(result);
		} catch (e) {
			setFetchError((e as Error).message);
		} finally {
			setFetching(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-20 bg-slate-900/40 flex items-center justify-center p-4"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200">
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
					<h2 className="text-base font-semibold">New template</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
					>
						<X className="w-4 h-4" aria-hidden="true" />
					</button>
				</div>

				<div className="px-5 py-4 space-y-4">
					<div>
						<label
							htmlFor="cs-name"
							className="block text-sm font-medium text-slate-700"
						>
							Company name
						</label>
						<input
							id="cs-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Acme Inc."
							className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
						/>
					</div>

					<div>
						<label
							htmlFor="cs-url"
							className="block text-sm font-medium text-slate-700"
						>
							Company URL
							<span className="ml-1 text-xs font-normal text-slate-400">
								(optional)
							</span>
						</label>
						<div className="mt-1 flex gap-2">
							<input
								id="cs-url"
								type="url"
								value={url}
								onChange={(e) => {
									setUrl(e.target.value);
									setSuggestions(undefined);
									setFetchError(null);
								}}
								placeholder="https://acme.com"
								className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
							<button
								type="button"
								onClick={() => void handleFetch()}
								disabled={!url.trim() || !name.trim() || fetching}
								className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 shrink-0"
							>
								{fetching ? (
									<Loader2 className="w-3.5 h-3.5 animate-spin" />
								) : suggestions ? (
									<CheckCircle className="w-3.5 h-3.5 text-green-500" />
								) : (
									<Sparkles className="w-3.5 h-3.5" />
								)}
								{fetching ? "Fetching…" : suggestions ? "Done" : "Fetch & summarize"}
							</button>
						</div>

						{fetchError && (
							<p className="mt-1.5 text-xs text-red-500">
								{fetchError} — you can still continue without AI suggestions.
							</p>
						)}

						{suggestions && !fetchError && (
							<p className="mt-1.5 text-xs text-green-600">
								AI suggestions ready. Click Next to review them.
							</p>
						)}
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-3 py-2 rounded-md border border-slate-200 text-slate-700 text-sm hover:bg-slate-100"
						>
							Cancel
						</button>
						<button
							type="button"
							disabled={!name.trim()}
							onClick={() => onNext({ name: name.trim(), suggestions })}
							className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
						>
							Next →
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
