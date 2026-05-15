import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Router } from "express";
import { startGenerationRun, subscribeToRun } from "./generation-runs";
import { OUTPUT_DIR, TEMPLATES_ROOT } from "./paths";
import { openSse } from "./sse";

export const generationsRouter = Router();

interface SidecarFile {
	runId: string;
	templateId: string;
	input: Record<string, unknown>;
	createdAt: string;
	durationMs: number;
	status: "ok" | "error";
	pdfPath: string | null;
	events?: unknown[];
}

async function readSidecar(runId: string): Promise<SidecarFile | null> {
	try {
		const raw = await readFile(join(OUTPUT_DIR, `${runId}.json`), "utf8");
		return JSON.parse(raw) as SidecarFile;
	} catch {
		return null;
	}
}

generationsRouter.get("/", async (req, res, next) => {
	try {
		const items: Array<Omit<SidecarFile, "events">> = [];
		let entries: string[] = [];
		try {
			entries = await readdir(OUTPUT_DIR);
		} catch {
			res.json([]);
			return;
		}
		const sidecarFiles = entries.filter((f) => f.endsWith(".json"));
		for (const file of sidecarFiles) {
			try {
				const raw = await readFile(join(OUTPUT_DIR, file), "utf8");
				const parsed = JSON.parse(raw) as SidecarFile;
				const { events: _events, ...rest } = parsed;
				items.push(rest);
			} catch {
				// skip malformed sidecar
			}
		}
		const { templateId } = req.query;
		const filtered =
			typeof templateId === "string" && templateId
				? items.filter((i) => i.templateId === templateId)
				: items;
		filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		res.json(filtered);
	} catch (err) {
		next(err);
	}
});

generationsRouter.post("/", (req, res, next) => {
	try {
		const body = req.body as {
			templateId?: string;
			input?: Record<string, unknown>;
			feedback?: string;
		};
		if (!body?.templateId) {
			res.status(400).json({ error: "templateId required" });
			return;
		}
		const dir = join(TEMPLATES_ROOT, body.templateId);
		if (!existsSync(dir)) {
			res.status(404).json({ error: "template not found" });
			return;
		}
		const { runId } = startGenerationRun({
			templateId: body.templateId,
			input: body.input ?? {},
			feedback: body.feedback,
		});
		res.status(202).json({
			runId,
			streamUrl: `/api/generations/${runId}/stream`,
		});
	} catch (err) {
		next(err);
	}
});

generationsRouter.get("/:runId", async (req, res, next) => {
	try {
		const sidecar = await readSidecar(req.params.runId);
		if (!sidecar) {
			res.status(404).json({ error: "generation not found" });
			return;
		}
		res.json(sidecar);
	} catch (err) {
		next(err);
	}
});

generationsRouter.get("/:runId/pdf", (req, res) => {
	const path = join(OUTPUT_DIR, `${req.params.runId}.pdf`);
	if (!existsSync(path)) {
		res.status(404).json({ error: "pdf not found" });
		return;
	}
	res.setHeader("Cache-Control", "no-store");
	res.sendFile(path);
});

generationsRouter.get("/:runId/stream", (req, res) => {
	const channel = openSse(res);
	const sub = subscribeToRun(req.params.runId, (event) => {
		channel.send(event);
	});
	if (!sub) {
		channel.send({ type: "error", message: "run not found" });
		channel.close();
		return;
	}
	for (const event of sub.replay) {
		channel.send(event);
	}
	if (sub.done) {
		channel.close();
		return;
	}
	req.on("close", () => {
		sub.unsubscribe();
		channel.close();
	});
});
