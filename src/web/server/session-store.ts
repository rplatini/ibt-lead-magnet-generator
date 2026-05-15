import { randomUUID } from "node:crypto";
import type { AgentEvent } from "../../agents/agent-events";
import {
	type BrandContext,
	runTemplateBuilderStreaming,
} from "../../agents/template-builder";
import type { ParsedGuidelines } from "../../parsing/brand-guidelines";
import { TEMPLATES_ROOT } from "./paths";

interface PendingTurn {
	text: string;
}

class AsyncQueue<T> {
	private items: T[] = [];
	private resolvers: Array<(value: IteratorResult<T>) => void> = [];
	private closed = false;

	push(value: T): void {
		if (this.closed) return;
		const resolver = this.resolvers.shift();
		if (resolver) {
			resolver({ value, done: false });
			return;
		}
		this.items.push(value);
	}

	close(): void {
		this.closed = true;
		while (this.resolvers.length > 0) {
			const resolver = this.resolvers.shift();
			resolver?.({ value: undefined as unknown as T, done: true });
		}
	}

	[Symbol.asyncIterator](): AsyncIterator<T> {
		return {
			next: (): Promise<IteratorResult<T>> => {
				if (this.items.length > 0) {
					const value = this.items.shift() as T;
					return Promise.resolve({ value, done: false });
				}
				if (this.closed) {
					return Promise.resolve({
						value: undefined as unknown as T,
						done: true,
					});
				}
				return new Promise((resolve) => {
					this.resolvers.push(resolve);
				});
			},
		};
	}
}

interface Session {
	sessionId: string;
	templateId: string;
	turnQueue: AsyncQueue<PendingTurn>;
	eventBuffer: AgentEvent[];
	subscribers: Set<(event: AgentEvent) => void>;
	done: boolean;
}

const sessions = new Map<string, Session>();
const sessionsByTemplate = new Map<string, string>();

export function getSession(sessionId: string): Session | undefined {
	return sessions.get(sessionId);
}

export function getSessionByTemplate(templateId: string): Session | undefined {
	const id = sessionsByTemplate.get(templateId);
	return id ? sessions.get(id) : undefined;
}

export type { BrandContext };

export function startTemplateSession(args: {
	templateId: string;
	guidelines: ParsedGuidelines[];
	brandContext?: BrandContext;
}): { sessionId: string } {
	const sessionId = randomUUID();
	const session: Session = {
		sessionId,
		templateId: args.templateId,
		turnQueue: new AsyncQueue<PendingTurn>(),
		eventBuffer: [],
		subscribers: new Set(),
		done: false,
	};
	sessions.set(sessionId, session);
	sessionsByTemplate.set(args.templateId, sessionId);

	void runSession(session, args.guidelines, args.brandContext);
	return { sessionId };
}

async function runSession(
	session: Session,
	guidelines: ParsedGuidelines[],
	brandContext: BrandContext | undefined,
): Promise<void> {
	const emit = (event: AgentEvent) => {
		session.eventBuffer.push(event);
		for (const sub of session.subscribers) {
			try {
				sub(event);
			} catch {
				// subscriber errors must not break the stream
			}
		}
	};

	try {
		for await (const event of runTemplateBuilderStreaming({
			templateId: session.templateId,
			templatesRoot: TEMPLATES_ROOT,
			guidelines,
			brandContext,
			userTurns: session.turnQueue,
		})) {
			emit(event);
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		emit({ type: "error", message });
	} finally {
		session.done = true;
		session.turnQueue.close();
		if (sessionsByTemplate.get(session.templateId) === session.sessionId) {
			sessionsByTemplate.delete(session.templateId);
		}
	}
}

export function pushUserTurn(sessionId: string, text: string): boolean {
	const session = sessions.get(sessionId);
	if (!session || session.done) return false;
	const userEvent: AgentEvent = { type: "user_text", text };
	session.eventBuffer.push(userEvent);
	for (const sub of session.subscribers) {
		try {
			sub(userEvent);
		} catch {
			// subscriber errors must not break the stream
		}
	}
	session.turnQueue.push({ text });
	return true;
}

export function subscribeToSession(
	sessionId: string,
	onEvent: (event: AgentEvent) => void,
): { unsubscribe: () => void; replay: AgentEvent[]; done: boolean } | null {
	const session = sessions.get(sessionId);
	if (!session) return null;
	const replay = [...session.eventBuffer];
	if (session.done) {
		return { unsubscribe: () => {}, replay, done: true };
	}
	session.subscribers.add(onEvent);
	return {
		unsubscribe: () => {
			session.subscribers.delete(onEvent);
		},
		replay,
		done: false,
	};
}
