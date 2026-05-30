import { query } from "@anthropic-ai/claude-agent-sdk";
import express from "express";

export const summarizeRouter = express.Router();

summarizeRouter.post("/", async (req, res) => {
	const { companyName, url } = req.body as {
		companyName?: string;
		url?: string;
	};

	if (!companyName || !url) {
		res.status(400).json({ error: "companyName and url are required" });
		return;
	}

	try {
		const u = new URL(url);
		if (u.protocol !== "https:") throw new Error();
	} catch {
		res.status(400).json({ error: "url must be a valid https URL" });
		return;
	}

	const session = query({
		prompt: `Research the company "${companyName}" using its website at ${url}.

Return ONLY a valid JSON object. No markdown fences, no explanation, no sources, no extra text before or after. Exact shape:
{
  "companyOffering": [
    { "label": "Summary", "value": "<1-2 sentence description of what they sell and their target buyer>" }
  ],
  "leadMagnetPurpose": [
    { "label": "<4-7 word descriptive title>", "value": "<distinct lead magnet purpose idea related with the company's main business>" },
    { "label": "<4-7 word descriptive title>", "value": "<distinct lead magnet purpose idea related with the company's main business>" },
    { "label": "<4-7 word descriptive title>", "value": "<distinct lead magnet purpose idea related with the company's main business>" }
  ]
}`,
		options: {
			model: "claude-haiku-4-5",
			systemPrompt:
				"You are a B2B marketing researcher. Use WebSearch to visit the company website and understand what they sell and who their target buyer is. Return only the requested JSON with no markdown fences.",
			tools: ["WebSearch"],
			allowedTools: ["WebSearch"],
			permissionMode: "bypassPermissions",
			allowDangerouslySkipPermissions: true,
			maxTurns: 5,
		},
	});

	let finalText = "";
	try {
		for await (const event of session) {
			// biome-ignore lint/suspicious/noExplicitAny: SDK message shape varies
			const e = event as any;
			if (e.type === "assistant" && Array.isArray(e.message?.content)) {
				for (const block of e.message.content) {
					if (block.type === "text") {
						finalText += block.text;
					}
				}
			}
		}
	} catch (err) {
		console.error("[summarize] agent stream error:", err);
		res.status(500).json({ error: "Failed to fetch company information" });
		return;
	}

	if (!finalText) {
		console.warn("[summarize] agent produced no response, returning empty suggestions");
		res.json({ companyOffering: [], leadMagnetPurpose: [] });
		return;
	}

	try {
		const fenced = finalText.match(/```(?:json)?\s*([\s\S]*?)```/i);
		const cleaned = fenced ? fenced[1].trim() : finalText.trim();
		const parsed = JSON.parse(cleaned);
		const toPresets = (arr: unknown): Array<{ label: string; value: string }> =>
			Array.isArray(arr)
				? arr
						.filter(
							(e): e is { label: string; value: string } =>
								e !== null &&
								typeof e === "object" &&
								typeof (e as Record<string, unknown>).label === "string" &&
								typeof (e as Record<string, unknown>).value === "string",
						)
						.map((e) => ({ label: e.label, value: e.value }))
				: [];
		res.json({
			companyOffering: toPresets(parsed.companyOffering),
			leadMagnetPurpose: toPresets(parsed.leadMagnetPurpose),
		});
	} catch {
		console.error("[summarize] failed to parse agent text:", JSON.stringify(finalText));
		res.json({ companyOffering: [], leadMagnetPurpose: [] });
	}
});
