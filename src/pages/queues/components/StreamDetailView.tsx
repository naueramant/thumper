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
import { Dropdown } from "@/components/ui/dropdown/index.tsx";
import type { Binding } from "@/services/rabbitmq/types/binding.ts";
import type { Exchange } from "@/services/rabbitmq/types/exchange.ts";
import type { Queue, QueueMessage } from "@/services/rabbitmq/types/queue.ts";
import {
	formatBytes,
	formatNumber,
	formatRate,
} from "@/services/rabbitmq/utils.ts";
import { cn } from "@/utilities/cn/index.ts";
import { Tooltip } from "@/components/ui/tooltip/index.tsx";
import { useAuth } from "@/hooks/useAuth/index.ts";
import { Link } from "@tanstack/react-router";
import {
	CheckCircle2,
	ChevronRight,
	Database,
	History,
	Link as LinkIcon,
	Lock,
	Network,
	Radio,
	RefreshCw,
	Send,
	Share2,
	ShieldAlert,
	Trash2,
	Unlink,
	Users,
} from "lucide-react";
import * as React from "react";
import { StreamConsumerLagTable } from "./StreamConsumerLagTable.tsx";
import { StreamLogExplorer } from "./StreamLogExplorer.tsx";
import { StreamRetentionCard } from "./StreamRetentionCard.tsx";

