/**
 * RabbitMQ x-death header representation and helper utilities.
 * When a message is dead-lettered, RabbitMQ prepends an entry to the `x-death` array in the message headers.
 */

export interface ErlangTimestamp {
	"!": "timestamp";
	value: number;
}

export type XDeathReason = "rejected" | "expired" | "maxlen" | "delivery_limit" | string;

export interface XDeathEntry {
	count: number;
	exchange: string;
	queue: string;
	reason: XDeathReason;
	"routing-keys"?: string[];
	time?: ErlangTimestamp | number | string;
	"original-expiration"?: string;
}

/**
 * Parses timestamp from x-death header entry into milliseconds Unix timestamp.
 */
export function parseXDeathTime(time: ErlangTimestamp | number | string | undefined): number | null {
	if (!time) return null;
	if (typeof time === "number") {
		// Erlang timestamps are usually in seconds
		return time < 10000000000 ? time * 1000 : time;
	}
	if (typeof time === "object" && "!" in time && typeof time.value === "number") {
		return time.value < 10000000000 ? time.value * 1000 : time.value;
	}
	if (typeof time === "string") {
		const parsed = Date.parse(time);
		return Number.isNaN(parsed) ? null : parsed;
	}
	return null;
}

/**
 * Extracts x-death array safely from message headers.
 */
export function extractXDeathEntries(headers: Record<string, unknown> | undefined): XDeathEntry[] {
	if (!headers) return [];
	const xDeath = headers["x-death"];
	if (!Array.isArray(xDeath)) return [];
	return xDeath as XDeathEntry[];
}
