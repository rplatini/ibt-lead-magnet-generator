import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface RenderOpts {
	maxPages?: number;
	dpi?: number;
}

export interface RenderedPage {
	pageNum: number;
	pngBase64: string;
	mediaType: "image/png";
}

/**
 * Render the first N pages of a PDF buffer to PNG base64 strings using
 * `pdftoppm` (Poppler). Used when pdf-parse can't extract usable text from
 * image-based PDFs like brandbooks where typography is outlined to vector
 * paths.
 *
 * Requires `pdftoppm` on the PATH (brew install poppler / apt install
 * poppler-utils). The pure-JS pdfjs-dist + @napi-rs/canvas combo can't render
 * radial gradients, which most brand designs use, so we shell out instead.
 */
export async function renderPdfToImages(
	buf: Buffer,
	opts: RenderOpts = {},
): Promise<RenderedPage[]> {
	const { maxPages = 12, dpi = 110 } = opts;
	const dir = await mkdtemp(join(tmpdir(), "lmg-pdftoppm-"));
	const inPath = join(dir, `${randomBytes(4).toString("hex")}.pdf`);
	const prefix = join(dir, "page");
	try {
		await writeFile(inPath, buf);
		try {
			await runPdftoppm([
				"-png",
				"-r",
				String(dpi),
				"-l",
				String(maxPages),
				inPath,
				prefix,
			]);
		} catch (err) {
			console.warn(
				`pdftoppm failed, collecting partial output: ${err instanceof Error ? err.message : String(err)}`,
			);
			// pdftoppm may still have rendered some pages before failing — fall
			// through and collect whatever PNGs were written.
		}
		const files = (await readdir(dir))
			.filter((f) => f.startsWith("page-") && f.endsWith(".png"))
			.sort();
		const out: RenderedPage[] = [];
		for (const file of files.slice(0, maxPages)) {
			const match = file.match(/page-(\d+)\.png$/);
			const pageNum = match ? Number.parseInt(match[1], 10) : out.length + 1;
			const png = await readFile(join(dir, file));
			out.push({
				pageNum,
				pngBase64: png.toString("base64"),
				mediaType: "image/png",
			});
		}
		return out;
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

function runPdftoppm(args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn("pdftoppm", args, {
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
						`pdftoppm exited with code ${code}: ${stderr.slice(0, 500)}`,
					),
				);
		});
	});
}
