import { Breadcrumbs } from "@/components/Breadcrumbs/index.tsx";
import {
	JsonHighlighter,
	PayloadEditor,
	PayloadViewer,
	tryParseJson,
} from "@/components/common/JsonViewer";
import { buildTopologyGraph, TopologyFlow } from "@/components/TopologyFlow";
import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card/index.tsx";
import { Dropdown } from "@/components/ui/dropdown/index.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table/index.tsx";
import { toast } from "@/components/ui/toast/index.tsx";
import { Tooltip } from "@/components/ui/tooltip/index.tsx";
import {
	QueuedMessagesChart,
	MessageRatesChart,
} from "@/components/HistoricalCharts/index.ts";
import {
	DEFAULT_CHART_RANGE,
	QUEUE_CHART_RANGES,
	type ChartRangeOption,
} from "@/utilities/chart/telemetry.ts";
import { cn } from "@/utilities/cn/index.ts";
import { useAuth } from "@/hooks/useAuth/index.ts";
import { useResourcePermissions } from "@/hooks/usePermissions/index.ts";
import {
	useRabbitExchanges,
	useRabbitMutations,
	useRabbitQueueBindings,
	useRabbitQueueDetail,
	useRabbitShovelPlugin,
} from "@/hooks/useRabbitMQ/index.ts";
import type { AckMode, QueueMessage } from "@/services/rabbitmq/types/queue.ts";
import {
	formatBytes,
	formatNumber,
	formatRate,
	QUEUE_STATE_DESCRIPTIONS,
	QUEUE_TYPE_DESCRIPTIONS,
} from "@/services/rabbitmq/utils.ts";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronRight,
	Copy,
	CopyPlus,
	Eraser,
	Eye,
	FileCode,
	Layers,
	Link as LinkIcon,
	Lock,
	Network,
	RefreshCw,
	RotateCcw,
	Send,
	Share2,
	ShieldAlert,
	Shovel,
	Trash2,
	Unlink,
	X,
} from "lucide-react";
import * as React from "react";
import { DlqReplayDialog } from "./components/DlqReplayDialog.tsx";
import { MoveMessagesDialog } from "./components/MoveMessagesDialog.tsx";
import { StreamDetailView } from "./components/StreamDetailView.tsx";
import { XDeathBadge } from "./components/XDeathBadge.tsx";
import { isDlqSink } from "./utils/dlqUtils.ts";
import { extractXDeathEntries } from "@/services/rabbitmq/types/xdeath.ts";

type QueueTab =
	| "messages"
	| "topology"
	| "publish"
	| "bindings"
	| "log"
	| "consumers"
	| "retention";

export const DEFAULT_QUEUE_TAB: QueueTab = "messages";
const QUEUE_TAB_IDS: QueueTab[] = [
	"messages",
	"topology",
	"bindings",
	"publish",
	"log",
	"consumers",
	"retention",
];

