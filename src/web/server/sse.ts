import type { Response } from "express";
import type { AgentEvent } from "../../agents/agent-events";

export interface SseChannel {
	send(event: AgentEvent): void;
	close(): void;
}

export function openSse(res: Response): SseChannel {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.setHeader("X-Accel-Buffering", "no");
	res.flushHeaders();

	return {
		send(event: AgentEvent) {
			res.write(`data: ${JSON.stringify(event)}\n\n`);
		},
		close() {
			res.end();
		},
	};
}
