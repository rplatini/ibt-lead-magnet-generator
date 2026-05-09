import { writeFile } from "node:fs/promises";
import { getBrowser } from "./puppeteer-setup";

// A4 at 96 dpi: 794 × 1123 px. Setting the viewport to match the print page
// makes CSS viewport units (vh/vw) line up with the actual page so layouts
// using `min-height: 100vh` produce one full A4 page each, with no orphan
// whitespace at the bottom of the last page.
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export async function renderHtmlToPdf(
	html: string,
	outputPath: string,
): Promise<void> {
	const browser = await getBrowser();
	const page = await browser.newPage();
	try {
		await page.setViewport({
			width: A4_WIDTH_PX,
			height: A4_HEIGHT_PX,
			deviceScaleFactor: 1,
		});
		await page.emulateMediaType("print");
		await page.setContent(html, { waitUntil: "networkidle0" });
		const pdf = await page.pdf({
			format: "A4",
			printBackground: true,
			margin: { top: "0", right: "0", bottom: "0", left: "0" },
		});
		await writeFile(outputPath, pdf);
	} finally {
		await page.close();
	}
}
