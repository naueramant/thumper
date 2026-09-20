import { Breadcrumbs } from "@/components/Breadcrumbs/index.tsx";
import { PayloadEditor } from "@/components/common/JsonViewer";
import { TopologyFlow } from "@/components/TopologyFlow";
import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import type { Binding } from "@/services/rabbitmq/types/binding.ts";
import type { Queue, QueueMessage } from "@/services/rabbitmq/types/queue.ts";
import {
	formatBytes,
	formatNumber,
	formatRate,
} from "@/services/rabbitmq/utils.ts";
import { Link } from "@tanstack/react-router";
import {
	CheckCircle2,
	ChevronRight,
	Database,
	History,
	Link as LinkIcon,
	Network,
	Radio,
	RefreshCw,
	Send,
	Trash2,
	Unlink,
	Users,
} from "lucide-react";
import * as React from "react";
import { StreamConsumerLagTable } from "./StreamConsumerLagTable.tsx";
import { StreamLogExplorer } from "./StreamLogExplorer.tsx";
import { StreamRetentionCard } from "./StreamRetentionCard.tsx";

export type StreamTab = "log" | "consumers" | "retention" | "topology" | "bindings" | "publish";

interface StreamDetailViewProps {
	queue: Queue;
	vhost: string;
	queueName: string;
	activeTab: string;
	setActiveTab: (tab: any) => void;
	refetchQueue: () => void;
	messages: QueueMessage[];
	isFetchingMessages: boolean;
	fetchMessages: (count?: number) => Promise<void> | void;
	onSelectMessage: (msg: QueueMessage) => void;
	onDuplicateMessage: (msg: QueueMessage) => void;
	onDeleteQueue: () => void;
	bindings: Binding[];
	topologyNodes: any[];
	topologyEdges: any[];
	pubRoutingKey: string;
	setPubRoutingKey: (val: string) => void;
	pubPayload: string;
	setPubPayload: (val: string) => void;
	isPublishing: boolean;
	pubSuccess: boolean;
	handlePublish: (e: React.FormEvent) => void;
	bindExchange: string;
	setBindExchange: (val: string) => void;
	bindRoutingKey: string;
	setBindRoutingKey: (val: string) => void;
	isBinding: boolean;
	handleCreateBinding: (e: React.FormEvent) => void;
	handleDeleteBinding: (source: string, propertiesKey: string) => void;
}

