export type AgentEvent =
	| { type: "text"; text: string }
	| { type: "user_text"; text: string }
	| { type: "tool_use"; id: string; name: string; input: unknown }
	| { type: "tool_result"; toolUseId: string; ok: boolean; preview?: string }
	| { type: "preview-ready"; url: string }
	| { type: "done"; runId?: string; pdfUrl?: string }
	| { type: "error"; message: string };

const MAX_TEXT_LEN = 2000;

export function truncateForLog(text: string): string {
	if (text.length <= MAX_TEXT_LEN) return text;
	return `${text.slice(0, MAX_TEXT_LEN)}…[truncated]`;
}