type StreamTab = "log" | "consumers" | "retention" | "topology" | "bindings" | "publish";

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
	allExchanges?: Exchange[];
	canRead?: boolean;
	canWrite?: boolean;
	canConfigure?: boolean;
	hasVHostAccess?: boolean;
	isAdminWithoutVHostPerms?: boolean;
	isPermissionsLoading?: boolean;
	messageAccessError?: string | null;
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
	allExchanges = [],
	canRead = true,
	canWrite = true,
	canConfigure = true,
	hasVHostAccess = true,
	isAdminWithoutVHostPerms = false,
	isPermissionsLoading = false,
	messageAccessError = null,
}: StreamDetailViewProps) {
	const { user } = useAuth();
	const totalEvents = queue.messages || 0;
	const pubRate = queue.message_stats?.publish_details?.rate || 0;
	const deliverRate = queue.message_stats?.deliver_get_details?.rate || 0;
	const consumerCount = queue.consumers || 0;
	const currentBytes = queue.message_bytes || queue.memory || 0;

	// Available exchanges for binding autocompletion
	const exchangeOptions = React.useMemo(() => {
		return allExchanges
			.filter((ex) => ex.name && ex.name.trim() !== "")
			.map((ex) => ({
				label: ex.name,
				value: ex.name,
				subLabel: ex.type,
				icon: <Share2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
			}));
	}, [allExchanges]);

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
		<div
			className={cn(
				"space-y-6",
				resolvedTab === "topology" ? "flex-1 flex flex-col min-h-0" : "pb-16",
			)}
		>
			<Breadcrumbs className="shrink-0">
				<Link to="/queues" className="hover:text-foreground transition-colors">
					Queues &amp; Streams
				</Link>
				<ChevronRight className="h-3 w-3 text-muted-foreground/50" />
				<span className="text-foreground font-medium truncate max-w-xs">
					{queueName}
				</span>
			</Breadcrumbs>

			{/* Stream Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4 shrink-0">
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

					{canConfigure ? (
						<Button
							variant="outline"
							size="sm"
							onClick={onDeleteQueue}
							className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
						>
							<Trash2 className="h-3.5 w-3.5 mr-1" />
							Delete Stream
						</Button>
					) : (
						<Tooltip content="Delete disabled: Configure permission required on this virtual host">
							<Button
								variant="outline"
								size="sm"
								disabled
								className="h-8 text-xs text-muted-foreground border-border/40 opacity-50 cursor-not-allowed"
							>
								<Trash2 className="h-3.5 w-3.5 mr-1" />
								Delete Stream
							</Button>
						</Tooltip>
					)}
				</div>
			</div>

			{/* Limited VHost Access Banner */}
			{(!hasVHostAccess || isAdminWithoutVHostPerms) && !isPermissionsLoading && (
				<div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-700 dark:text-amber-400 shrink-0">
					<div className="flex items-start sm:items-center gap-2.5">
						<ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
						<div>
							<span className="font-semibold">Limited Access Notice:</span> You do not have permissions granted on virtual host{" "}
							<span className="font-mono font-bold text-foreground">{vhost}</span>. Stream operations are restricted by RabbitMQ.
						</div>
					</div>
					{user?.tags?.includes("administrator") && (
						<Link
							to="/admin/$tab"
							params={{ tab: "vhosts" }}
							className="inline-flex items-center gap-1 font-medium underline hover:text-amber-800 dark:hover:text-amber-300 shrink-0 text-xs"
						>
							Manage Permissions
						</Link>
					)}
				</div>
			)}

			{/* Stream Top Metric Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
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
			<div className="border-b border-border/60 shrink-0">
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
			<div
				className={cn(
					resolvedTab === "topology"
						? "flex-1 flex flex-col min-h-0 transition-none"
						: "animate-in fade-in duration-150",
				)}
			>
				{/* ── Log Explorer (Time Travel) ── */}
				{resolvedTab === "log" && (
					messageAccessError || (!canRead && !isPermissionsLoading) ? (
						<Card className="border border-border/80">
							<CardContent className="py-12 flex flex-col items-center justify-center text-center px-4">
								<div className="p-3 rounded-full bg-amber-500/10 text-amber-500 mb-3 border border-amber-500/20">
									<Lock className="h-6 w-6" />
								</div>
								<h3 className="text-sm font-semibold text-foreground">
									Log Inspection Restricted
								</h3>
								<p className="text-xs text-muted-foreground mt-1 max-w-md">
									You do not have read permissions to inspect or read events from stream{" "}
									<span className="font-mono text-foreground font-medium">{queueName}</span> in virtual host{" "}
									<span className="font-mono text-foreground font-medium">{vhost}</span>.
								</p>
								<div className="mt-3 text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded border border-amber-500/20">
									{messageAccessError || "AMQP read permission required for this stream"}
								</div>
							</CardContent>
						</Card>
					) : (
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
					)
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
					<Card className="flex-1 flex flex-col border-border bg-card/60 backdrop-blur-sm overflow-hidden min-h-[420px] transition-none">
						<CardHeader className="p-4 pb-2 border-b border-border/60 shrink-0">
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
						<CardContent className="p-0 flex-1 min-h-0 flex flex-col transition-none">
							<TopologyFlow
								nodes={topologyNodes}
								edges={topologyEdges}
								height="100%"
								showMinimap={false}
								className="rounded-t-none border-0 flex-1 w-full transition-none"
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
							<div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
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

											{b.source !== "" && canConfigure && (
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

							{!canConfigure && !isPermissionsLoading && (
								<div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400 mt-2">
									<ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
									<span>Binding management restricted: Configure permission required on this virtual host.</span>
								</div>
							)}

							{canConfigure && (
								<form
									onSubmit={handleCreateBinding}
									className="pt-2 border-t border-border/50 space-y-2"
								>
									<span className="text-xs font-semibold text-foreground block">
										Bind from Exchange
									</span>
									<div className="grid grid-cols-2 gap-2">
										<Dropdown<string>
											value={bindExchange}
											onChange={(val) => setBindExchange(val)}
											options={exchangeOptions}
											searchable
											clearable
											allowCustom
											searchPlaceholder="Filter exchanges..."
											placeholder="Source exchange (e.g. amq.direct)"
											align="left"
											className="w-full"
											buttonClassName="h-8 w-full justify-between px-2 text-xs font-mono bg-muted/20 border-border"
											contentClassName="w-full"
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
							)}
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
							{!canWrite && !isPermissionsLoading && (
								<div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400">
									<ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
									<span>Publishing restricted: You do not have write permission on this stream/virtual host.</span>
								</div>
							)}
							<form onSubmit={handlePublish} className="space-y-3">
								<PayloadEditor
									value={pubPayload}
									onChange={setPubPayload}
									label="Payload"
									rows={7}
									placeholder='{"event": "user_signup", "userId": 1001}'
								/>

								<Button
									type="submit"
									disabled={isPublishing || !pubPayload.trim() || (!canWrite && !isPermissionsLoading)}
									className="w-full h-8 text-xs font-semibold"
								>
									{isPublishing ? (
										<>
											<RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />{" "}
											Appending...
										</>
									) : (
										<>
											<Send className="h-3.5 w-3.5 mr-1.5" /> Append Event
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
