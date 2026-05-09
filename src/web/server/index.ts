import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
loadEnv({ path: resolve(__dirname, "..", "..", "..", ".env") });

import express from "express";
import { generationsRouter } from "./routes-generations";
import { templatesRouter } from "./routes-templates";

const PORT = Number(process.env.LMG_WEB_PORT ?? 7777);
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use("/api/templates", templatesRouter);
app.use("/api/generations", generationsRouter);

app.listen(PORT, () => {
	console.log(`lead-magnet-generator listening on http://localhost:${PORT}`);
	if (!process.env.ANTHROPIC_API_KEY) {
		console.warn(
			"warning: ANTHROPIC_API_KEY is not set; agent calls will fail. Copy .env.example to .env and fill it in.",
		);
	}
});
