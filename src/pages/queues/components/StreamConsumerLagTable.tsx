import { Badge } from "@/components/ui/badge/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table/index.tsx";
import { useRabbitConsumers } from "@/hooks/useRabbitMQ/index.ts";
import type { Queue } from "@/services/rabbitmq/types/queue.ts";
import { formatNumber } from "@/services/rabbitmq/utils.ts";
import { Activity, AlertCircle, CheckCircle, Radio, Users } from "lucide-react";
import * as React from "react";

interface StreamConsumerLagTableProps {
	queue: Queue;
	vhost: string;
	queueName: string;
}

export function StreamConsumerLagTable({
	queue,
	vhost,
	queueName,
}: StreamConsumerLagTableProps) {
	const { data: allConsumers = [] } = useRabbitConsumers(vhost);

	// Filter consumers that are reading from this specific stream
	const streamConsumers = React.useMemo(() => {
		return allConsumers.filter(
			(c) => c.queue?.name === queueName && (c.queue?.vhost === vhost || !c.queue?.vhost),
		);
	}, [allConsumers, queueName, vhost]);

	const logEndOffset = queue.messages || 0;

	return (
		<Card className="border border-border/80 bg-card/60">
			<CardHeader className="pb-3 border-b border-border/50">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
					<div>
						<CardTitle className="text-base flex items-center gap-2">
							<Users className="h-4 w-4 text-cyan-400" />
							Stream Consumers &amp; Offset Lag
							<Badge variant="outline" className="font-mono text-xs text-cyan-400 border-cyan-500/30">
								{streamConsumers.length} active
							</Badge>
						</CardTitle>
						<CardDescription className="text-xs">
							Stream clients track their own persistent offset positions. Consumer lag indicates messages pending processing.
						</CardDescription>
					</div>

					<div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
						<span>Log End Offset:</span>
						<Badge variant="outline" className="font-mono text-xs text-foreground bg-muted/40">
							#{formatNumber(logEndOffset)}
						</Badge>
					</div>
				</div>
			</CardHeader>

			<CardContent className="p-0">
				{streamConsumers.length === 0 ? (
					<div className="p-8 text-center space-y-2">
						<Radio className="h-8 w-8 text-muted-foreground/40 mx-auto" />
						<div className="text-xs text-muted-foreground font-mono">
							No stream consumers currently attached to this queue.
						</div>
						<p className="text-[11px] text-muted-foreground/70 max-w-md mx-auto">
							Stream consumers can connect using the dedicated high-performance RabbitMQ Stream Protocol (port 5552) or standard AMQP 0-9-1 with stream offset arguments.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="text-[11px] font-mono">Consumer Tag</TableHead>
									<TableHead className="text-[11px]">Connection / Peer</TableHead>
									<TableHead className="text-[11px] font-mono">Read Offset</TableHead>
									<TableHead className="text-[11px] font-mono">Log End</TableHead>
									<TableHead className="text-[11px] font-mono">Consumer Lag</TableHead>
									<TableHead className="text-[11px] font-mono">Credit / Prefetch</TableHead>
									<TableHead className="text-right text-[11px]">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{streamConsumers.map((c, idx) => {
									const rawOffset = c.arguments?.["x-stream-offset"];
									let consumerOffset = logEndOffset;
									let offsetDisplay = "Latest (Head)";

									if (typeof rawOffset === "number") {
										consumerOffset = rawOffset;
										offsetDisplay = `#${formatNumber(rawOffset)}`;
									} else if (typeof rawOffset === "string") {
										offsetDisplay = rawOffset;
										if (rawOffset === "first") {
											consumerOffset = 0;
										} else if (rawOffset === "last" || rawOffset === "next") {
											consumerOffset = logEndOffset;
										}
									}

									const lag = Math.max(0, logEndOffset - consumerOffset);

									return (
										<TableRow key={idx} className="hover:bg-muted/30">
											<TableCell className="font-mono text-xs font-semibold text-foreground">
												<div className="flex items-center gap-1.5">
													<Activity className="h-3.5 w-3.5 text-cyan-400" />
													<span className="truncate max-w-[180px]" title={c.consumer_tag}>
														{c.consumer_tag}
													</span>
												</div>
											</TableCell>
											<TableCell className="text-xs font-mono text-muted-foreground">
												<div className="truncate max-w-[200px]" title={c.channel_details?.connection_name || "unknown"}>
													{c.channel_details?.peer_host
														? `${c.channel_details.peer_host}:${c.channel_details.peer_port}`
														: c.channel_details?.connection_name || "direct"}
												</div>
											</TableCell>
											<TableCell className="font-mono text-xs text-primary font-medium">
												{offsetDisplay}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												#{formatNumber(logEndOffset)}
											</TableCell>
											<TableCell>
												{lag === 0 ? (
													<Badge
														variant="outline"
														className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
													>
														<CheckCircle className="h-3 w-3 mr-1" />
														Caught up
													</Badge>
												) : (
													<Badge
														variant="outline"
														className={`text-[10px] font-mono ${
															lag > 500
																? "border-destructive/30 text-destructive bg-destructive/10"
																: "border-amber-500/30 text-amber-500 bg-amber-500/10"
														}`}
													>
														<AlertCircle className="h-3 w-3 mr-1" />
														{formatNumber(lag)} msgs behind
													</Badge>
												)}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{c.prefetch_count ? formatNumber(c.prefetch_count) : "Unbounded"}
											</TableCell>
											<TableCell className="text-right">
												<Badge
													variant="outline"
													className="text-[10px] font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
												>
													Streaming
												</Badge>
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
