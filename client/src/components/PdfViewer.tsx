import { FileImage, RefreshCcw } from "lucide-react";

interface Props {
	src: string | null;
	refreshKey: number;
	hasPreview: boolean;
	onRefresh?: () => void;
}

export default function PdfViewer({
	src,
	refreshKey,
	hasPreview,
	onRefresh,
}: Props) {
	const showIframe = hasPreview && src;
	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
				<span className="text-xs font-medium text-slate-600">Live preview</span>
				<button
					type="button"
					onClick={onRefresh}
					className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
					disabled={!showIframe}
				>
					<RefreshCcw className="w-3 h-3" aria-hidden="true" />
					Refresh
				</button>
			</div>
			<div className="flex-1 bg-slate-100">
				{showIframe ? (
					<iframe
						key={refreshKey}
						title="preview"
						src={`${src}?ts=${refreshKey}`}
						className="w-full h-full"
					/>
				) : (
					<EmptyPreview />
				)}
			</div>
		</div>
	);
}

function EmptyPreview() {
	return (
		<div className="h-full flex flex-col items-center justify-center px-8 text-center">
			<div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm mb-5">
				<FileImage
					className="w-7 h-7 text-slate-400"
					aria-hidden="true"
					strokeWidth={1.5}
				/>
			</div>
			<p className="text-sm font-medium text-slate-700">No preview yet</p>
			<p className="mt-1.5 text-xs text-slate-500 max-w-xs leading-relaxed">
				The agent will render a preview here once you approve the design and it
				writes the template files.
			</p>
		</div>
	);
}
