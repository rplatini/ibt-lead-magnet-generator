import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { Router } from "express";
import multer from "multer";
import { parseGuidelines } from "../../parsing/brand-guidelines";
import { TEMPLATES_ROOT } from "./paths";
import {
	getSession,
	getSessionByTemplate,
	pushUserTurn,
	startTemplateSession,
	subscribeToSession,
} from "./session-store";
import { openSse } from "./sse";

export const templatesRouter = Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 100 * 1024 * 1024, files: 5 },
});

interface TemplateMeta {
	templateId?: string;
	name?: string;
	createdAt?: string;
}

async function readMeta(templateId: string): Promise<TemplateMeta> {
	try {
		const raw = await readFile(
			join(TEMPLATES_ROOT, templateId, "meta.json"),
			"utf8",
		);
		return JSON.parse(raw) as TemplateMeta;
	} catch {
		return {};
	}
}

async function listTemplateIds(): Promise<string[]> {
	try {
		const entries = await readdir(TEMPLATES_ROOT, { withFileTypes: true });
		return entries
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.filter((name) => !name.startsWith("_"));
	} catch {
		return [];
	}
}

function slugify(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return slug || "template";
}

templatesRouter.get("/", async (_req, res, next) => {
	try {
		const ids = await listTemplateIds();
		const items = await Promise.all(
			ids.map(async (id) => {
				const meta = await readMeta(id);
				let slotKeys: string[] = [];
				try {
					const raw = await readFile(
						join(TEMPLATES_ROOT, id, "slot-schema.json"),
						"utf8",
					);
					const parsed = JSON.parse(raw) as {
						slots?: Record<string, unknown>;
					};
					slotKeys = Object.keys(parsed.slots ?? {});
				} catch {
					// schema missing or malformed; leave empty
				}
				let createdAt = meta.createdAt;
				if (!createdAt) {
					try {
						const s = await stat(join(TEMPLATES_ROOT, id));
						createdAt = s.birthtime.toISOString();
					} catch {
						createdAt = new Date(0).toISOString();
					}
				}
				return {
					id,
					name: meta.name ?? id,
					createdAt,
					slotKeys,
				};
			}),
		);
		items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		res.json(items);
	} catch (err) {
		next(err);
	}
});

templatesRouter.post(
	"/",
	(req, res, next) => {
		upload.array("guidelines", 10)(req, res, (err: unknown) => {
			if (err) {
				const message = err instanceof Error ? err.message : "upload failed";
				res.status(413).json({ error: message });
				return;
			}
			next();
		});
	},
	async (req, res, next) => {
		try {
			const name = (req.body?.name as string | undefined)?.trim();
			if (!name) {
				res.status(400).json({ error: "name required" });
				return;
			}
			const files = (req.files as Express.Multer.File[] | undefined) ?? [];
			if (files.length === 0) {
				res
					.status(400)
					.json({ error: "at least one guidelines file required" });
				return;
			}
			const baseSlug = slugify(name);
			const suffix = randomBytes(3).toString("hex");
			const templateId = `${baseSlug}-${suffix}`;

			const guidelines = await Promise.all(
				files.map(async (f) => {
					const ext = extname(f.originalname).toLowerCase();
					if (ext !== ".pdf" && ext !== ".txt") {
						throw new Error(`unsupported file extension: ${ext}`);
					}
					const tmpPath = join(
						TEMPLATES_ROOT,
						`.upload-${randomBytes(4).toString("hex")}${ext}`,
					);
					const { writeFile, unlink, mkdir } = await import("node:fs/promises");
					await mkdir(TEMPLATES_ROOT, { recursive: true });
					await writeFile(tmpPath, f.buffer);
					try {
						return await parseGuidelines(tmpPath);
					} finally {
						await unlink(tmpPath).catch(() => {});
					}
				}),
			);

			const { mkdir, writeFile } = await import("node:fs/promises");
			const dir = join(TEMPLATES_ROOT, templateId);
			await mkdir(dir, { recursive: true });
			await writeFile(
				join(dir, "meta.json"),
				`${JSON.stringify(
					{
						templateId,
						name,
						createdAt: new Date().toISOString(),
					},
					null,
					2,
				)}\n`,
			);

			const brandContext = {
				companyOffering: (
					(req.body?.companyOffering as string | undefined) ?? ""
				).trim(),
				leadMagnetPurpose: (
					(req.body?.leadMagnetPurpose as string | undefined) ?? ""
				).trim(),
				writingRules: (
					(req.body?.writingRules as string | undefined) ?? ""
				).trim(),
			};
			await writeFile(
				join(dir, "brand-context.json"),
				`${JSON.stringify(brandContext, null, 2)}\n`,
			);

			const { sessionId } = startTemplateSession({
				templateId,
				guidelines,
				brandContext,
			});

			res.status(201).json({ templateId, sessionId });
		} catch (err) {
			next(err);
		}
	},
);

