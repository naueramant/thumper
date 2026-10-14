import * as React from "react";
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
} from "recharts";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import {
	buildQueueLengthChartData,
	type QueueLengthPoint,
	type ChartRangeOption,
	DEFAULT_CHART_RANGE,
	QUEUE_CHART_RANGES,
} from "@/utilities/chart/telemetry.ts";
import { formatNumber } from "@/services/rabbitmq/utils.ts";
import type { RateDetail } from "@/services/rabbitmq/types/common.ts";
import { cn } from "@/utilities/cn/index.ts";

export interface QueuedMessagesChartProps {
	title?: string;
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
		| undefined;
	className?: string;
	height?: number;
	showControls?: boolean;
	availableRanges?: ChartRangeOption[];
	selectedRange?: ChartRangeOption;
	onRangeChange?: (range: ChartRangeOption) => void;
}

export function QueuedMessagesChart({
	title = "Queued messages",
	source,
	className,
	height = 200,
	showControls = true,
	availableRanges = QUEUE_CHART_RANGES,
	selectedRange,
	onRangeChange,
}: QueuedMessagesChartProps) {
	const [internalRange, setInternalRange] = React.useState<ChartRangeOption>(
		() => selectedRange ?? DEFAULT_CHART_RANGE,
	);

	const activeRange = selectedRange ?? internalRange;

	const handleRangeSelect = React.useCallback(
		(opt: ChartRangeOption) => {
			setInternalRange(opt);
			onRangeChange?.(opt);
		},
		[onRangeChange],
	);

	const chartData = React.useMemo(() => {
		const raw = buildQueueLengthChartData(source, activeRange.value);
		if (raw.length === 1) {
			// Pad with starting point so a line can be drawn even with 1 sample
			const paddingPoint: QueueLengthPoint = {
				...raw[0],
				time: "",
				timestamp: raw[0].timestamp - 1000,
			};
			return [paddingPoint, raw[0]];
		}
		return raw;
	}, [source, activeRange.value]);

	const currentTotal = source?.messages ?? 0;
	const currentReady = source?.messages_ready ?? 0;
	const currentUnacked = source?.messages_unacknowledged ?? 0;

	return (
		<Card className={cn("border-border/80 bg-card/60", className)}>
			<CardHeader className="p-4 pb-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<CardTitle className="text-sm font-semibold tracking-tight text-foreground">
							{title}
						</CardTitle>
						<span className="text-[11px] font-mono text-muted-foreground">
							[{activeRange.label.toLowerCase()}]
						</span>
					</div>

					{/* Metric chips matching RabbitMQ Management UI */}
					<div className="flex items-center gap-2.5 text-xs font-mono">
						<div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/30 border border-border/40">
							<span className="h-2 w-2 rounded-xs bg-amber-500" />
							<span className="text-muted-foreground text-[11px]">Ready:</span>
							<span className="font-semibold text-foreground">
								{formatNumber(currentReady)}
							</span>
						</div>
						<div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/30 border border-border/40">
							<span className="h-2 w-2 rounded-xs bg-cyan-400" />
							<span className="text-muted-foreground text-[11px]">Unacked:</span>
							<span className="font-semibold text-foreground">
								{formatNumber(currentUnacked)}
							</span>
						</div>
						<div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/30 border border-border/40">
							<span className="h-2 w-2 rounded-xs bg-rose-500" />
							<span className="text-muted-foreground text-[11px]">Total:</span>
							<span className="font-semibold text-foreground">
								{formatNumber(currentTotal)}
							</span>
						</div>

						{showControls && availableRanges.length > 1 && (
							<div className="inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/20 p-0.5">
								{availableRanges.map((opt) => (
									<button
										key={opt.value}
										type="button"
										onClick={() => handleRangeSelect(opt)}
										className={cn(
											"px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer",
											activeRange.value === opt.value
												? "bg-primary/15 text-primary font-semibold"
												: "text-muted-foreground hover:text-foreground",
										)}
										title={opt.label}
									>
										{opt.shortLabel}
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="p-4 pt-2">
				<div style={{ height, width: "100%" }}>
					{chartData.length > 0 ? (
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={chartData}
								margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									opacity={0.12}
								/>
								<XAxis
									dataKey="time"
									tickLine={false}
									axisLine={false}
									fontSize={10}
									stroke="#888888"
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									fontSize={10}
									stroke="#888888"
									allowDecimals={false}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "var(--color-card, #1c1d22)",
										borderColor: "var(--color-border, #2e3039)",
										borderRadius: "8px",
										fontSize: "12px",
										color: "var(--color-foreground, #ffffff)",
										boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
									}}
									labelFormatter={(_, payload) => {
										if (payload && payload[0]?.payload?.fullTime) {
											return payload[0].payload.fullTime;
										}
										return "";
									}}
									formatter={(val: any, name: any) => [
										`${formatNumber(Number(val))} msgs`,
										name,
									]}
								/>
								<Line
									type="monotone"
									dataKey="total"
									name="Total"
									stroke="#ef4444"
									strokeWidth={1.8}
									dot={false}
									isAnimationActive={false}
								/>
								<Line
									type="monotone"
									dataKey="ready"
									name="Ready"
									stroke="#f59e0b"
									strokeWidth={1.5}
									dot={false}
									isAnimationActive={false}
								/>
								<Line
									type="monotone"
									dataKey="unacked"
									name="Unacked"
									stroke="#06b6d4"
									strokeWidth={1.5}
									dot={false}
									isAnimationActive={false}
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<div className="flex h-full items-center justify-center text-xs text-muted-foreground font-mono">
							No historical queue samples recorded
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
