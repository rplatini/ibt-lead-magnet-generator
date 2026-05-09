# Lead Magnet Generator

Two-stage agent pipeline:

1. **Agent A (template builder)** — chats with you. Reads brand guidelines (PDF or TXT, including image-based InDesign brandbooks via `pdftotext` + `pdftoppm`) plus three optional context fields (offering, lead-magnet purpose, writing rules). Confirms the design with you, then writes a custom template (HTML + Tailwind + Handlebars) to `templates/<id>/`.
2. **Agent B (lead-magnet filler)** — given a template id and a target input (e.g. `{ "targetCompany": "Stripe" }`), researches the target via Claude's built-in `WebSearch`, fills the slot schema, and renders a personalized PDF to `output/<runId>.pdf`.

Templates and generated PDFs persist on disk. A small Express server + Vite/React UI orchestrate everything.

## Requirements

- Node 20+
- [`pdftotext`](https://poppler.freedesktop.org) and `pdftoppm` from Poppler (`brew install poppler` on macOS).
- An Anthropic API key with WebSearch enabled.

## Setup

```bash
# Server-side deps (Express, agents, PDF tooling)
npm install

# Client deps (Vite + React)
cd client && npm install && cd ..

# Env
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

## Run

Two terminals:

```bash
# Terminal 1 — Express API on :7777
npm run web

# Terminal 2 — Vite dev server on :5173 (proxies /api → :7777)
cd client && npm run dev
```

Open http://localhost:5173.

## CLI (without the UI)

```bash
# Build a template (interactive)
npm run cli:build-template -- --guidelines path/to/brand.pdf --output-id acme

# Generate a personalized lead magnet
npm run cli:generate-magnet -- \
  --template acme \
  --input '{"targetCompany":"Stripe","contactName":"Patrick Collison"}'
```

## Layout

```
.
├── package.json        # server + agent deps
├── tsconfig.json
├── biome.json
├── .env                # ANTHROPIC_API_KEY, LMG_WEB_PORT
├── templates/          # one dir per template
│   └── _example/       # canonical example the agent reads as a model
├── output/             # generated PDFs + metadata sidecars
├── src/
│   ├── agents/         # template-builder + lead-magnet-filler
│   ├── parsing/        # brand guidelines + PDF→PNG
│   ├── pdf/            # Puppeteer setup + HTML→PDF
│   ├── templating/     # Handlebars + slot schema
│   ├── cli/            # build-template, generate-magnet entrypoints
│   └── web/server/     # Express + SSE
└── client/             # Vite + React UI (own package.json)
```

## Tests

```bash
npm test
```

PDF rendering tests download Chromium on first run via Puppeteer.
