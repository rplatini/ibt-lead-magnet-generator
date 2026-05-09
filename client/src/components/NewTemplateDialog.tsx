import { Upload, X } from "lucide-react";
import { useState } from "react";

interface Props {
	open: boolean;
	submitting: boolean;
	onClose: () => void;
	onSubmit: (args: {
		name: string;
		files: File[];
		companyOffering: string;
		leadMagnetPurpose: string;
		writingRules: string;
	}) => void;
}

export default function NewTemplateDialog({
	open,
	submitting,
	onClose,
	onSubmit,
}: Props) {
	const [name, setName] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const [companyOffering, setCompanyOffering] = useState("");
	const [leadMagnetPurpose, setLeadMagnetPurpose] = useState("");
	const [writingRules, setWritingRules] = useState("");

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-20 bg-slate-900/40 flex items-center justify-center p-4"
			onClick={(e) => {
				if (e.target === e.currentTarget && !submitting) onClose();
			}}
		>
			<div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 max-h-[90vh] overflow-auto">
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
					<h2 className="text-base font-semibold">New template</h2>
					<button
						type="button"
						onClick={() => {
							if (!submitting) onClose();
						}}
						aria-label="Close"
						className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
					>
						<X className="w-4 h-4" aria-hidden="true" />
					</button>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (!name.trim() || files.length === 0) return;
						onSubmit({
							name: name.trim(),
							files,
							companyOffering: companyOffering.trim(),
							leadMagnetPurpose: leadMagnetPurpose.trim(),
							writingRules: writingRules.trim(),
						});
					}}
					className="px-5 py-4 space-y-4"
				>
					<div>
						<label
							htmlFor="tpl-name"
							className="block text-sm font-medium text-slate-700"
						>
							Name
						</label>
						<input
							id="tpl-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Acme web brief"
							className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
							required
						/>
					</div>
					<div>
						<label
							htmlFor="tpl-files"
							className="block text-sm font-medium text-slate-700"
						>
							Brand guidelines (PDF or TXT)
						</label>
						<label
							htmlFor="tpl-files"
							className="mt-1 flex flex-col items-center gap-2 px-3 py-6 rounded-md border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100"
						>
							<Upload className="w-5 h-5 text-slate-400" aria-hidden="true" />
							<span className="text-xs text-slate-600">
								{files.length === 0
									? "Click to upload one or more files"
									: `${files.length} file${files.length === 1 ? "" : "s"} selected`}
							</span>
							<input
								id="tpl-files"
								type="file"
								accept=".pdf,.txt"
								multiple
								className="hidden"
								onChange={(e) => {
									const list = e.target.files;
									setFiles(list ? Array.from(list) : []);
								}}
							/>
						</label>
						{files.length > 0 && (
							<ul className="mt-2 text-xs text-slate-500 space-y-0.5">
								{files.map((f) => (
									<li key={f.name}>· {f.name}</li>
								))}
							</ul>
						)}
					</div>
					<div className="space-y-3 pt-2 border-t border-slate-100">
						<p className="text-xs font-medium uppercase tracking-wider text-slate-500 pt-3">
							Lead magnet context (optional)
						</p>
						<div>
							<label
								htmlFor="tpl-offering"
								className="block text-sm font-medium text-slate-700"
							>
								What does this company sell?
							</label>
							<textarea
								id="tpl-offering"
								value={companyOffering}
								onChange={(e) => setCompanyOffering(e.target.value)}
								placeholder="e.g. We sell staff-augmentation engineering teams to mid-market SaaS. Target buyer: VP Eng / CTO."
								rows={2}
								className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
						</div>
						<div>
							<label
								htmlFor="tpl-purpose"
								className="block text-sm font-medium text-slate-700"
							>
								What should this lead magnet accomplish?
							</label>
							<textarea
								id="tpl-purpose"
								value={leadMagnetPurpose}
								onChange={(e) => setLeadMagnetPurpose(e.target.value)}
								placeholder="e.g. Educate the prospect on how engineering capacity solves their roadmap bottleneck. Soft CTA to a 30-min scoping call."
								rows={2}
								className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
						</div>
						<div>
							<label
								htmlFor="tpl-rules"
								className="block text-sm font-medium text-slate-700"
							>
								Writing rules
								<span className="ml-1 text-xs font-normal text-slate-400">
									(optional)
								</span>
							</label>
							<textarea
								id="tpl-rules"
								value={writingRules}
								onChange={(e) => setWritingRules(e.target.value)}
								placeholder="e.g. Never pitch the prospect's product. Cite stats. Avoid 'cutting-edge', 'revolutionize', 'transform'."
								rows={2}
								className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={onClose}
							disabled={submitting}
							className="px-3 py-2 rounded-md border border-slate-200 text-slate-700 text-sm hover:bg-slate-100"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting || !name.trim() || files.length === 0}
							className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
						>
							{submitting ? "Creating…" : "Start chat"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