templatesRouter.get("/:id", async (req, res, next) => {
	try {
		const id = req.params.id;
		const dir = join(TEMPLATES_ROOT, id);
		if (!existsSync(dir)) {
			res.status(404).json({ error: "template not found" });
			return;
		}
		const meta = await readMeta(id);
		const slotSchemaRaw = await readFile(
			join(dir, "slot-schema.json"),
			"utf8",
		).catch(() => null);
		const styleTokensRaw = await readFile(
			join(dir, "style-tokens.json"),
			"utf8",
		).catch(() => null);
		res.json({
			id,
			name: meta.name ?? id,
			createdAt: meta.createdAt ?? null,
			hasPreview: existsSync(join(dir, "preview.pdf")),
			slotSchema: slotSchemaRaw ? JSON.parse(slotSchemaRaw) : null,
			styleTokens: styleTokensRaw ? JSON.parse(styleTokensRaw) : null,
		});
	} catch (err) {
		next(err);
	}
});

templatesRouter.get("/:id/preview.pdf", (req, res) => {
	const path = join(TEMPLATES_ROOT, req.params.id, "preview.pdf");
	if (!existsSync(path)) {
		res.status(404).json({ error: "preview not found" });
		return;
	}
	res.setHeader("Cache-Control", "no-store");
	res.sendFile(path);
});

templatesRouter.delete("/:id", async (req, res, next) => {
	try {
		const id = req.params.id;
		if (id.startsWith("_")) {
			res.status(400).json({ error: "cannot delete reserved template" });
			return;
		}
		const dir = join(TEMPLATES_ROOT, id);
		if (!existsSync(dir)) {
			res.status(404).json({ error: "template not found" });
			return;
		}
		await rm(dir, { recursive: true, force: true });
		res.status(204).end();
	} catch (err) {
		next(err);
	}
});

templatesRouter.post("/:id/resume-session", async (req, res) => {
	const id = req.params.id;
	const dir = join(TEMPLATES_ROOT, id);
	if (!existsSync(dir)) {
		res.status(404).json({ error: "template not found" });
		return;
	}
	const existing = getSessionByTemplate(id);
	if (existing && !existing.done) {
		res.json({ sessionId: existing.sessionId, resumed: true });
		return;
	}
	const brandContextRaw = await readFile(
		join(dir, "brand-context.json"),
		"utf8",
	).catch(() => null);
	const brandContext = brandContextRaw
		? (JSON.parse(brandContextRaw) as {
				companyOffering: string;
				leadMagnetPurpose: string;
				writingRules: string;
			})
		: { companyOffering: "", leadMagnetPurpose: "", writingRules: "" };
	const { sessionId } = startTemplateSession({
		templateId: id,
		guidelines: [
			{
				source: "(resume)",
				kind: "txt",
				text: "(no new guidelines uploaded — continuing iteration on the existing template files)",
			},
		],
		brandContext,
	});
	res.status(201).json({ sessionId, resumed: false });
});

templatesRouter.post("/:id/chat", (req, res) => {
	const sessionId = req.body?.sessionId as string | undefined;
	const message = req.body?.message as string | undefined;
	if (!sessionId || !message) {
		res.status(400).json({ error: "sessionId and message required" });
		return;
	}
	const session = getSession(sessionId);
	if (!session) {
		res.status(404).json({ error: "session not found" });
		return;
	}
	const ok = pushUserTurn(sessionId, message);
	if (!ok) {
		res.status(409).json({ error: "session is closed" });
		return;
	}
	res.json({ ok: true });
});

templatesRouter.get("/:id/stream", (req, res) => {
	const sessionId = req.query.sessionId as string | undefined;
	if (!sessionId) {
		res.status(400).json({ error: "sessionId required" });
		return;
	}
	const channel = openSse(res);
	const sub = subscribeToSession(sessionId, (event) => {
		channel.send(event);
	});
	if (!sub) {
		channel.send({ type: "error", message: "session not found" });
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
