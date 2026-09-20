import type { ListQueryOptions } from "./types/common.ts";

export const QUEUE_TYPE_DESCRIPTIONS: Record<string, string> = {
	classic:
		"Traditional queue type, stored on a single node with optional classic mirroring for HA.",
	quorum:
		"Replicated queue type using the Raft consensus protocol for high availability and data safety.",
	stream:
		"Append-only log optimized for high-throughput streaming, replay, and fan-out consumption.",
};

export const QUEUE_STATE_DESCRIPTIONS: Record<string, string> = {
	running: "The queue is up and processing messages normally.",
	idle: "The queue is up but has had no recent activity.",
	paused:
		"The queue is paused, e.g. by a pause-minority policy during a network partition.",
	flow: "The queue is applying flow control to slow down publishers because it is under load.",
	down: "The queue process is down and unavailable.",
	crashed: "The queue process crashed and could not recover automatically.",
	syncing: "The queue is synchronizing its mirror/replica with the leader.",
	minority:
		"The queue leader is in the minority side of a network partition and unavailable.",
};

export const EXCHANGE_TYPE_DESCRIPTIONS: Record<string, string> = {
	direct:
		"Routes messages to queues whose binding key exactly matches the routing key.",
	fanout:
		"Broadcasts every message to all queues bound to the exchange, ignoring routing keys.",
	topic:
		"Routes messages to queues based on wildcard pattern matching (* and #) against the routing key.",
	headers:
		"Routes messages based on matching message header attributes instead of the routing key.",
};

/**
 * Safely encodes a RabbitMQ virtual host name for API URLs.
 * The default virtual host "/" must be encoded as "%2F".
 */
export function encodeVhost(vhost: string): string {
	if (vhost === "/") {
		return "%2F";
	}
	return encodeURIComponent(vhost);
}

/**
 * Safely encodes resource names (exchanges, queues, users, nodes, etc.) for URL paths.
 */
export function encodeName(name: string): string {
	return encodeURIComponent(name);
}

/**
 * Cross-platform base64 encoder supporting browser and Node.js environments.
 */
export function base64Encode(str: string): string {
	if (typeof btoa === "function") {
		return btoa(unescape(encodeURIComponent(str)));
	}
	const globalBuffer = (
		globalThis as {
			Buffer?: {
				from: (s: string, enc: string) => { toString: (e: string) => string };
			};
		}
	).Buffer;
	if (globalBuffer) {
		return globalBuffer.from(str, "utf-8").toString("base64");
	}
	throw new Error(
		"No base64 encoding implementation available in this environment",
	);
}

/**
 * Constructs a query string from ListQueryOptions or arbitrary key-value objects.
 */
export function buildQueryParams(
	params?: ListQueryOptions | Record<string, unknown>,
): string {
	if (!params) {
		return "";
	}

	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") {
			continue;
		}

		if (key === "columns") {
			if (Array.isArray(value)) {
				searchParams.set("columns", value.join(","));
			} else {
				searchParams.set("columns", String(value));
			}
		} else if (typeof value === "boolean") {
			searchParams.set(key, value ? "true" : "false");
		} else {
			searchParams.set(key, String(value));
		}
	}

	const query = searchParams.toString();
	return query ? `?${query}` : "";
}

/**
 * Formats bytes into human readable string (e.g. 1.2 MiB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
	if (!bytes || bytes <= 0) return "0 B";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["B", "KiB", "MiB", "GiB", "TiB"];
	const i = Math.min(
		sizes.length - 1,
		Math.floor(Math.log(bytes) / Math.log(k)),
	);
	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export function formatRate(rate?: number): string {
	if (rate === undefined || rate === null || isNaN(rate)) return "0.0/s";
	return `${rate.toFixed(1)}/s`;
}

export function formatNumber(num?: number): string {
	if (num === undefined || num === null || isNaN(num)) return "0";
	return num.toLocaleString();
}
