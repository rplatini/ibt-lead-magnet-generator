import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { type RenderedPage, renderPdfToImages } from "./pdf-to-images";

export interface ParsedGuidelines {
	source: string;
	kind: "pdf" | "txt";
	text: string;
	images?: RenderedPage[];
}

export async function parseGuidelines(path: string): Promise<ParsedGuidelines> {
	const ext = extname(path).toLowerCase();
	if (ext === ".txt") {
		return { source: path, kind: "txt", text: await readFile(path, "utf8") };
	}
	if (ext === ".pdf") {
		const buf = await readFile(path);
		// Always do both for PDFs: extract text via Poppler's pdftotext (handles
		// CID-mapped fonts that pdf-parse silently drops), and render the first
		// pages to PNG so the agent can see the visual identity directly. The
		// agent uses the text for factual content (voice, color names, font
		// names) and images for visual fidelity.
		const [text, images] = await Promise.all([
			extractTextWithPdftotext(buf),
			renderPdfToImages(buf, { dpi: 150 }),
		]);
		return { source: path, kind: "pdf", text, images };
	}
	throw new Error(`unsupported file extension: ${ext}`);
}

async function extractTextWithPdftotext(buf: Buffer): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "lmg-pdftotext-"));
	const inPath = join(dir, `${randomBytes(4).toString("hex")}.pdf`);
	const outPath = join(dir, "out.txt");
	try {
		await writeFile(inPath, buf);
		await runPdftotext(["-layout", "-enc", "UTF-8", inPath, outPath]);
		return await readFile(outPath, "utf8");
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

function runPdftotext(args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn("pdftotext", args, {
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stderr = "";
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else
				reject(
					new Error(
						`pdftotext exited with code ${code}: ${stderr.slice(0, 500)}`,
					),
				);
		});
	});
}
