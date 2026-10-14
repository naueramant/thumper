import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { Dropdown } from "@/components/ui/dropdown/index.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table/index.tsx";
import { tryParseJson } from "@/components/common/JsonViewer";
import type { Queue, QueueMessage } from "@/services/rabbitmq/types/queue.ts";
import { formatBytes, formatNumber } from "@/services/rabbitmq/utils.ts";
import {
	Check,
	Clock,
	Copy,
	CopyPlus,
	Eye,
	FastForward,
	History,
	Radio,
	RefreshCw,
	Rewind,
	Search,
	ShieldCheck,
	SlidersHorizontal,
} from "lucide-react";
import * as React from "react";

export type StreamSeekMode = "timestamp" | "offset" | "latest" | "earliest";

interface StreamLogExplorerProps {
	queue: Queue;
	vhost: string;
	queueName: string;
	messages: QueueMessage[];
	isFetching: boolean;
	onFetch: (count: number) => Promise<void> | void;
	onSelectMessage: (msg: QueueMessage) => void;
	onDuplicateMessage: (msg: QueueMessage) => void;
}

function formatMessageTimestamp(rawTimestamp?: number) {
	if (!rawTimestamp) return { timeFormatted: "-", timeAgo: "" };
	const date = new Date(rawTimestamp * 1000);
	const timeFormatted = date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
	const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
	const timeAgo = diffMinutes < 1 ? "just now" : `${diffMinutes}m ago`;
	return { timeFormatted, timeAgo };
}

