import type { MessageStats, RateDetail } from "@/services/rabbitmq/types/common.ts";

export type ChartRangeValue = 60 | 600 | 3600 | 28800 | 86400;

export interface ChartRangeOption {
	label: string;
	shortLabel: string;
	value: ChartRangeValue;
	age: number; // in seconds
	incr: number; // in seconds
}

/**
 * Historical time windows available for Overview (global retention policy in RabbitMQ).
 * RabbitMQ retains global metrics across 1m, 10m, 1h, 8h, and 1d.
 */
export const OVERVIEW_CHART_RANGES: ChartRangeOption[] = [
	{ label: "Last minute", shortLabel: "1m", value: 60, age: 60, incr: 5 },
	{ label: "Last ten minutes", shortLabel: "10m", value: 600, age: 600, incr: 5 },
	{ label: "Last hour", shortLabel: "1h", value: 3600, age: 3600, incr: 60 },
	{ label: "Last eight hours", shortLabel: "8h", value: 28800, age: 28800, incr: 600 },
	{ label: "Last day", shortLabel: "1d", value: 86400, age: 86400, incr: 1800 },
];

/**
 * Historical time windows available for Queues and Exchanges (basic retention policy in RabbitMQ).
 * RabbitMQ standard basic retention stores up to 1 hour (3600s). Longer windows like 8h/1d
 * are not retained by RabbitMQ for individual queues.
 */
export const QUEUE_CHART_RANGES: ChartRangeOption[] = [
	{ label: "Last minute", shortLabel: "1m", value: 60, age: 60, incr: 5 },
	{ label: "Last ten minutes", shortLabel: "10m", value: 600, age: 600, incr: 5 },
	{ label: "Last hour", shortLabel: "1h", value: 3600, age: 3600, incr: 60 },
];

export const DEFAULT_CHART_RANGE: ChartRangeOption = {
	label: "Last hour",
	shortLabel: "1h",
	value: 3600,
	age: 3600,
	incr: 60,
};

export interface QueueLengthPoint {
	timestamp: number;
	time: string;
	fullTime: string;
	total: number;
	ready: number;
	unacked: number;
}

export interface MessageRatesPoint {
	timestamp: number;
	time: string;
	fullTime: string;
	publish: number;
	deliver: number;
	ack: number;
	redeliver: number;
	confirm: number;
	publishIn: number;
	publishOut: number;
}

/**
 * Format a timestamp into a chart X-axis label based on the active range window.
 */
export function formatChartTime(timestamp: number, rangeSeconds: number): string {
	const d = new Date(timestamp);
	const hours = d.getHours().toString().padStart(2, "0");
	const minutes = d.getMinutes().toString().padStart(2, "0");
	const seconds = d.getSeconds().toString().padStart(2, "0");

	if (rangeSeconds <= 600) {
		// 1m - 10m: include seconds
		return `${hours}:${minutes}:${seconds}`;
	}
	if (rangeSeconds <= 86400) {
		// 1h - 24h: show hours and minutes
		return `${hours}:${minutes}`;
	}
	// Multi-day
	const month = d.toLocaleDateString(undefined, { month: "short" });
	const day = d.getDate();
	return `${month} ${day} ${hours}:${minutes}`;
}

/**
 * Format a timestamp into a detailed tooltip timestamp.
 */
