import { Badge } from "@/components/ui/badge/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import type { Queue } from "@/services/rabbitmq/types/queue.ts";
import { formatBytes } from "@/services/rabbitmq/utils.ts";
import { Clock, Database, HardDrive, Server, ShieldCheck } from "lucide-react";

interface StreamRetentionCardProps {
	queue: Queue;
}

export function StreamRetentionCard({ queue }: StreamRetentionCardProps) {
	const args = queue.arguments || {};
	const maxLengthBytes = typeof args["x-max-length-bytes"] === "number"
		? args["x-max-length-bytes"]
		: null;
	const maxAge = typeof args["x-max-age"] === "string"
		? args["x-max-age"]
		: null;
	const maxSegmentSize = typeof args["x-stream-max-segment-size-bytes"] === "number"
		? args["x-stream-max-segment-size-bytes"]
		: 500 * 1024 * 1024; // RabbitMQ default is 500 MiB

	const currentBytes = queue.message_bytes || queue.memory || 0;
	const retentionPercent = maxLengthBytes
		? Math.min(100, Math.round((currentBytes / maxLengthBytes) * 100))
		: null;

	const leader = queue.leader || queue.node;
	const members = queue.members && queue.members.length > 0 ? queue.members : [queue.node];
	const online = queue.online && queue.online.length > 0 ? queue.online : [leader];

	return (
		<Card className="border border-border/80 bg-card/60">
			<CardHeader className="pb-3 border-b border-border/50">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
					<div>
						<CardTitle className="text-base flex items-center gap-2">
							<Database className="h-4 w-4 text-cyan-400" />
							Retention &amp; Storage Architecture
						</CardTitle>
						<CardDescription className="text-xs">
							Streams are immutable commit logs bounded by physical storage policies and Raft replication.
						</CardDescription>
					</div>
					<Badge
						variant="outline"
						className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 font-mono text-[11px] w-fit"
					>
						Raft Replicated Log
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="p-4 space-y-4">
				{/* Retention Parameters Grid */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
					<div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
						<div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
							<HardDrive className="h-3.5 w-3.5 text-cyan-400" />
							<span>Max Byte Cap</span>
						</div>
						<div className="font-mono text-sm font-semibold text-foreground">
							{maxLengthBytes ? formatBytes(maxLengthBytes) : "Unlimited"}
						</div>
						<span className="text-[10px] text-muted-foreground font-mono">
							x-max-length-bytes
						</span>
					</div>

					<div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
						<div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
							<Clock className="h-3.5 w-3.5 text-cyan-400" />
							<span>Max Age</span>
						</div>
						<div className="font-mono text-sm font-semibold text-foreground">
							{maxAge || "Indefinite"}
						</div>
						<span className="text-[10px] text-muted-foreground font-mono">
							x-max-age
						</span>
					</div>

					<div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
						<div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
							<Database className="h-3.5 w-3.5 text-cyan-400" />
							<span>Segment Rollover</span>
						</div>
						<div className="font-mono text-sm font-semibold text-foreground">
							{formatBytes(maxSegmentSize)}
						</div>
						<span className="text-[10px] text-muted-foreground font-mono">
							segment file limit
						</span>
					</div>

					<div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
						<div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
							<ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
							<span>Filter Support</span>
						</div>
						<div className="font-mono text-sm font-semibold text-foreground">
							{args["x-stream-filter"] ? "Enabled" : "Disabled"}
						</div>
						<span className="text-[10px] text-muted-foreground font-mono">
							x-stream-filter
						</span>
					</div>
				</div>

				{/* Storage Capacity Bar */}
				<div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-muted/10">
					<div className="flex items-center justify-between text-xs font-mono">
						<span className="text-muted-foreground flex items-center gap-1.5">
							<HardDrive className="h-3.5 w-3.5 text-cyan-400" />
							Segment Log Disk Footprint:
							<strong className="text-foreground ml-1">{formatBytes(currentBytes)}</strong>
						</span>
						{retentionPercent !== null ? (
							<span className="text-cyan-400 font-semibold">
								{retentionPercent}% of {formatBytes(maxLengthBytes!)} limit
							</span>
						) : (
							<span className="text-muted-foreground text-[11px]">
								Retention bound by node disk capacity
							</span>
						)}
					</div>
					<div className="w-full bg-muted/50 h-2 rounded-full overflow-hidden">
						<div
							className="bg-cyan-500 h-full transition-all duration-300 rounded-full"
							style={{
								width: `${retentionPercent !== null ? Math.max(3, retentionPercent) : 25}%`,
							}}
						/>
					</div>
				</div>

				{/* Raft Replicas status */}
				<div className="pt-2 border-t border-border/50">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
						<div className="flex items-center gap-2">
							<Server className="h-3.5 w-3.5 text-cyan-400" />
							<span className="text-muted-foreground">Raft Consensus Cluster:</span>
							<span className="font-mono font-medium text-foreground">
								Leader on <span className="text-cyan-400">{leader}</span>
							</span>
						</div>

						<div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
							<span className="text-muted-foreground">Replicas ({members.length}):</span>
							{members.map((node) => {
								const isOnline = online.includes(node);
								const isLeader = node === leader;
								return (
									<span
										key={node}
										className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] ${
											isOnline
												? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
												: "border-destructive/30 text-destructive bg-destructive/10"
										}`}
									>
										<span
											className={`h-1.5 w-1.5 rounded-full ${
												isOnline ? "bg-emerald-400 animate-pulse" : "bg-destructive"
											}`}
										/>
										{node}
										{isLeader && (
											<span className="text-[9px] text-cyan-400 font-bold ml-0.5">
												(leader)
											</span>
										)}
									</span>
								);
							})}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
