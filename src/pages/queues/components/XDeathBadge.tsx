import {
	extractXDeathEntries,
	parseXDeathTime,
	type XDeathEntry,
} from "@/services/rabbitmq/types/xdeath.ts";
import { AlertOctagon, Clock, Database, Layers } from "lucide-react";
import * as React from "react";

interface XDeathBadgeProps {
	headers?: Record<string, unknown>;
	entries?: XDeathEntry[];
	showDetails?: boolean;
	className?: string;
}

export function XDeathBadge({
	headers,
	entries: propEntries,
	showDetails = true,
	className = "",
}: XDeathBadgeProps) {
	const entries = React.useMemo(() => {
		if (propEntries && propEntries.length > 0) return propEntries;
		return extractXDeathEntries(headers);
	}, [headers, propEntries]);

	if (entries.length === 0) return null;

	const primary = entries[0];
	const reason = primary.reason;
	const count = primary.count || 1;
	const timeMs = parseXDeathTime(primary.time);
	const timeStr = timeMs ? new Date(timeMs).toLocaleTimeString() : null;

	const getBadgeStyle = () => {
		switch (reason) {
			case "rejected":
				return {
					bg: "bg-rose-500/10 text-rose-500 border-rose-500/30",
					icon: AlertOctagon,
					label: "Rejected",
				};
			case "expired":
				return {
					bg: "bg-amber-500/10 text-amber-500 border-amber-500/30",
					icon: Clock,
					label: "Expired (TTL)",
				};
			case "maxlen":
				return {
					bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
					icon: Database,
					label: "Max Length",
				};
			default:
				return {
					bg: "bg-muted text-muted-foreground border-border",
					icon: Layers,
					label: reason || "Dead Letter",
				};
		}
	};

	const style = getBadgeStyle();
	const Icon = style.icon;

	const tooltip = [
		`Reason: ${style.label}`,
		primary.queue ? `Origin Queue: ${primary.queue}` : null,
		primary.exchange ? `Origin Exchange: ${primary.exchange}` : null,
		count > 1 ? `Hops / Count: ${count}` : null,
		timeStr ? `Time: ${timeStr}` : null,
		entries.length > 1 ? `+${entries.length - 1} more death history events` : null,
	]
		.filter(Boolean)
		.join("\n");

	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border font-medium ${style.bg} ${className}`}
			title={tooltip}
		>
			<Icon className="h-3 w-3 shrink-0" />
			<span>{style.label}</span>
			{count > 1 && (
				<span className="opacity-80 px-1 py-0.2 rounded bg-black/20 text-[9px]">
					&times;{count}
				</span>
			)}
			{showDetails && primary.queue && (
				<span className="text-muted-foreground opacity-90 truncate max-w-[120px]">
					from {primary.queue}
				</span>
			)}
		</span>
	);
}
