import { randomUUID } from "node:crypto";
import type { AgentEvent } from "../../agents/agent-events";
import { runLeadMagnetFillerStreaming } from "../../agents/lead-magnet-filler";
import { OUTPUT_DIR, TEMPLATES_ROOT } from "./paths";

interface GenerationRun {
	runId: string;
	templateId: string;
	input: Record<string, unknown>;
	eventBuffer: AgentEvent[];
	subscribers: Set<(event: AgentEvent) => void>;
	done: boolean;
}

const runs = new Map<string, GenerationRun>();

export function getRun(runId: string): GenerationRun | undefined {
	return runs.get(runId);
}

export function startGenerationRun(args: {
	templateId: string;
	input: Record<string, unknown>;
}): { runId: string } {
	const runId = `${args.templateId}-${randomUUID().slice(0, 8)}`;
	const run: GenerationRun = {
		runId,
		templateId: args.templateId,
		input: args.input,
		eventBuffer: [],
		subscribers: new Set(),
		done: false,
	};
	runs.set(runId, run);

	void executeRun(run);
	return { runId };
}

async function executeRun(run: GenerationRun): Promise<void> {
	const emit = (event: AgentEvent) => {
		run.eventBuffer.push(event);
		for (const sub of run.subscribers) {
			try {
				sub(event);
			} catch {
				// subscriber errors must not break the stream
			}
		}
	};

	try {
		for await (const event of runLeadMagnetFillerStreaming({
			templateId: run.templateId,
			input: run.input,
			templatesRoot: TEMPLATES_ROOT,
			outputDir: OUTPUT_DIR,
			runId: run.runId,
		})) {
			emit(event);
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		emit({ type: "error", message });
	} finally {
		run.done = true;
	}
}

export function subscribeToRun(
	runId: string,
	onEvent: (event: AgentEvent) => void,
): { unsubscribe: () => void; replay: AgentEvent[]; done: boolean } | null {
	const run = runs.get(runId);
	if (!run) return null;
	const replay = [...run.eventBuffer];
	if (run.done) {
		return { unsubscribe: () => {}, replay, done: true };
	}
	run.subscribers.add(onEvent);
	return {
		unsubscribe: () => {
			run.subscribers.delete(onEvent);
		},
		replay,
		done: false,
	};
}
