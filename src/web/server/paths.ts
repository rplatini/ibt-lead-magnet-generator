import { resolve } from "node:path";

// __dirname is <root>/src/web/server. Three levels up gets us to the
// project root, where templates/ and output/ live.
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");

export const TEMPLATES_ROOT = resolve(PROJECT_ROOT, "templates");
export const OUTPUT_DIR = resolve(PROJECT_ROOT, "output");