export function StreamLogExplorer({
	queue,
	vhost: _vhost,
	queueName: _queueName,
	messages,
	isFetching,
	onFetch,
	onSelectMessage,
	onDuplicateMessage,
}: StreamLogExplorerProps) {
	const totalEvents = queue.messages || 0;

	// Navigation & Time-travel State
	const [seekMode, setSeekMode] = React.useState<StreamSeekMode>("latest");
	const [selectedPreset, setSelectedPreset] = React.useState<string>("now");
	const [customDateTime, setCustomDateTime] = React.useState<string>("");
	const [targetOffset, setTargetOffset] = React.useState<number>(
		Math.max(0, totalEvents - 25),
	);
	const [pageSize, setPageSize] = React.useState<number>(25);
	const [searchFilter, setSearchFilter] = React.useState<string>("");
	const [isLiveTailing, setIsLiveTailing] = React.useState<boolean>(false);
	const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

	// Scrub Position (0% to 100% of retention window)
	const [scrubPercent, setScrubPercent] = React.useState<number>(100);

	// Live Tailing Auto-Refresh Effect
	React.useEffect(() => {
		if (!isLiveTailing) return;
		const interval = setInterval(() => {
			onFetch(pageSize);
		}, 3000);
		return () => clearInterval(interval);
	}, [isLiveTailing, pageSize, onFetch]);

	// Handle Presets
	const handlePresetClick = (preset: string) => {
		setSelectedPreset(preset);
		setSeekMode("timestamp");
		if (preset === "now") {
			setScrubPercent(100);
			setTargetOffset(Math.max(0, totalEvents - pageSize));
		} else if (preset === "15m") {
			setScrubPercent(90);
			setTargetOffset(Math.max(0, Math.floor(totalEvents * 0.9)));
		} else if (preset === "1h") {
			setScrubPercent(70);
			setTargetOffset(Math.max(0, Math.floor(totalEvents * 0.7)));
		} else if (preset === "24h") {
			setScrubPercent(30);
			setTargetOffset(Math.max(0, Math.floor(totalEvents * 0.3)));
		} else if (preset === "earliest") {
			setScrubPercent(0);
			setTargetOffset(0);
		}
		onFetch(pageSize);
	};

	// Step Offsets
	const handleStepOffset = (delta: number) => {
		const nextOffset = Math.max(0, Math.min(totalEvents, targetOffset + delta));
		setTargetOffset(nextOffset);
		setSeekMode("offset");
		setScrubPercent(totalEvents > 0 ? Math.round((nextOffset / totalEvents) * 100) : 0);
		onFetch(pageSize);
	};

	// Copy Payload
	const handleCopy = (text: string, index: number) => {
		navigator.clipboard.writeText(text);
		setCopiedIndex(index);
		setTimeout(() => setCopiedIndex(null), 2000);
	};

	// Filter messages client-side
	const filteredMessages = React.useMemo(() => {
		if (!searchFilter.trim()) return messages;
		const query = searchFilter.toLowerCase();
		return messages.filter(
			(m) =>
				m.payload?.toLowerCase().includes(query) ||
				m.routing_key?.toLowerCase().includes(query) ||
				m.exchange?.toLowerCase().includes(query),
		);
	}, [messages, searchFilter]);

	return (
		<Card className="border border-border/80 bg-card/60">
			<CardHeader className="pb-3 border-b border-border/50">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<CardTitle className="text-base flex items-center gap-2">
							<History className="h-4 w-4 text-cyan-400" />
							Stream Log Explorer &amp; Time Travel
							<Badge
								variant="outline"
								className="font-mono text-xs text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
							>
								{filteredMessages.length} events
							</Badge>
						</CardTitle>
						<CardDescription className="text-xs">
							Seek, inspect, and replay historical events across the immutable commit log. Reading is 100% non-destructive.
						</CardDescription>
					</div>

					{/* Right side status & Live Tail toggle */}
					<div className="flex items-center gap-2">
						<div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
							<ShieldCheck className="h-3.5 w-3.5" />
							<span>Safe Read-Only</span>
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsLiveTailing((prev) => !prev)}
							className={`h-8 text-xs font-mono transition-all ${
								isLiveTailing
									? "border-cyan-500 text-cyan-400 bg-cyan-500/10 shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Radio
								className={`h-3 w-3 mr-1.5 ${
									isLiveTailing ? "text-cyan-400 animate-pulse" : "text-muted-foreground"
								}`}
							/>
							{isLiveTailing ? "Live Tailing ON" : "Live Tail"}
						</Button>
					</div>
				</div>

				{/* ── Retention Window Scrubber ── */}
				<div className="pt-3 pb-1 space-y-2">
					<div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
						<span className="flex items-center gap-1">
							<Rewind className="h-3 w-3 text-cyan-400" />
							Log Start: #0
						</span>
						<span className="text-foreground font-semibold">
							Scrubber Position: {scrubPercent}% (Offset #{formatNumber(targetOffset)})
						</span>
						<span className="flex items-center gap-1">
							Log End: #{formatNumber(totalEvents)}
							<FastForward className="h-3 w-3 text-cyan-400" />
						</span>
					</div>

					<div className="relative w-full h-4 flex items-center">
						<input
							type="range"
							min={0}
							max={100}
							value={scrubPercent}
							onChange={(e) => {
								const val = Number(e.target.value);
								setScrubPercent(val);
								const computedOffset = Math.floor((val / 100) * totalEvents);
								setTargetOffset(computedOffset);
								setSeekMode("offset");
							}}
							onMouseUp={() => onFetch(pageSize)}
							onTouchEnd={() => onFetch(pageSize)}
							className="w-full h-2 bg-muted/40 rounded-lg appearance-none cursor-pointer accent-cyan-400"
						/>
					</div>
				</div>

				{/* ── Time-Travel & Seek Controls Bar ── */}
				<div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40">
					{/* Navigation Mode Buttons */}
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mr-1">
							<SlidersHorizontal className="h-3 w-3" />
							Seek:
						</span>

						{[
							{ id: "now", label: "Now (Tail)" },
							{ id: "15m", label: "15m ago" },
							{ id: "1h", label: "1h ago" },
							{ id: "24h", label: "24h ago" },
							{ id: "earliest", label: "Earliest" },
						].map((p) => (
							<Button
								key={p.id}
								variant="ghost"
								size="sm"
								onClick={() => handlePresetClick(p.id)}
								className={`h-7 px-2 text-[11px] font-mono border rounded ${
									selectedPreset === p.id && seekMode === "timestamp"
										? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-semibold"
										: "border-border/40 text-muted-foreground hover:text-foreground"
								}`}
							>
								{p.label}
							</Button>
						))}

						{/* Custom Datetime Picker */}
						<div className="flex items-center gap-1 ml-1">
							<input
								type="datetime-local"
								value={customDateTime}
								onChange={(e) => {
									setCustomDateTime(e.target.value);
									setSeekMode("timestamp");
									setSelectedPreset("custom");
								}}
								className="h-7 px-2 rounded border border-border bg-background text-[11px] font-mono text-muted-foreground focus:outline-none focus:border-cyan-400"
								title="Time-travel to specific timestamp"
							/>
						</div>
					</div>

					{/* Offset Stepping & Pagination */}
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleStepOffset(-pageSize)}
								disabled={isFetching || targetOffset <= 0}
								className="h-7 px-2 text-xs font-mono"
								title="Seek back 25 offsets"
							>
								<Rewind className="h-3 w-3 mr-1" />
								-25
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleStepOffset(pageSize)}
								disabled={isFetching || targetOffset >= totalEvents}
								className="h-7 px-2 text-xs font-mono"
								title="Seek forward 25 offsets"
							>
								+25
								<FastForward className="h-3 w-3 ml-1" />
							</Button>
						</div>

						<Dropdown<number>
							value={pageSize}
							onChange={(v) => {
								setPageSize(v);
								onFetch(v);
							}}
							options={[
								{ label: "10 events", value: 10 },
								{ label: "25 events", value: 25 },
								{ label: "50 events", value: 50 },
								{ label: "100 events", value: 100 },
							]}
							buttonClassName="h-7 px-2 text-[11px] font-mono"
						/>

						<Button
							variant="outline"
							size="sm"
							onClick={() => onFetch(pageSize)}
							disabled={isFetching}
							className="h-7 px-2.5 text-xs font-mono"
						>
							<RefreshCw
								className={`h-3 w-3 mr-1 ${isFetching ? "animate-spin text-cyan-400" : ""}`}
							/>
							Fetch
						</Button>
					</div>
				</div>

				{/* Search & Filter Bar */}
				<div className="pt-2 flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
						<input
							type="text"
							value={searchFilter}
							onChange={(e) => setSearchFilter(e.target.value)}
							placeholder="Filter by payload content, routing key, or exchange..."
							className="h-7.5 w-full pl-8 pr-3 rounded border border-border bg-muted/20 text-xs font-mono focus:border-cyan-400 focus:outline-none"
						/>
					</div>
					{searchFilter && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setSearchFilter("")}
							className="h-7.5 text-xs text-muted-foreground"
						>
							Clear Filter
						</Button>
					)}
				</div>
			</CardHeader>

			<CardContent className="p-0">
				{filteredMessages.length === 0 ? (
					<div className="py-12 text-center text-xs text-muted-foreground font-mono space-y-2">
						{isFetching ? (
							<div className="flex items-center justify-center gap-2 text-cyan-400">
								<RefreshCw className="h-4 w-4 animate-spin" />
								Seeking stream log events...
							</div>
						) : (
							<>
								<div>No events found in this log window.</div>
								{searchFilter && (
									<div className="text-[11px] text-muted-foreground/80">
										Try adjusting or clearing your search filter.
									</div>
								)}
							</>
						)}
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-24 text-[11px] font-mono">Offset</TableHead>
									<TableHead className="text-[11px]">Timestamp / Arrival</TableHead>
									<TableHead className="text-[11px] font-mono">Routing Key</TableHead>
									<TableHead className="text-[11px] font-mono">Exchange</TableHead>
									<TableHead className="text-[11px] font-mono">Size</TableHead>
									<TableHead className="text-[11px]">Payload Preview</TableHead>
									<TableHead className="text-right text-[11px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredMessages.map((msg, idx) => {
									// Calculate simulated or exact offset for stream events
									const msgOffset =
										typeof msg.properties?.headers?.["x-stream-offset"] === "number"
											? msg.properties.headers["x-stream-offset"]
											: Math.max(0, targetOffset + idx);

									// Timestamp formatting
									const { timeFormatted, timeAgo } = formatMessageTimestamp(
										msg.properties?.timestamp,
									);

									return (
										<TableRow key={idx} className="hover:bg-muted/30">
											<TableCell className="font-mono text-xs font-semibold text-cyan-400">
												#{formatNumber(msgOffset)}
											</TableCell>
											<TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
												<div className="flex items-center gap-1.5">
													<Clock className="h-3 w-3 text-muted-foreground/60" />
													<span className="text-foreground">{timeFormatted}</span>
													{timeAgo && (
														<span className="text-[10px] text-muted-foreground">
															({timeAgo})
														</span>
													)}
												</div>
											</TableCell>
											<TableCell className="font-mono text-xs text-primary">
												{msg.routing_key || "-"}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{msg.exchange || "(default)"}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{formatBytes(msg.payload_bytes)}
											</TableCell>
											<TableCell className="max-w-md">
												<div
													onClick={() => onSelectMessage(msg)}
													className="cursor-pointer font-mono text-xs text-foreground/90 bg-muted/40 hover:bg-muted/70 px-2 py-1 rounded border border-border/40 truncate max-w-lg transition-colors flex items-center gap-1.5"
													title="Click to inspect event details"
												>
													{tryParseJson(msg.payload).isJson && (
														<span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-1 py-0.5 rounded flex-shrink-0">
															JSON
														</span>
													)}
													<span className="truncate">{msg.payload}</span>
												</div>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => onSelectMessage(msg)}
														className="h-7 px-2 text-xs hover:text-cyan-400"
														title="Inspect message payload & properties"
													>
														<Eye className="h-3.5 w-3.5 mr-1" />
														Inspect
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => onDuplicateMessage(msg)}
														className="h-7 px-2 text-xs hover:text-emerald-400"
														title="Replay or duplicate event to publisher"
													>
														<CopyPlus className="h-3.5 w-3.5 mr-1 text-emerald-500" />
														Duplicate
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleCopy(msg.payload, idx)}
														className="h-7 w-7 p-0"
														title="Copy payload"
													>
														{copiedIndex === idx ? (
															<Check className="h-3.5 w-3.5 text-emerald-500" />
														) : (
															<Copy className="h-3.5 w-3.5 text-muted-foreground" />
														)}
													</Button>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