export function formatTooltipTime(timestamp: number): string {
	const d = new Date(timestamp);
	return d.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

/**
 * Parses queue length telemetry (gauges) from RabbitMQ `RateDetail` objects.
 */
export function buildQueueLengthChartData(
	source:
		| {
				messages?: number;
				messages_details?: RateDetail;
				messages_ready?: number;
				messages_ready_details?: RateDetail;
				messages_unacknowledged?: number;
				messages_unacknowledged_details?: RateDetail;
		  }
		| null
		| undefined,
	rangeSeconds = 3600,
): QueueLengthPoint[] {
	if (!source) return [];

	const totalSamples = source.messages_details?.samples ?? [];
	const readySamples = source.messages_ready_details?.samples ?? [];
	const unackedSamples = source.messages_unacknowledged_details?.samples ?? [];

	const hasSamples =
		totalSamples.length > 0 ||
		readySamples.length > 0 ||
		unackedSamples.length > 0;

	if (!hasSamples) {
		const now = Date.now();
		return [
			{
				timestamp: now,
				time: formatChartTime(now, rangeSeconds),
				fullTime: formatTooltipTime(now),
				total: source.messages ?? 0,
				ready: source.messages_ready ?? 0,
				unacked: source.messages_unacknowledged ?? 0,
			},
		];
	}

	const totalMap = new Map<number, number>();
	for (const s of totalSamples) {
		totalMap.set(s.timestamp, s.sample);
	}

	const readyMap = new Map<number, number>();
	for (const s of readySamples) {
		readyMap.set(s.timestamp, s.sample);
	}

	const unackedMap = new Map<number, number>();
	for (const s of unackedSamples) {
		unackedMap.set(s.timestamp, s.sample);
	}

	const allTimestamps = Array.from(
		new Set([
			...totalMap.keys(),
			...readyMap.keys(),
			...unackedMap.keys(),
		]),
	).sort((a, b) => a - b);

	return allTimestamps.map((ts) => {
		const total = totalMap.get(ts) ?? source.messages ?? 0;
		const ready = readyMap.get(ts) ?? source.messages_ready ?? 0;
		const unacked = unackedMap.get(ts) ?? source.messages_unacknowledged ?? 0;

		return {
			timestamp: ts,
			time: formatChartTime(ts, rangeSeconds),
			fullTime: formatTooltipTime(ts),
			total,
			ready,
			unacked,
		};
	});
}

/**
 * Calculates rate map (rate = deltaCount / deltaTime) from counter samples.
 */
function extractRateMap(detail?: RateDetail): Map<number, number> {
	const map = new Map<number, number>();
	if (!detail?.samples || detail.samples.length === 0) {
		return map;
	}

	// Sort samples descending by timestamp (newest first)
	const sorted = detail.samples.slice().sort((a, b) => b.timestamp - a.timestamp);

	if (sorted.length === 1) {
		map.set(sorted[0].timestamp, detail.rate ?? 0);
		return map;
	}

	for (let i = 0; i < sorted.length - 1; i++) {
		const dt = (sorted[i].timestamp - sorted[i + 1].timestamp) / 1000;
		const dVal = sorted[i].sample - sorted[i + 1].sample;
		const rate = dt > 0 ? Math.max(0, Math.round((dVal / dt) * 100) / 100) : 0;
		map.set(sorted[i].timestamp, rate);
	}

	return map;
}

/**
 * Parses message rate telemetry (calculated from counter deltas) from RabbitMQ `MessageStats`.
 */
export function buildMessageRatesChartData(
	stats: MessageStats | null | undefined,
	rangeSeconds = 3600,
): MessageRatesPoint[] {
	if (!stats) return [];

	const pubMap = extractRateMap(stats.publish_details);
	const delMap = extractRateMap(stats.deliver_get_details ?? stats.deliver_details);
	const ackMap = extractRateMap(stats.ack_details);
	const redeliverMap = extractRateMap(stats.redeliver_details);
	const confirmMap = extractRateMap(stats.confirm_details);
	const pubInMap = extractRateMap(stats.publish_in_details);
	const pubOutMap = extractRateMap(stats.publish_out_details);

	const allTimestamps = Array.from(
		new Set([
			...pubMap.keys(),
			...delMap.keys(),
			...ackMap.keys(),
			...redeliverMap.keys(),
			...confirmMap.keys(),
			...pubInMap.keys(),
			...pubOutMap.keys(),
		]),
	).sort((a, b) => a - b);

	if (allTimestamps.length === 0) {
		const now = Date.now();
		return [
			{
				timestamp: now,
				time: formatChartTime(now, rangeSeconds),
				fullTime: formatTooltipTime(now),
				publish: stats.publish_details?.rate ?? 0,
				deliver: (stats.deliver_get_details ?? stats.deliver_details)?.rate ?? 0,
				ack: stats.ack_details?.rate ?? 0,
				redeliver: stats.redeliver_details?.rate ?? 0,
				confirm: stats.confirm_details?.rate ?? 0,
				publishIn: stats.publish_in_details?.rate ?? 0,
				publishOut: stats.publish_out_details?.rate ?? 0,
			},
		];
	}

	return allTimestamps.map((ts) => ({
		timestamp: ts,
		time: formatChartTime(ts, rangeSeconds),
		fullTime: formatTooltipTime(ts),
		publish: pubMap.get(ts) ?? 0,
		deliver: delMap.get(ts) ?? 0,
		ack: ackMap.get(ts) ?? 0,
		redeliver: redeliverMap.get(ts) ?? 0,
		confirm: confirmMap.get(ts) ?? 0,
		publishIn: pubInMap.get(ts) ?? 0,
		publishOut: pubOutMap.get(ts) ?? 0,
	}));
}