export function StreamDetailView({
	queue,
	vhost,
	queueName,
	activeTab,
	setActiveTab,
	refetchQueue,
	messages,
	isFetchingMessages,
	fetchMessages,
	onSelectMessage,
	onDuplicateMessage,
	onDeleteQueue,
	bindings,
	topologyNodes,
	topologyEdges,
	pubRoutingKey,
	setPubRoutingKey,
	pubPayload,
	setPubPayload,
	isPublishing,
	pubSuccess,
	handlePublish,
	bindExchange,
	setBindExchange,
	bindRoutingKey,
	setBindRoutingKey,
	isBinding,
	handleCreateBinding,
	handleDeleteBinding,
}: StreamDetailViewProps) {
	const totalEvents = queue.messages || 0;
	const pubRate = queue.message_stats?.publish_details?.rate || 0;
	const deliverRate = queue.message_stats?.deliver_get_details?.rate || 0;
	const consumerCount = queue.consumers || 0;
	const currentBytes = queue.message_bytes || queue.memory || 0;

	const args = queue.arguments || {};
	const maxLengthBytes = typeof args["x-max-length-bytes"] === "number"
		? args["x-max-length-bytes"]
		: null;
	const maxAge = typeof args["x-max-age"] === "string" ? args["x-max-age"] : null;
	const leader = queue.leader || queue.node;
	const replicaCount = (queue.members && queue.members.length > 0) ? queue.members.length : 1;

	const tabs: { id: StreamTab; label: string; icon: React.ReactNode; badge?: number | string }[] = [
		{
			id: "log",
			label: "Log Explorer",
			icon: <History className="h-3.5 w-3.5" />,
			badge: messages.length > 0 ? messages.length : undefined,
		},
		{
			id: "consumers",
			label: "Consumers & Lag",
			icon: <Users className="h-3.5 w-3.5" />,
			badge: consumerCount > 0 ? consumerCount : undefined,
		},
		{
			id: "retention",
			label: "Retention & Raft",
			icon: <Database className="h-3.5 w-3.5" />,
		},
		{
			id: "topology",
			label: "Topology",
			icon: <Network className="h-3.5 w-3.5" />,
		},
		{
			id: "bindings",
			label: "Bindings",
			icon: <LinkIcon className="h-3.5 w-3.5" />,
			badge: bindings.length > 0 ? bindings.length : undefined,
		},
		{
			id: "publish",
			label: "Publish",
			icon: <Send className="h-3.5 w-3.5" />,
		},
	];

	// Map current activeTab to StreamTab
	const resolvedTab: StreamTab = (
		activeTab === "messages" ? "log" :
		activeTab === "consumers" ? "consumers" :
		activeTab === "retention" ? "retention" :
		activeTab === "topology" ? "topology" :
		activeTab === "bindings" ? "bindings" :
		activeTab === "publish" ? "publish" : "log"
	);

	return (
		<div className="space-y-6 pb-16">
			<Breadcrumbs>
				<Link to="/queues" className="hover:text-foreground transition-colors">
					Queues &amp; Streams
				</Link>
				<ChevronRight className="h-3 w-3 text-muted-foreground/50" />
				<span className="text-foreground font-medium truncate max-w-xs">
					{queueName}
				</span>
			</Breadcrumbs>

			{/* Stream Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
				<div>
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
							<Radio className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
									{queueName}
								</h1>
								<Badge
									variant="outline"
									className="text-[10px] uppercase font-mono font-semibold border-cyan-500/40 text-cyan-400 bg-cyan-500/10"
								>
									Stream Log
								</Badge>
								<Badge
									variant="outline"
									className={`text-[10px] font-mono ${
										queue.state === "running"
											? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
											: "border-muted-foreground/30 text-muted-foreground"
									}`}
								>
									{queue.state || "running"}
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								Raft Leader:{" "}
								<span className="font-mono text-foreground/90">{leader}</span>{" "}
								• Retention:{" "}
								<span className="font-mono text-cyan-400">
									{maxAge || (maxLengthBytes ? formatBytes(maxLengthBytes) : "Indefinite")}
								</span>{" "}
								• Cluster Replicas:{" "}
								<span className="font-mono text-foreground/90">{replicaCount}</span>
							</p>
						</div>
					</div>
				</div>

				{/* Header Actions */}
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							refetchQueue();
							fetchMessages();
						}}
						className="h-8 text-xs font-mono"
						disabled={isFetchingMessages}
					>
						<RefreshCw
							className={`h-3.5 w-3.5 mr-1.5 ${isFetchingMessages ? "animate-spin text-cyan-400" : ""}`}
						/>
						Refresh
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={onDeleteQueue}
						className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
					>
						<Trash2 className="h-3.5 w-3.5 mr-1" />
						Delete Stream
					</Button>
				</div>
			</div>

			{/* Stream Top Metric Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				{/* 1. Log Events & Offset */}
				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Total Logged Events
						</span>
						<div className="flex items-baseline justify-between">
							<span className="text-2xl font-bold font-mono text-cyan-400">
								{formatNumber(totalEvents)}
							</span>
							<span className="text-[11px] text-muted-foreground font-mono">
								End: #{formatNumber(totalEvents)}
							</span>
						</div>
						<div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between pt-0.5">
							<span>Log start:</span>
							<span className="text-foreground">#0 (retention head)</span>
						</div>
					</CardContent>
				</Card>

				{/* 2. Disk Footprint & Retention Cap */}
				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Segment Disk Storage
						</span>
						<div className="flex items-baseline justify-between">
							<span className="text-2xl font-bold font-mono text-foreground">
								{formatBytes(currentBytes)}
							</span>
							<span className="text-[11px] text-muted-foreground font-mono">
								{maxLengthBytes ? `Cap: ${formatBytes(maxLengthBytes)}` : "No limit"}
							</span>
						</div>
						<div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
							<div
								className="bg-cyan-400 h-full transition-all"
								style={{
									width: `${
										maxLengthBytes
											? Math.min(100, Math.round((currentBytes / maxLengthBytes) * 100))
											: 20
									}%`,
								}}
							/>
						</div>
					</CardContent>
				</Card>

				{/* 3. Ingress & Delivery Velocity */}
				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Streaming Throughput
						</span>
						<div className="flex items-baseline justify-between">
							<span className="text-2xl font-bold font-mono text-primary">
								{formatRate(pubRate)}
							</span>
							<span className="text-[11px] text-muted-foreground font-mono">
								ingress
							</span>
						</div>
						<div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
							<span>Read velocity:</span>
							<span className="text-foreground">{formatRate(deliverRate)}</span>
						</div>
					</CardContent>
				</Card>

				{/* 4. Stream Consumers & Consensus */}
				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Stream Consumers
						</span>
						<div className="flex items-baseline justify-between">
							<span className="text-2xl font-bold font-mono text-foreground">
								{consumerCount}
							</span>
							<Badge
								variant="outline"
								className="text-[10px] font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
							>
								{consumerCount > 0 ? "Streaming" : "Idle"}
							</Badge>
						</div>
						<div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
							<span>Raft cluster:</span>
							<span className="text-foreground">{replicaCount} replica{replicaCount > 1 ? "s" : ""}</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Stream Tab Navigation Bar */}
			<div className="border-b border-border/60">
				<div className="flex items-center gap-0.5 overflow-x-auto">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all duration-150 border-b-2 -mb-px cursor-pointer whitespace-nowrap ${
								resolvedTab === tab.id
									? "border-cyan-400 text-cyan-400"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
							}`}
						>
							{tab.icon}
							{tab.label}
							{tab.badge !== undefined && (
								<span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-mono">
									{tab.badge}
								</span>
							)}
						</button>
					))}
				</div>
			</div>

			{/* Stream Tab Content */}
			<div className="animate-in fade-in duration-150">
				{/* ── Log Explorer (Time Travel) ── */}
				{resolvedTab === "log" && (
					<StreamLogExplorer
						queue={queue}
						vhost={vhost}
						queueName={queueName}
						messages={messages}
						isFetching={isFetchingMessages}
						onFetch={fetchMessages}
						onSelectMessage={onSelectMessage}
						onDuplicateMessage={onDuplicateMessage}
					/>
				)}

				{/* ── Consumers & Lag ── */}
				{resolvedTab === "consumers" && (
					<StreamConsumerLagTable
						queue={queue}
						vhost={vhost}
						queueName={queueName}
					/>
				)}

				{/* ── Retention & Architecture ── */}
				{resolvedTab === "retention" && (
					<StreamRetentionCard queue={queue} />
				)}

				{/* ── Topology ── */}
				{resolvedTab === "topology" && (
					<Card className="border-border bg-card/60 backdrop-blur-sm overflow-hidden">
						<CardHeader className="p-4 pb-2 border-b border-border/60">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Network className="h-4 w-4 text-cyan-400" />
									<CardTitle className="text-base font-mono">
										Stream Routing &amp; Topology Flow
									</CardTitle>
								</div>
								<span className="text-[11px] font-mono text-muted-foreground">
									{topologyNodes.length} Nodes &bull; {topologyEdges.length} Active Bindings
								</span>
							</div>
							<CardDescription className="text-xs">
								Visual map showing upstream exchanges routing events into this stream log and attached consumers.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							<TopologyFlow
								nodes={topologyNodes}
								edges={topologyEdges}
								height="400px"
								showMinimap={false}
								className="rounded-t-none border-0"
							/>
						</CardContent>
					</Card>
				)}

				{/* ── Bindings ── */}
				{resolvedTab === "bindings" && (
					<Card className="border border-border/80">
						<CardHeader className="pb-3 border-b border-border/50">
							<CardTitle className="text-base flex items-center gap-2">
								<LinkIcon className="h-4 w-4 text-cyan-400" />
								Inbound Bindings
								<Badge variant="outline" className="font-mono text-xs">
									{bindings.length}
								</Badge>
							</CardTitle>
							<CardDescription className="text-xs">
								Upstream exchanges routing published messages into this stream log.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-4 space-y-4">
							<div className="space-y-2 max-h-72 overflow-y-auto">
								{bindings.length === 0 ? (
									<div className="text-xs text-muted-foreground font-mono py-4 text-center">
										No bindings configured for this stream.
									</div>
								) : (
									bindings.map((b, idx) => (
										<div
											key={idx}
											className="flex items-center justify-between p-2 rounded border border-border/60 bg-muted/20 text-xs font-mono"
										>
											<div className="flex items-center gap-2 truncate">
												<span className="text-muted-foreground">From:</span>
												<span className="font-semibold text-foreground">
													{b.source || "(default)"}
												</span>
												<span className="text-muted-foreground">key:</span>
												<Badge
													variant="outline"
													className="text-[10px] text-cyan-400"
												>
													{b.routing_key || "(empty)"}
												</Badge>
											</div>

											{b.source !== "" && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														handleDeleteBinding(b.source, b.properties_key)
													}
													className="h-6 px-1.5 text-destructive hover:bg-destructive/10"
													title="Unbind exchange"
												>
													<Unlink className="h-3.5 w-3.5" />
												</Button>
											)}
										</div>
									))
								)}
							</div>

							<form
								onSubmit={handleCreateBinding}
								className="pt-2 border-t border-border/50 space-y-2"
							>
								<span className="text-xs font-semibold text-foreground block">
									Bind from Exchange
								</span>
								<div className="grid grid-cols-2 gap-2">
									<input
										type="text"
										required
										value={bindExchange}
										onChange={(e) => setBindExchange(e.target.value)}
										placeholder="Source exchange (e.g. amq.direct)"
										className="h-8 rounded border border-border bg-muted/20 px-2 text-xs font-mono focus:border-cyan-400 focus:outline-none"
									/>
									<input
										type="text"
										value={bindRoutingKey}
										onChange={(e) => setBindRoutingKey(e.target.value)}
										placeholder="Routing key (optional)"
										className="h-8 rounded border border-border bg-muted/20 px-2 text-xs font-mono focus:border-cyan-400 focus:outline-none"
									/>
								</div>
								<Button
									type="submit"
									variant="outline"
									size="sm"
									disabled={isBinding || !bindExchange.trim()}
									className="w-full h-8 text-xs font-mono"
								>
									{isBinding ? "Binding..." : "+ Bind Exchange"}
								</Button>
							</form>
						</CardContent>
					</Card>
				)}

				{/* ── Publish ── */}
				{resolvedTab === "publish" && (
					<Card id="publish-message-card" className="border border-border/80">
						<CardHeader className="pb-3 border-b border-border/50">
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="text-base flex items-center gap-2">
										<Send className="h-4 w-4 text-cyan-400" />
										Publish Event to Stream
									</CardTitle>
									<CardDescription className="text-xs">
										Append a new event directly to the end of this stream log.
									</CardDescription>
								</div>
								{pubSuccess && (
									<Badge
										variant="outline"
										className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono text-xs"
									>
										<CheckCircle2 className="h-3 w-3 mr-1" /> Appended!
									</Badge>
								)}
							</div>
						</CardHeader>
						<CardContent className="p-4 space-y-3">
							<form onSubmit={handlePublish} className="space-y-3">
								<div className="space-y-1">
									<label className="text-xs font-medium text-muted-foreground">
										Routing Key
									</label>
									<input
										type="text"
										value={pubRoutingKey}
										onChange={(e) => setPubRoutingKey(e.target.value)}
										placeholder={queueName}
										className="h-8 w-full rounded border border-border bg-muted/20 px-2.5 text-xs font-mono focus:border-cyan-400 focus:outline-none"
									/>
								</div>

								<PayloadEditor
									value={pubPayload}
									onChange={setPubPayload}
									label="Payload (JSON or Raw Event)"
									rows={7}
									placeholder='{"event": "user_signup", "userId": 1001}'
								/>

								<Button
									type="submit"
									disabled={isPublishing || !pubPayload.trim()}
									className="w-full h-8 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white"
								>
									{isPublishing ? (
										<>
											<RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Appending...
										</>
									) : (
										<>
											<Send className="h-3.5 w-3.5 mr-1.5" /> Append Event to Stream
										</>
									)}
								</Button>
							</form>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
