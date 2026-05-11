import { Check, List, PenLine, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SummarizeResponse } from "../types";

const WRITING_RULE_PRESETS = [
	{
		label: "Data-driven",
		value:
			"Cite statistics and specific data points. Use concrete numbers. Avoid buzzwords ('cutting-edge', 'revolutionary', 'transform'). Keep paragraphs to 3 sentences max.",
	},
	{
		label: "Prospect-first",
		value:
			"Lead with the prospect's pain points. Use 'you' language. Never pitch the prospect's own products. End each section with an actionable insight.",
	},
	{
		label: "Conversational authority",
		value:
			"Conversational but authoritative. Active voice only. Bullet complex ideas. Avoid filler phrases. One key takeaway per section.",
	},
];

interface Props {
	open: boolean;
	submitting: boolean;
	companyName: string;
	suggestions?: SummarizeResponse;
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
	companyName,
	suggestions,
	onClose,
	onSubmit,
}: Props) {
	const [files, setFiles] = useState<File[]>([]);

	const aiOffering = suggestions?.companyOffering?.[0]?.value ?? "";
	const [offeringValue, setOfferingValue] = useState(aiOffering);

	const [purposeMode, setPurposeMode] = useState<"preset" | "custom">(
		suggestions?.leadMagnetPurpose?.length ? "preset" : "custom",
	);
	const [selectedPurpose, setSelectedPurpose] = useState(
		suggestions?.leadMagnetPurpose?.[0]?.value ?? "",
	);
	const [customPurpose, setCustomPurpose] = useState("");

	const [writingRulesMode, setWritingRulesMode] = useState<"preset" | "custom">("preset");
	const [selectedPreset, setSelectedPreset] = useState(WRITING_RULE_PRESETS[0].value);
	const [customRules, setCustomRules] = useState("");

	useEffect(() => {
		if (!open) return;
		if (aiOffering) setOfferingValue(aiOffering);
		if (suggestions?.leadMagnetPurpose?.length) {
			setPurposeMode("preset");
			setSelectedPurpose(suggestions.leadMagnetPurpose[0].value);
		}
	}, [open, aiOffering, suggestions?.leadMagnetPurpose]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-20 bg-slate-900/40 flex items-center justify-center p-4"
			onClick={(e) => {
				if (e.target === e.currentTarget && !submitting) onClose();
			}}
		>
			<div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border border-slate-200 max-h-[90vh] overflow-auto">
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
						if (files.length === 0) return;
						onSubmit({
							name: companyName,
							files,
							companyOffering: offeringValue.trim(),
							leadMagnetPurpose:
								purposeMode === "preset" ? selectedPurpose : customPurpose.trim(),
							writingRules:
								writingRulesMode === "preset" ? selectedPreset : customRules.trim(),
						});
					}}
					className="px-5 py-4 space-y-4"
				>
					<div>
						<p className="block text-sm font-medium text-slate-700">Company name</p>
						<p className="mt-1 px-3 py-2 text-sm text-slate-900">{companyName}</p>
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

						{/* companyOffering */}
						<div>
							<div className="flex items-center justify-between">
								<label
									htmlFor="tpl-offering"
									className="block text-sm font-medium text-slate-700"
								>
									What does this company sell?
								</label>
								{aiOffering && (
									<button
										type="button"
										onClick={() =>
											setOfferingValue(
												offeringValue === aiOffering ? "" : aiOffering,
											)
										}
										className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
									>
										{offeringValue === aiOffering ? (
											<><PenLine className="w-3 h-3" /> Write my own</>
										) : (
											<><List className="w-3 h-3" /> Restore AI suggestion</>
										)}
									</button>
								)}
							</div>
							<textarea
								id="tpl-offering"
								value={offeringValue}
								onChange={(e) => setOfferingValue(e.target.value)}
								placeholder="e.g. We sell staff-augmentation engineering teams to mid-market SaaS. Target buyer: VP Eng / CTO."
								rows={2}
								className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
							/>
						</div>

						{/* leadMagnetPurpose */}
						<div>
							<div className="flex items-center justify-between">
								<label
									htmlFor="tpl-purpose"
									className="block text-sm font-medium text-slate-700"
								>
									What should this lead magnet accomplish?
								</label>
								{suggestions?.leadMagnetPurpose?.length && (
									<button
										type="button"
										onClick={() =>
											setPurposeMode((m) => (m === "preset" ? "custom" : "preset"))
										}
										className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
									>
										{purposeMode === "preset" ? (
											<><PenLine className="w-3 h-3" /> Write my own</>
										) : (
											<><List className="w-3 h-3" /> Use AI suggestion</>
										)}
									</button>
								)}
							</div>
							{suggestions?.leadMagnetPurpose?.length && purposeMode === "preset" ? (
								<div className="mt-1 space-y-2">
									{suggestions.leadMagnetPurpose.map((p) => {
										const isSelected = selectedPurpose === p.value;
										return (
											<label
												key={p.label}
												className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer text-sm ${
													isSelected
														? "border-blue-500 bg-blue-50"
														: "border-slate-200 bg-white hover:bg-slate-50"
												}`}
											>
												<input
													type="radio"
													name="tpl-purpose"
													value={p.value}
													checked={isSelected}
													onChange={() => setSelectedPurpose(p.value)}
													className="sr-only"
												/>
												<div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
													isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
												}`}>
													{isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
												</div>
												<div className="flex-1 min-w-0">
													<span className={`font-semibold ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
														{p.label}
													</span>
													{isSelected && (
														<p className="mt-1 text-slate-600 font-normal">{p.value}</p>
													)}
												</div>
											</label>
										);
									})}
								</div>
							) : (
								<textarea
									id="tpl-purpose"
									value={customPurpose}
									onChange={(e) => setCustomPurpose(e.target.value)}
									placeholder="e.g. Educate the prospect on how engineering capacity solves their roadmap bottleneck. Soft CTA to a 30-min scoping call."
									rows={2}
									className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
								/>
							)}
						</div>

						{/* writingRules */}
						<div>
							<div className="flex items-center justify-between">
								<label
									htmlFor="tpl-rules"
									className="block text-sm font-medium text-slate-700"
								>
									Writing rules
									<span className="ml-1 text-xs font-normal text-slate-400">
										(optional)
									</span>
								</label>
								<button
									type="button"
									onClick={() =>
										setWritingRulesMode((m) => (m === "preset" ? "custom" : "preset"))
									}
									className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
								>
									{writingRulesMode === "preset" ? (
										<><PenLine className="w-3 h-3" /> Write my own</>
									) : (
										<><List className="w-3 h-3" /> Use preset</>
									)}
								</button>
							</div>
							{writingRulesMode === "preset" ? (
								<>
									<select
										id="tpl-rules"
										value={selectedPreset}
										onChange={(e) => setSelectedPreset(e.target.value)}
										className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
									>
										{WRITING_RULE_PRESETS.map((p) => (
											<option key={p.label} value={p.value}>
												{p.label}
											</option>
										))}
									</select>
									<p className="mt-1.5 text-xs text-slate-400 italic">
										{WRITING_RULE_PRESETS.find((p) => p.value === selectedPreset)?.value}
									</p>
								</>
							) : (
								<textarea
									id="tpl-rules"
									value={customRules}
									onChange={(e) => setCustomRules(e.target.value)}
									placeholder="e.g. Never pitch the prospect's product. Cite stats. Avoid 'cutting-edge', 'revolutionize', 'transform'."
									rows={2}
									className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
								/>
							)}
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
							disabled={submitting || files.length === 0}
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