export function QueueDetailPage() {
	const params = useParams({ strict: false }) as {
		vhost?: string;
		name?: string;
		tab?: string;
	};
	const navigate = useNavigate();

	// Decode URL encoded parameters (e.g. %2F -> /)
	const vhost = params.vhost ? decodeURIComponent(params.vhost) : "/";
	const queueName = params.name ? decodeURIComponent(params.name) : "";

	const [chartRange, setChartRange] = React.useState<ChartRangeOption>(
		DEFAULT_CHART_RANGE, // 10 minutes default
	);

	const queryOptions = React.useMemo(
		() => ({
			lengths_age: chartRange.age,
			lengths_incr: chartRange.incr,
			msg_rates_age: chartRange.age,
			msg_rates_incr: chartRange.incr,
		}),
		[chartRange],
	);

	const { user } = useAuth();
	const permissions = useResourcePermissions({ vhost, queueName });
	const {
		hasVHostAccess,
		canRead,
		canWrite,
		canConfigure,
		isAdminWithoutVHostPerms,
		isLoading: isPermissionsLoading,
	} = permissions;

	const {
		data: queue,
		isLoading: isQueueLoading,
		error: queueError,
		refetch: refetchQueue,
	} = useRabbitQueueDetail(vhost, queueName, queryOptions);

	const { data: bindings = [], refetch: refetchBindings } =
		useRabbitQueueBindings(vhost, queueName);

	const {
		publishMessage,
		purgeQueue,
		deleteQueue,
		getQueueMessages,
		createBinding,
		deleteBinding,
	} = useRabbitMutations();

	const { data: allExchanges = [] } = useRabbitExchanges(vhost);

	// Active tab, reflected in the URL as an optional trailing path segment
	const activeTab: QueueTab =
		params.tab && (QUEUE_TAB_IDS as string[]).includes(params.tab)
			? (params.tab as QueueTab)
			: DEFAULT_QUEUE_TAB;

	const setActiveTab = React.useCallback(
		(tab: QueueTab) => {
			navigate({
				to: "/queues/$vhost/$name/$tab",
				params: { vhost: params.vhost ?? "", name: params.name ?? "", tab },
				replace: true,
			});
		},
		[navigate, params.vhost, params.name],
	);

	// Generate Topology Graph for Queue
	const { nodes: topologyNodes, edges: topologyEdges } = React.useMemo(() => {
		return buildTopologyGraph({
			exchanges: allExchanges,
			queues: queue ? [queue] : [],
			bindings: bindings,
			vhost,
			focalType: "queue",
			focalName: queueName,
			onNavigate: (path) => navigate({ to: path }),
		});
	}, [allExchanges, queue, bindings, vhost, queueName, navigate]);


	// Publish Form State
	const [pubPayload, setPubPayload] = React.useState(
		JSON.stringify(
			{ event: "order_updated", id: 42, status: "processed" },
			null,
			2,
		),
	);
	const [isPublishing, setIsPublishing] = React.useState(false);
	const [pubSuccess, setPubSuccess] = React.useState(false);

	// Bind Form State
	const [bindExchange, setBindExchange] = React.useState("");
	const [bindRoutingKey, setBindRoutingKey] = React.useState("");
	const [isBinding, setIsBinding] = React.useState(false);

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

	// Confirmation Modals
	const [showPurgeConfirm, setShowPurgeConfirm] = React.useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
	const [showMoveMessagesDialog, setShowMoveMessagesDialog] =
		React.useState(false);
	const [showDlqReplayDialog, setShowDlqReplayDialog] = React.useState(false);
	const [singleMessageToReplay, setSingleMessageToReplay] =
		React.useState<QueueMessage | null>(null);
	const { data: isShovelEnabled = false } = useRabbitShovelPlugin();

	// Message Explorer State
	const [messages, setMessages] = React.useState<QueueMessage[]>([]);
	const [isFetchingMessages, setIsFetchingMessages] = React.useState(false);
	const [messageAccessError, setMessageAccessError] = React.useState<string | null>(null);
	const [peekCount, setPeekCount] = React.useState<number>(10);
	const [peekAckMode, setPeekAckMode] =
		React.useState<AckMode>("ack_requeue_true");
	const [selectedMessage, setSelectedMessage] =
		React.useState<QueueMessage | null>(null);
	const [copiedMessageIndex, setCopiedMessageIndex] = React.useState<
		number | null
	>(null);

	// Auto-fetch messages on mount or when queue updates
	const fetchMessages = React.useCallback(
		async (count = peekCount, ackMode = peekAckMode, isManual = false) => {
			if (!vhost || !queueName) return;

			// If permissions are loaded and user does not have read permissions, skip fetch
			if (!isPermissionsLoading && !canRead) {
				const errMsg = "Access denied: You do not have permission to read messages from this queue.";
				setMessageAccessError(errMsg);
				if (isManual) {
					toast.error("Access denied", errMsg);
				}
				return;
			}

			setIsFetchingMessages(true);
			try {
				const msgs = await getQueueMessages.mutateAsync({
					vhost,
					name: queueName,
					options: {
						count,
						ackmode: ackMode,
						ack_mode: ackMode,
						encoding: "auto",
						truncate: 50000,
					},
				});
				setMessages(msgs || []);
				setMessageAccessError(null);
			} catch (err: any) {
				const isAuth = err?.status === 401 || err?.status === 403;
				if (isAuth) {
					const reason = err?.reason || "Access refused";
					const errMsg = `Access denied: You do not have permission to read messages from this queue (${reason}).`;
					setMessageAccessError(errMsg);
					if (isManual) {
						toast.error("Access denied", errMsg);
					}
				} else {
					console.error("Failed to peek messages:", err);
				}
			} finally {
				setIsFetchingMessages(false);
			}
		},
		[vhost, queueName, peekCount, peekAckMode, getQueueMessages, canRead, isPermissionsLoading],
	);

	React.useEffect(() => {
		if (!isPermissionsLoading && !canRead) {
			setMessageAccessError("Access denied: You do not have permission to read messages from this queue.");
			return;
		}
		fetchMessages();
	}, [vhost, queueName, canRead, isPermissionsLoading]);

	// Handle Duplicating a Message
	const handleDuplicateMessage = (msg: QueueMessage) => {
		setPubPayload(msg.payload);
		setActiveTab("publish");
	};

	// Handle Publish
	const handlePublish = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsPublishing(true);
		setPubSuccess(false);
		try {
			await publishMessage.mutateAsync({
				vhost,
				exchange: "", // Default exchange routes directly to queue named in routing key
				data: {
					routing_key: queueName,
					payload: pubPayload,
					payload_encoding: "string",
					properties: {
						delivery_mode: 2,
						content_type: "application/json",
						timestamp: Math.floor(Date.now() / 1000),
					},
				},
			});
			setPubSuccess(true);
			setTimeout(() => setPubSuccess(false), 3000);
			refetchQueue();
			fetchMessages();
		} catch (err: any) {
			toast.error("Failed to publish message", err.message || String(err));
		} finally {
			setIsPublishing(false);
		}
	};

	// Handle Purge
	const handlePurge = async () => {
		try {
			await purgeQueue.mutateAsync({ vhost, name: queueName });
			setShowPurgeConfirm(false);
			setMessages([]);
			refetchQueue();
		} catch (err: any) {
			toast.error("Failed to purge queue", err.message || String(err));
		}
	};

	// Handle Delete
	const handleDelete = async () => {
		try {
			await deleteQueue.mutateAsync({ vhost, name: queueName });
			setShowDeleteConfirm(false);
			navigate({ to: "/queues" });
		} catch (err: any) {
			toast.error("Failed to delete queue", err.message || String(err));
		}
	};

	// Handle Bind
	const handleCreateBinding = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!bindExchange.trim()) return;
		setIsBinding(true);
		try {
			await createBinding.mutateAsync({
				vhost,
				source: bindExchange.trim(),
				destination: queueName,
				destinationType: "queue",
				data: {
					routing_key: bindRoutingKey.trim(),
					arguments: {},
				},
			});
			setBindExchange("");
			setBindRoutingKey("");
			refetchBindings();
		} catch (err: any) {
			toast.error("Failed to bind exchange", err.message || String(err));
		} finally {
			setIsBinding(false);
		}
	};

	// Handle Unbind
	const handleDeleteBinding = async (source: string, propertiesKey: string) => {
		try {
			await deleteBinding.mutateAsync({
				vhost,
				source,
				destination: queueName,
				destinationType: "queue",
				propertiesKey,
			});
			refetchBindings();
		} catch (err: any) {
			toast.error("Failed to remove binding", err.message || String(err));
		}
	};

	const copyToClipboard = (text: string, index?: number) => {
		navigator.clipboard.writeText(text);
		if (index !== undefined) {
			setCopiedMessageIndex(index);
			setTimeout(() => setCopiedMessageIndex(null), 2000);
		}
	};

	if (isQueueLoading && !queue) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
				<RefreshCw className="h-6 w-6 animate-spin text-primary" />
				<div className="text-xs text-muted-foreground font-mono">
					Loading queue {queueName}...
				</div>
			</div>
		);
	}

	if (!queue) {
		const isAuthError =
			(queueError as any)?.status === 401 ||
			(queueError as any)?.status === 403;
		return (
			<div className="space-y-6">
				<Breadcrumbs className="shrink-0">
					<Link
						to="/queues"
						className="hover:text-foreground transition-colors"
					>
						Queues &amp; Streams
					</Link>
					<ChevronRight className="h-3 w-3 text-muted-foreground/50" />
					<span className="text-foreground font-medium truncate max-w-xs">
						{queueName}
					</span>
				</Breadcrumbs>

				<Card className="border border-border/80">
					<CardContent className="py-16 flex flex-col items-center justify-center text-center px-4">
						<div className="p-3 rounded-full bg-amber-500/10 text-amber-500 mb-4 border border-amber-500/20">
							<ShieldAlert className="h-8 w-8" />
						</div>
						<h2 className="text-lg font-semibold text-foreground">
							{isAuthError ? "Access Denied" : "Queue Not Found"}
						</h2>
						<p className="text-sm text-muted-foreground mt-1 max-w-md">
							{isAuthError
								? `You do not have permission to view queue "${queueName}" in virtual host "${vhost}".`
								: `The queue "${queueName}" could not be loaded.`}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-6"
							onClick={() => navigate({ to: "/queues" })}
						>
							Back to Queues
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const totalMessages = queue?.messages || 0;
	const readyMessages = queue?.messages_ready || 0;
	const unackedMessages = queue?.messages_unacknowledged || 0;
	const pubRate = queue?.message_stats?.publish_details?.rate || 0;
	const deliverRate = queue?.message_stats?.deliver_get_details?.rate || 0;
	const consumerCount = queue?.consumers || 0;
	const ramBytes = queue?.memory || 0;

	const tabs: { id: QueueTab; label: string; icon: React.ReactNode }[] = [
		{
			id: "messages",
			label: "Messages",
			icon: <FileCode className="h-3.5 w-3.5" />,
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
		},
		{ id: "publish", label: "Publish", icon: <Send className="h-3.5 w-3.5" /> },
	];

	return (
		<>
			{queue?.type === "stream" ? (
				<StreamDetailView
					queue={queue}
					vhost={vhost}
					queueName={queueName}
					activeTab={activeTab}
					setActiveTab={setActiveTab}
					refetchQueue={refetchQueue}
					messages={messages}
					isFetchingMessages={isFetchingMessages}
					fetchMessages={fetchMessages}
					onSelectMessage={setSelectedMessage}
					onDuplicateMessage={handleDuplicateMessage}
					onDeleteQueue={() => setShowDeleteConfirm(true)}
					bindings={bindings}
					topologyNodes={topologyNodes}
					topologyEdges={topologyEdges}
					pubPayload={pubPayload}
					setPubPayload={setPubPayload}
					isPublishing={isPublishing}
					pubSuccess={pubSuccess}
					handlePublish={handlePublish}
					bindExchange={bindExchange}
					setBindExchange={setBindExchange}
					bindRoutingKey={bindRoutingKey}
					setBindRoutingKey={setBindRoutingKey}
					isBinding={isBinding}
					handleCreateBinding={handleCreateBinding}
					handleDeleteBinding={handleDeleteBinding}
					allExchanges={allExchanges}
					canRead={canRead}
					canWrite={canWrite}
					canConfigure={canConfigure}
					hasVHostAccess={hasVHostAccess}
					isAdminWithoutVHostPerms={isAdminWithoutVHostPerms}
					isPermissionsLoading={isPermissionsLoading}
					messageAccessError={messageAccessError}
				/>
			) : (
				<div
					className={cn(
						"space-y-6",
						activeTab === "topology" ? "flex-1 flex flex-col min-h-0" : "pb-16",
					)}
				>
					<Breadcrumbs className="shrink-0">
						<Link
							to="/queues"
							className="hover:text-foreground transition-colors"
						>
							Queues &amp; Streams
						</Link>
						<ChevronRight className="h-3 w-3 text-muted-foreground/50" />
						<span className="text-foreground font-medium truncate max-w-xs">
							{queueName}
						</span>
					</Breadcrumbs>

					{/* Header */}
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4 shrink-0">
						<div>
							<div className="flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
									<Layers className="h-5 w-5" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
											{queueName}
										</h1>
										<Tooltip
											content={
												QUEUE_TYPE_DESCRIPTIONS[queue?.type ?? "classic"] ??
												queue?.type
											}
										>
											<Badge
												variant="outline"
												className={`text-[10px] uppercase font-mono font-semibold cursor-default ${
													queue?.type === "quorum"
														? "border-purple-500/30 text-purple-400 bg-purple-500/10"
														: queue?.type === "stream"
															? "border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
															: "border-orange-500/30 text-orange-400 bg-orange-500/10"
												}`}
											>
												{queue?.type || "classic"}
											</Badge>
										</Tooltip>
										<Tooltip
											content={
												QUEUE_STATE_DESCRIPTIONS[queue?.state ?? "idle"] ??
												queue?.state
											}
										>
											<Badge
												variant="outline"
												className={`text-[10px] font-mono cursor-default ${
													queue?.state === "running"
														? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
														: "border-muted-foreground/30 text-muted-foreground"
												}`}
											>
												{queue?.state || "idle"}
											</Badge>
										</Tooltip>
									</div>
									<p className="text-xs text-muted-foreground">
										Node:{" "}
										<span className="font-mono text-foreground/80">
											{queue?.node || "unknown"}
										</span>{" "}
										{queue?.type === "quorum" && (
											<>
												• Raft Leader:{" "}
												<span className="font-mono text-purple-400">
													{queue.leader || queue.node}
												</span>{" "}
												• Replicas:{" "}
												<span className="font-mono text-foreground/80">
													{queue.members?.length || 1}
												</span>{" "}
											</>
										)}
										• Durability:{" "}
										<span className="font-mono text-foreground/80">
											{queue?.durable ? "Durable" : "Transient"}
										</span>
									</p>
								</div>
							</div>
						</div>

						{/* Header Action Buttons */}
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
									className={`h-3.5 w-3.5 mr-1.5 ${isFetchingMessages ? "animate-spin" : ""}`}
								/>
								Refresh
							</Button>

							{isShovelEnabled && canRead && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowMoveMessagesDialog(true)}
									className="h-8 text-xs text-primary border-primary/30 hover:bg-primary/10"
									title="Move messages from this queue to another using the Shovel plugin"
								>
									<Shovel className="h-3.5 w-3.5 mr-1.5" />
									Move Messages
								</Button>
							)}

							{isDlqSink(queue, messages) && canRead && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setSingleMessageToReplay(null);
										setShowDlqReplayDialog(true);
									}}
									className="h-8 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 font-medium"
									title="Replay dead-lettered messages back to their origin queue or exchange"
								>
									<RotateCcw className="h-3.5 w-3.5 mr-1.5" />
									Replay DLQ
								</Button>
							)}

							{canRead ? (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowPurgeConfirm(true)}
									className="h-8 text-xs text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
								>
									<Eraser className="h-3.5 w-3.5 mr-1.5" />
									Purge
								</Button>
							) : (
								<Tooltip content="Purge disabled: Read permission required on this queue">
									<Button
										variant="outline"
										size="sm"
										disabled
										className="h-8 text-xs text-muted-foreground border-border/40 opacity-50 cursor-not-allowed"
									>
										<Eraser className="h-3.5 w-3.5 mr-1.5" />
										Purge
									</Button>
								</Tooltip>
							)}

							{canConfigure ? (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowDeleteConfirm(true)}
									className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
								>
									<Trash2 className="h-3.5 w-3.5 mr-1" />
									Delete
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
										Delete
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
									<span className="font-mono font-bold text-foreground">{vhost}</span>. Queue operations (reading messages, publishing, purging) are restricted by RabbitMQ.
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

					{/* DLQ Diagnostics Banner */}
					{isDlqSink(queue, messages) && (
						<div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in duration-200 shrink-0">
							<div className="flex items-start gap-3">
								<div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
									<RotateCcw className="h-4 w-4" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<span className="font-semibold text-xs text-rose-500">
											Dead Letter Queue Detected
										</span>
										<Badge variant="outline" className="border-rose-500/30 text-rose-500 text-[10px] font-mono">
											DLQ Sink
										</Badge>
									</div>
									<p className="text-[11px] text-muted-foreground mt-0.5">
										This queue collects dead-lettered messages. You can inspect rejection reasons and replay them back to production.
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<Button
									size="sm"
									onClick={() => {
										setSingleMessageToReplay(null);
										setShowDlqReplayDialog(true);
									}}
									className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer"
								>
									<RotateCcw className="h-3 w-3 mr-1" /> Replay Messages
								</Button>
							</div>
						</div>
					)}

					{/* Top Metric Cards — always visible */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
						<Card className="border border-border/80 bg-card/60">
							<CardContent className="p-4 space-y-1">
								<span className="text-[11px] font-medium text-muted-foreground">
									Total Messages
								</span>
								<div className="flex items-baseline justify-between">
									<span className="text-2xl font-bold font-mono text-foreground">
										{formatNumber(totalMessages)}
									</span>
									<span className="text-[11px] text-muted-foreground font-mono">
										{readyMessages} ready • {unackedMessages} unacked
									</span>
								</div>
								<div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden flex">
									<div
										className="bg-primary h-full transition-all"
										style={{
											width: `${totalMessages ? Math.min(100, (readyMessages / totalMessages) * 100) : 0}%`,
										}}
									/>
									<div
										className="bg-amber-500 h-full transition-all"
										style={{
											width: `${totalMessages ? Math.min(100, (unackedMessages / totalMessages) * 100) : 0}%`,
										}}
									/>
								</div>
							</CardContent>
						</Card>

						<Card className="border border-border/80 bg-card/60">
							<CardContent className="p-4 space-y-1">
								<span className="text-[11px] font-medium text-muted-foreground">
									Throughput Velocity
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
									<span>Egress:</span>
									<span className="text-foreground">
										{formatRate(deliverRate)}
									</span>
								</div>
							</CardContent>
						</Card>

						<Card className="border border-border/80 bg-card/60">
							<CardContent className="p-4 space-y-1">
								<span className="text-[11px] font-medium text-muted-foreground">
									Active Consumers
								</span>
								<div className="flex items-baseline justify-between">
									<span className="text-2xl font-bold font-mono text-foreground">
										{consumerCount}
									</span>
									<Badge variant="outline" className="text-[10px] font-mono">
										{consumerCount > 0 ? "Receiving" : "No Listeners"}
									</Badge>
								</div>
								<div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
									<span>Consumer tag:</span>
									<span className="text-foreground truncate max-w-[120px]">
										{consumerCount > 0 ? "connected" : "none"}
									</span>
								</div>
							</CardContent>
						</Card>

						<Card className="border border-border/80 bg-card/60">
							<CardContent className="p-4 space-y-1">
								<span className="text-[11px] font-medium text-muted-foreground">
									Memory Footprint
								</span>
								<div className="flex items-baseline justify-between">
									<span className="text-2xl font-bold font-mono text-foreground">
										{formatBytes(ramBytes)}
									</span>
									<span className="text-[11px] text-muted-foreground font-mono">
										RAM
									</span>
								</div>
								<div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
									<span>Auto-delete:</span>
									<span className="text-foreground">
										{queue?.auto_delete ? "Yes" : "No"}
									</span>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Historical Telemetry Charts */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
						<QueuedMessagesChart
							source={queue}
							availableRanges={QUEUE_CHART_RANGES}
							selectedRange={chartRange}
							onRangeChange={setChartRange}
							height={200}
						/>
						<MessageRatesChart
							stats={queue?.message_stats}
							availableRanges={QUEUE_CHART_RANGES}
							selectedRange={chartRange}
							onRangeChange={setChartRange}
							height={200}
						/>
					</div>

					{/* Tab Bar */}
					<div className="border-b border-border/60 shrink-0">
						<div className="flex items-center gap-0.5">
							{tabs.map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all duration-150 border-b-2 -mb-px cursor-pointer ${
										activeTab === tab.id
											? "border-primary text-primary"
											: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
									}`}
								>
									{tab.icon}
									{tab.label}
									{tab.id === "bindings" && bindings.length > 0 && (
										<span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-mono">
											{bindings.length}
										</span>
									)}
									{tab.id === "messages" && messages.length > 0 && (
										<span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-mono">
											{messages.length}
										</span>
									)}
								</button>
							))}
						</div>
					</div>

					{/* Tab Content */}
					<div
						className={cn(
							activeTab === "topology"
								? "flex-1 flex flex-col min-h-0 transition-none"
								: "animate-in fade-in duration-150",
						)}
					>
						{/* ── Messages Tab ── */}
						{activeTab === "messages" && (
							<Card className="border border-border/80">
								<CardHeader className="pb-3 border-b border-border/50">
									<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
										<div>
											<CardTitle className="text-base flex items-center gap-2">
												<FileCode className="h-4 w-4 text-primary" />
												Message Explorer
												<Badge variant="outline" className="font-mono text-xs">
													{messages.length} peeked
												</Badge>
											</CardTitle>
											<CardDescription className="text-xs">
												Inspect the first <i>N</i> messages currently buffered
												in the queue with non-destructive safe requeue.
											</CardDescription>
										</div>

										{/* Explorer Controls */}
										<div className="flex flex-wrap items-center gap-2">
											<div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
												<span>Mode:</span>
												<Dropdown<AckMode>
													value={peekAckMode}
													onChange={(v) => setPeekAckMode(v)}
													options={[
														{
															label: "Safe Peek (Requeue)",
															value: "ack_requeue_true",
														},
														{
															label: "Automatic Ack (Dequeue)",
															value: "ack_requeue_false",
														},
														{
															label: "Reject (Drop/DLQ)",
															value: "reject_requeue_false",
														},
													]}
													buttonClassName="h-7 px-2 text-[11px] font-mono"
												/>
											</div>

											<div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
												<span>Count:</span>
												<Dropdown<number>
													value={peekCount}
													onChange={(v) => setPeekCount(v)}
													options={[
														{ label: "5 msgs", value: 5 },
														{ label: "10 msgs", value: 10 },
														{ label: "25 msgs", value: 25 },
														{ label: "50 msgs", value: 50 },
														{ label: "100 msgs", value: 100 },
													]}
													buttonClassName="h-7 px-2 text-[11px] font-mono"
												/>
											</div>

											<Button
												variant="outline"
												size="sm"
												onClick={() => fetchMessages(peekCount, peekAckMode, true)}
												disabled={isFetchingMessages || (!canRead && !isPermissionsLoading)}
												className="h-7 text-xs font-mono"
												title={(!canRead && !isPermissionsLoading) ? "Read permission required to fetch messages" : undefined}
											>
												<RefreshCw
													className={`h-3 w-3 mr-1 ${isFetchingMessages ? "animate-spin" : ""}`}
												/>
												Fetch
											</Button>
										</div>
									</div>
								</CardHeader>

								<CardContent className="p-0">
									{messageAccessError || (!canRead && !isPermissionsLoading) ? (
										<div className="py-12 flex flex-col items-center justify-center text-center px-4">
											<div className="p-3 rounded-full bg-amber-500/10 text-amber-500 mb-3 border border-amber-500/20">
												<Lock className="h-6 w-6" />
											</div>
											<h3 className="text-sm font-semibold text-foreground">
												Message Inspection Restricted
											</h3>
											<p className="text-xs text-muted-foreground mt-1 max-w-md">
												You do not have read permissions to inspect or get messages from queue{" "}
												<span className="font-mono text-foreground font-medium">{queueName}</span> in virtual host{" "}
												<span className="font-mono text-foreground font-medium">{vhost}</span>.
											</p>
											<div className="mt-3 text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded border border-amber-500/20">
												{messageAccessError || "AMQP read permission required for this queue"}
											</div>
										</div>
									) : messages.length === 0 ? (
										<div className="py-12 text-center text-xs text-muted-foreground font-mono">
											{isFetchingMessages ? (
												<div className="flex items-center justify-center gap-2">
													<RefreshCw className="h-4 w-4 animate-spin text-primary" />
													Peeking messages from queue...
												</div>
											) : (
												"No messages in queue or queue is currently drained."
											)}
										</div>
									) : (
										<div className="overflow-x-auto">
											<Table>
												<TableHeader>
													<TableRow className="hover:bg-transparent">
														<TableHead className="w-12 text-[11px] font-mono">
															#
														</TableHead>
														<TableHead className="text-[11px]">
															Payload Snippet
														</TableHead>
														<TableHead className="text-[11px] font-mono">
															Routing Key
														</TableHead>
														<TableHead className="text-[11px] font-mono">
															Exchange
														</TableHead>
														<TableHead className="text-[11px] font-mono">
															Size
														</TableHead>
														<TableHead className="text-[11px]">
															Status
														</TableHead>
														<TableHead className="text-right text-[11px]" />
													</TableRow>
												</TableHeader>
												<TableBody>
													{messages.map((msg, idx) => {
														const hasXDeath = extractXDeathEntries(msg.properties?.headers).length > 0;
														return (
															<TableRow key={idx} className="hover:bg-muted/30">
																<TableCell className="font-mono text-xs text-muted-foreground">
																	{idx + 1}
																</TableCell>
																<TableCell className="max-w-md">
																	<div
																		onClick={() => setSelectedMessage(msg)}
																		className="cursor-pointer font-mono text-xs text-foreground/90 bg-muted/40 hover:bg-muted/70 px-2 py-1 rounded border border-border/40 truncate max-w-lg transition-colors flex items-center gap-1.5"
																		title="Click to inspect full payload"
																	>
																		{tryParseJson(msg.payload).isJson && (
																			<span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1 py-0.5 rounded flex-shrink-0">
																				JSON
																			</span>
																		)}
																		<span className="truncate">
																			{msg.payload}
																		</span>
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
																<TableCell>
																	<div className="flex flex-col gap-1 items-start">
																		{msg.redelivered ? (
																			<Badge
																				variant="outline"
																				className="text-[10px] border-amber-500/30 text-amber-500"
																			>
																				Redelivered
																			</Badge>
																		) : (
																			<Badge
																				variant="outline"
																				className="text-[10px] text-muted-foreground"
																			>
																				Fresh
																			</Badge>
																		)}
																		<XDeathBadge headers={msg.properties?.headers} />
																	</div>
																</TableCell>
																<TableCell className="text-right">
																	<div className="flex items-center justify-end gap-1">
																		<span
																			title={
																				hasXDeath
																					? "Replay this dead-lettered message"
																					: "Only dead-lettered messages can be replayed"
																			}
																			className="inline-flex"
																		>
																			<Button
																				variant="ghost"
																				size="sm"
																				disabled={!hasXDeath}
																				onClick={() => {
																					setSingleMessageToReplay(msg);
																					setShowDlqReplayDialog(true);
																				}}
																				className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
																			>
																				<RotateCcw className="h-3.5 w-3.5 mr-1" />
																				Replay
																			</Button>
																		</span>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => setSelectedMessage(msg)}
																		className="h-7 px-2 text-xs hover:text-primary"
																		title="Inspect message payload & properties"
																	>
																		<Eye className="h-3.5 w-3.5 mr-1" />
																		Inspect
																	</Button>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => handleDuplicateMessage(msg)}
																		className="h-7 px-2 text-xs hover:text-primary"
																		title="Clone and re-publish this message"
																	>
																		<CopyPlus className="h-3.5 w-3.5 mr-1 text-emerald-500" />
																		Duplicate
																	</Button>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() =>
																			copyToClipboard(msg.payload, idx)
																		}
																		className="h-7 w-7 p-0"
																		title="Copy payload"
																	>
																		{copiedMessageIndex === idx ? (
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
						)}

						{/* ── Topology Tab ── */}
						{activeTab === "topology" && (
							<Card className="flex-1 flex flex-col border-border bg-card/60 backdrop-blur-sm overflow-hidden min-h-[420px] transition-none">
								<CardHeader className="p-4 pb-2 border-b border-border/60 shrink-0">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Network className="h-4 w-4 text-primary" />
											<CardTitle className="text-base font-mono">
												Topology &amp; Inbound Routing Flow
											</CardTitle>
										</div>
										<span className="text-[11px] font-mono text-muted-foreground">
											{topologyNodes.length} Nodes &bull; {topologyEdges.length}{" "}
											Active Bindings
										</span>
									</div>
									<CardDescription className="text-xs">
										Visual topology map showing upstream exchanges routing into
										this queue and connected consumer listeners.
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

						{/* ── Publish Tab ── */}
						{activeTab === "publish" && (
							<Card
								id="publish-message-card"
								className="border border-border/80"
							>
								<CardHeader className="pb-3 border-b border-border/50">
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="text-base flex items-center gap-2">
												<Send className="h-4 w-4 text-primary" />
												Publish Message to Queue
											</CardTitle>
											<CardDescription className="text-xs">
												Inject a message directly into this queue via the
												default direct exchange.
											</CardDescription>
										</div>
										<div className="flex items-center gap-2">
											{pubSuccess && (
												<Badge
													variant="outline"
													className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono text-xs"
												>
													<CheckCircle2 className="h-3 w-3 mr-1" /> Queued!
												</Badge>
											)}
										</div>
									</div>
								</CardHeader>
								<CardContent className="p-4 space-y-3">
									{!canWrite && !isPermissionsLoading && (
										<div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400">
											<ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
											<span>Publishing restricted: You do not have write permission on this queue/virtual host.</span>
										</div>
									)}
									<form onSubmit={handlePublish} className="space-y-3">
										<PayloadEditor
											value={pubPayload}
											onChange={setPubPayload}
											label="Payload"
											rows={7}
											placeholder='{"message": "hello"}'
										/>

										<Button
											type="submit"
											disabled={isPublishing || !pubPayload.trim() || (!canWrite && !isPermissionsLoading)}
											className="w-full h-8 text-xs font-semibold"
										>
											{isPublishing ? (
												<>
													<RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />{" "}
													Publishing...
												</>
											) : (
												<>
													<Send className="h-3.5 w-3.5 mr-1.5" /> Publish
													Message
												</>
											)}
										</Button>
									</form>
								</CardContent>
							</Card>
						)}

						{/* ── Bindings Tab ── */}
						{activeTab === "bindings" && (
							<Card className="border border-border/80">
								<CardHeader className="pb-3 border-b border-border/50">
									<CardTitle className="text-base flex items-center gap-2">
										<LinkIcon className="h-4 w-4 text-primary" />
										Inbound Bindings
										<Badge variant="outline" className="font-mono text-xs">
											{bindings.length}
										</Badge>
									</CardTitle>
									<CardDescription className="text-xs">
										Upstream exchanges delivering messages into this queue based
										on routing rules.
									</CardDescription>
								</CardHeader>
								<CardContent className="p-4 space-y-4">
									{!canConfigure && !isPermissionsLoading && (
										<div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400">
											<ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
											<span>Binding management restricted: Configure permission required on this virtual host.</span>
										</div>
									)}

									{/* Bindings List */}
									<div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
										{bindings.length === 0 ? (
											<div className="text-xs text-muted-foreground font-mono py-4 text-center">
												No bindings configured for this queue.
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
															className="text-[10px] text-primary"
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

									{/* Add Binding Form */}
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
													className="h-8 rounded border border-border bg-muted/20 px-2 text-xs font-mono focus:border-primary focus:outline-none"
												/>
											</div>
											<Button
												type="submit"
												variant="outline"
												size="sm"
												disabled={isBinding || !bindExchange.trim()}
												className="h-8 text-xs font-mono cursor-pointer"
											>
												{isBinding ? (
													<>
														<RefreshCw className="h-3 w-3 mr-1 animate-spin" />{" "}
														Binding...
													</>
												) : (
													<>
														<LinkIcon className="h-3 w-3 mr-1" /> Create Binding
													</>
												)}
											</Button>
										</form>
									)}
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			)}

			{/* Message Inspection Modal */}
			{selectedMessage && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
					<div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-150">
						<div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
							<div className="flex items-center gap-2">
								<FileCode className="h-5 w-5 text-primary" />
								<h3 className="text-sm font-bold text-foreground font-mono">
									Message Inspection
								</h3>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSelectedMessage(null)}
								className="h-7 w-7 p-0 rounded-full"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>

						<div className="p-4 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
							{/* Properties Grid */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-muted/30 p-3 rounded-lg border border-border/50">
								<div>
									<span className="text-muted-foreground block text-[10px]">
										Exchange:
									</span>
									<span className="text-foreground">
										{selectedMessage.exchange || "(default)"}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground block text-[10px]">
										Routing Key:
									</span>
									<span className="text-primary">
										{selectedMessage.routing_key || "-"}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground block text-[10px]">
										Payload Size:
									</span>
									<span className="text-foreground">
										{formatBytes(selectedMessage.payload_bytes)}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground block text-[10px]">
										Redelivered:
									</span>
									<span
										className={
											selectedMessage.redelivered
												? "text-amber-500 font-semibold"
												: "text-foreground"
										}
									>
										{selectedMessage.redelivered ? "True" : "False"}
									</span>
								</div>
							</div>

							{/* AMQP Headers & Properties */}
							{selectedMessage.properties &&
								Object.keys(selectedMessage.properties).length > 0 && (
									<div className="space-y-1">
										<div className="flex items-center justify-between">
											<span className="text-xs font-semibold text-muted-foreground block">
												AMQP Properties &amp; Headers
											</span>
											<XDeathBadge headers={selectedMessage.properties?.headers} />
										</div>
										<div className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-black/50 border border-border/60 overflow-hidden">
											<JsonHighlighter
												content={JSON.stringify(
													selectedMessage.properties,
													null,
													2,
												)}
												showLineNumbers={false}
											/>
										</div>
									</div>
								)}

							{/* Message Payload */}
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-xs font-semibold text-muted-foreground block">
										Message Payload
									</span>
									<div className="flex items-center gap-1.5">
										{extractXDeathEntries(selectedMessage.properties?.headers).length > 0 && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													setSingleMessageToReplay(selectedMessage);
													setShowDlqReplayDialog(true);
													setSelectedMessage(null);
												}}
												className="h-6 text-[11px] px-2 text-rose-500 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
											>
												<RotateCcw className="h-3 w-3 mr-1" /> Replay Message
											</Button>
										)}
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												handleDuplicateMessage(selectedMessage);
												setSelectedMessage(null);
											}}
											className="h-6 text-[11px] px-2 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
										>
											<CopyPlus className="h-3 w-3 mr-1" /> Duplicate to Publisher
										</Button>
									</div>
								</div>
								<PayloadViewer
									payload={selectedMessage.payload}
									contentType={selectedMessage.properties?.content_type}
									maxHeight="max-h-80"
								/>
							</div>
						</div>

						<div className="p-3 border-t border-border bg-muted/20 flex justify-end">
							<Button
								size="sm"
								onClick={() => setSelectedMessage(null)}
								className="h-8 text-xs"
							>
								Close
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Purge Confirm Modal */}
			{showPurgeConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
					<Card className="max-w-md w-full border-amber-500/40 animate-in zoom-in-95 fade-in duration-150">
						<CardHeader className="pb-2">
							<CardTitle className="text-base text-amber-500 flex items-center gap-2">
								<AlertTriangle className="h-5 w-5" />
								Purge All Messages?
							</CardTitle>
							<CardDescription className="text-xs">
								This will immediately purge all{" "}
								<strong>{formatNumber(totalMessages)}</strong> messages
								currently buffered in queue{" "}
								<code className="font-mono text-foreground">{queueName}</code>.
								The queue declaration will remain intact.
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-4 flex justify-end gap-2">
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setShowPurgeConfirm(false)}
								className="h-8 text-xs"
							>
								Cancel
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={handlePurge}
								className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
							>
								Purge All Messages
							</Button>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Delete Confirm Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
					<Card className="max-w-md w-full border-destructive/40 animate-in zoom-in-95 fade-in duration-150">
						<CardHeader className="pb-2">
							<CardTitle className="text-base text-destructive flex items-center gap-2">
								<AlertTriangle className="h-5 w-5" />
								Delete Queue Permanently?
							</CardTitle>
							<CardDescription className="text-xs">
								Are you sure you want to delete queue{" "}
								<code className="font-mono text-foreground">{queueName}</code>?
								All unconsumed messages will be dropped and all inbound bindings
								destroyed. This action cannot be undone.
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-4 flex justify-end gap-2">
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setShowDeleteConfirm(false)}
								className="h-8 text-xs"
							>
								Cancel
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={handleDelete}
								className="h-8 text-xs"
							>
								Delete Queue
							</Button>
						</CardContent>
					</Card>
				</div>
			)}
			{/* Move Messages Modal */}
			{isShovelEnabled && (
				<MoveMessagesDialog
					isOpen={showMoveMessagesDialog}
					onClose={() => {
						setShowMoveMessagesDialog(false);
						refetchQueue();
					}}
					vhost={vhost}
					sourceQueue={queueName}
					totalMessages={readyMessages}
					queueType={queue?.type}
				/>
			)}

			{/* DLQ Replay Modal */}
			<DlqReplayDialog
				isOpen={showDlqReplayDialog}
				onClose={() => {
					setShowDlqReplayDialog(false);
					setSingleMessageToReplay(null);
					refetchQueue();
					fetchMessages();
				}}
				vhost={vhost}
				sourceQueue={queueName}
				totalMessages={readyMessages}
				peekedMessages={messages}
				singleMessage={singleMessageToReplay}
				onSuccess={() => {
					refetchQueue();
					fetchMessages();
				}}
			/>
		</>
	);
}
