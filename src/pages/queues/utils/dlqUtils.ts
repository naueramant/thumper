import type { Queue, QueueMessage } from "@/services/rabbitmq/types/queue.ts";
import { extractXDeathEntries } from "@/services/rabbitmq/types/xdeath.ts";

const DLQ_NAME_PATTERNS = [
	/\.dlq$/i,
	/-dlq$/i,
	/_dlq$/i,
	/^dlq\./i,
	/^dlq-/i,
	/\.dlx$/i,
	/-dlx$/i,
	/_dlx$/i,
	/dead-letter/i,
	/dead_letter/i,
];

/**
 * Determines whether a queue functions as a Dead Letter Queue (DLQ sink).
 * Identified by naming patterns or presence of dead-lettered messages.
 */
export function isDlqSink(
	queue: Queue | null | undefined,
	peekedMessages?: QueueMessage[],
): boolean {
	if (!queue) return false;

	// Check naming conventions
	if (DLQ_NAME_PATTERNS.some((p) => p.test(queue.name))) {
		return true;
	}

	// Check if any peeked messages have x-death headers
	if (peekedMessages && peekedMessages.length > 0) {
		const hasXDeath = peekedMessages.some((msg) => {
			const entries = extractXDeathEntries(msg.properties?.headers);
			return entries.length > 0;
		});
		if (hasXDeath) return true;
	}

	return false;
}

/**
 * Determines whether a queue forwards failed/expired messages to a Dead Letter Exchange.
 */
export function isDlqSource(queue: Queue | null | undefined): boolean {
	if (!queue) return false;
	const hasArgDlx = Boolean(queue.arguments?.["x-dead-letter-exchange"]);
	const hasPolicyDlx = Boolean(
		queue.effective_policy_definition?.["dead-letter-exchange"],
	);
	return hasArgDlx || hasPolicyDlx;
}

/**
 * Retrieves the configured dead-letter exchange destination for a source queue.
 */
export function getDlqTargetExchange(
	queue: Queue | null | undefined,
): string | undefined {
	if (!queue) return undefined;
	const arg = queue.arguments?.["x-dead-letter-exchange"];
	if (typeof arg === "string" && arg) return arg;
	const policy = queue.effective_policy_definition?.["dead-letter-exchange"];
	if (typeof policy === "string" && policy) return policy;
	return undefined;
}


