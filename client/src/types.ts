export type AgentEvent =
	| { type: "text"; text: string }
	| { type: "user_text"; text: string }
	| { type: "tool_use"; id: string; name: string; input: unknown }
	| { type: "tool_result"; toolUseId: string; ok: boolean; preview?: string }
	| { type: "preview-ready"; url: string }
	| { type: "done"; runId?: string; pdfUrl?: string }
	| { type: "error"; message: string };

export interface TemplateListItem {
	id: string;
	name: string;
	createdAt: string;
	slotKeys: string[];
	status: "complete" | "draft";
	description: string | null;
}

export interface SlotDef {
	type: "string" | "html" | "number" | "boolean" | "object" | "array" | "url";
	required?: boolean;
	maxLength?: number;
	hint?: string;
	shape?: Record<string, SlotDef>;
	items?: SlotDef;
	minItems?: number;
	maxItems?: number;
}

export interface SlotSchema {
	version: number;
	description?: string;
	slots: Record<string, SlotDef>;
	input: Record<string, SlotDef>;
}

export interface TemplateDetail {
	id: string;
	name: string;
	createdAt: string | null;
	description: string | null;
	hasPreview: boolean;
	slotSchema: SlotSchema | null;
	styleTokens: Record<string, unknown> | null;
	status: "complete" | "draft";
}

export interface GenerationListItem {
	runId: string;
	templateId: string;
	input: Record<string, unknown>;
	createdAt: string;
	durationMs: number;
	status: "ok" | "error";
	pdfPath: string | null;
}

export interface GenerationDetail extends GenerationListItem {
	events: AgentEvent[];
}

export interface CreateTemplateResponse {
	templateId: string;
	sessionId: string;
}

export interface StartGenerationResponse {
	runId: string;
	streamUrl: string;
}

export interface Preset {
	label: string;
	value: string;
}

export interface SummarizeResponse {
	companyOffering: Preset[];
	leadMagnetPurpose: Preset[];
}
