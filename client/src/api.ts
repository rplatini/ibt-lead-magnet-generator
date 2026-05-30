import type {
	AgentEvent,
	CreateTemplateResponse,
	GenerationDetail,
	GenerationListItem,
	StartGenerationResponse,
	SummarizeResponse,
	TemplateDetail,
	TemplateListItem,
} from "./types";

async function jsonOrThrow<T>(res: Response): Promise<T> {
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		let message = `${res.status} ${res.statusText}`;
		try {
			const body = JSON.parse(text) as { error?: string };
			if (body.error) message = body.error;
		} catch {
			if (text) message = text;
		}
		throw new Error(message);
	}
	return res.json() as Promise<T>;
}

export const api = {
	listTemplates: async (): Promise<TemplateListItem[]> =>
		jsonOrThrow(await fetch("/api/templates")),
	getTemplate: async (id: string): Promise<TemplateDetail> =>
		jsonOrThrow(await fetch(`/api/templates/${encodeURIComponent(id)}`)),
	deleteTemplate: async (id: string): Promise<void> => {
		const res = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
			method: "DELETE",
		});
		if (!res.ok && res.status !== 204) {
			throw new Error(`${res.status} ${res.statusText}`);
		}
	},
	createTemplate: async (args: {
		name: string;
		url: string;
		files: File[];
		companyOffering?: string;
		leadMagnetPurpose?: string;
		writingRules?: string;
	}): Promise<CreateTemplateResponse> => {
		const fd = new FormData();
		fd.append("name", args.name);
		fd.append("companyUrl", args.url);
		for (const f of args.files) fd.append("guidelines", f);
		if (args.companyOffering)
			fd.append("companyOffering", args.companyOffering);
		if (args.leadMagnetPurpose)
			fd.append("leadMagnetPurpose", args.leadMagnetPurpose);
		if (args.writingRules) fd.append("writingRules", args.writingRules);
		const res = await fetch("/api/templates", { method: "POST", body: fd });
		return jsonOrThrow(res);
	},
	resumeTemplateSession: async (
		id: string,
	): Promise<{ sessionId: string; resumed: boolean }> => {
		const res = await fetch(
			`/api/templates/${encodeURIComponent(id)}/resume-session`,
			{ method: "POST" },
		);
		return jsonOrThrow(res);
	},
	chat: async (
		templateId: string,
		sessionId: string,
		message: string,
	): Promise<{ ok: true }> => {
		const res = await fetch(
			`/api/templates/${encodeURIComponent(templateId)}/chat`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId, message }),
			},
		);
		return jsonOrThrow(res);
	},
	listGenerations: async (templateId?: string): Promise<GenerationListItem[]> =>
		jsonOrThrow(
			await fetch(
				templateId
					? `/api/generations?templateId=${encodeURIComponent(templateId)}`
					: "/api/generations",
			),
		),
	getGeneration: async (runId: string): Promise<GenerationDetail> =>
		jsonOrThrow(await fetch(`/api/generations/${encodeURIComponent(runId)}`)),
	summarizeCompany: async (
		companyName: string,
		url: string,
	): Promise<SummarizeResponse> => {
		const res = await fetch("/api/summarize", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ companyName, url }),
		});
		return jsonOrThrow(res);
	},
	deleteGeneration: async (runId: string): Promise<void> => {
		const res = await fetch(`/api/generations/${encodeURIComponent(runId)}`, {
			method: "DELETE",
		});
		if (!res.ok && res.status !== 204) {
			throw new Error(`${res.status} ${res.statusText}`);
		}
	},
	startGeneration: async (
		templateId: string,
		input: Record<string, unknown>,
		feedback?: string,
	): Promise<StartGenerationResponse> => {
		const res = await fetch("/api/generations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ templateId, input, feedback }),
		});
		return jsonOrThrow(res);
	},
};

export function streamEvents(
	url: string,
	onEvent: (event: AgentEvent) => void,
	onError?: () => void,
): () => void {
	const es = new EventSource(url);
	es.onmessage = (m) => {
		try {
			const event = JSON.parse(m.data) as AgentEvent;
			onEvent(event);
		} catch {
			// drop malformed payloads
		}
	};
	es.onerror = () => {
		es.close();
		onError?.();
	};
	return () => es.close();
}
