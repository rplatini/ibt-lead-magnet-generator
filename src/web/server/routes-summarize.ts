import { homedir } from "node:os";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import express from "express";

const CLAUDE_EXECUTABLE =
	process.env.CLAUDE_CODE_EXECUTABLE ?? join(homedir(), ".local/bin/claude");

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
			pathToClaudeCodeExecutable: CLAUDE_EXECUTABLE,
			tools: ["WebSearch"],
			allowedTools: ["WebSearch"],
			permissionMode: "bypassPermissions",
			allowDangerouslySkipPermissions: true,
			maxTurns: 5,
		},
	});

	let finalText = "";
	for await (const event of session) {
		// biome-ignore lint/suspicious/noExplicitAny: SDK message shape varies
		const e = event as any;
		if (e.type === "assistant" && Array.isArray(e.message?.content)) {
			for (const block of e.message.content) {
				if (block.type === "text") {
					finalText = block.text;
				}
			}
		}
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
		res.json(parsed);
	} catch {
		console.error("[summarize] failed to parse agent text:", JSON.stringify(finalText));
		res.json({ companyOffering: [], leadMagnetPurpose: [] });
	}
});
