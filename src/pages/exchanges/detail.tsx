import { Breadcrumbs } from "@/components/Breadcrumbs/index.tsx";
import { PayloadEditor } from "@/components/common/JsonViewer";
import { buildTopologyGraph, TopologyFlow } from "@/components/TopologyFlow";
import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { Dropdown, type DropdownOption } from "@/components/ui/dropdown/index.tsx";
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
import { MessageRatesChart } from "@/components/HistoricalCharts/index.ts";
import {
	QUEUE_CHART_RANGES,
	type ChartRangeOption,
} from "@/utilities/chart/telemetry.ts";
import { cn } from "@/utilities/cn/index.ts";
import { useAuth } from "@/hooks/useAuth/index.ts";
import { useResourcePermissions } from "@/hooks/usePermissions/index.ts";
import {
	useRabbitExchangeBindings,
	useRabbitExchangeDetail,
	useRabbitExchanges,
	useRabbitMutations,
	useRabbitQueues,
} from "@/hooks/useRabbitMQ/index.ts";
import {
	EXCHANGE_TYPE_DESCRIPTIONS,
	formatRate,
} from "@/services/rabbitmq/utils.ts";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ExternalLink,
	Info,
	Layers,
	Link as LinkIcon,
	Network,
	Plus,
	RefreshCw,
	Search,
	Send,
	Share2,
	ShieldAlert,
	Trash2,
	Unlink,
} from "lucide-react";
import * as React from "react";

type ExchangeTab = "topology" | "publish" | "bindings";

export const DEFAULT_EXCHANGE_TAB: ExchangeTab = "topology";
const EXCHANGE_TAB_IDS: ExchangeTab[] = ["topology", "bindings", "publish"];

export function ExchangeDetailPage() {
	const params = useParams({ strict: false }) as {
		vhost?: string;
		name?: string;
		tab?: string;
	};
	const navigate = useNavigate();

	// Decode URL encoded parameters
	const vhost = params.vhost ? decodeURIComponent(params.vhost) : "/";
	const rawName = params.name ? decodeURIComponent(params.name) : "";
	const exchangeName = rawName === "(default)" ? "" : rawName;

	const [chartRange, setChartRange] = React.useState<ChartRangeOption>(
		QUEUE_CHART_RANGES[2], // 1 hour default
	);

	const queryOptions = React.useMemo(
		() => ({
			msg_rates_age: chartRange.age,
			msg_rates_incr: chartRange.incr,
		}),
		[chartRange],
	);

	const { user } = useAuth();
	const permissions = useResourcePermissions({ vhost, exchangeName });
	const {
		hasVHostAccess,
		canConfigure,
		canWrite,
		isAdminWithoutVHostPerms,
		isLoading: isPermissionsLoading,
	} = permissions;

	const {
		data: exchange,
		isLoading: isExchangeLoading,
		error: exchangeError,
		refetch: refetchExchange,
	} = useRabbitExchangeDetail(vhost, exchangeName, queryOptions);

	const { data: bindingsData, refetch: refetchBindings } =
		useRabbitExchangeBindings(vhost, exchangeName);

	const { data: allQueues = [] } = useRabbitQueues(vhost);
	const { data: allExchanges = [] } = useRabbitExchanges(vhost);

	const { publishMessage, deleteExchange, createBinding, deleteBinding } =
		useRabbitMutations();

	// Generate Topology Graph for Exchange
	const { nodes: topologyNodes, edges: topologyEdges } = React.useMemo(() => {
		const allBindings = [
			...(bindingsData?.inbound || []),
			...(bindingsData?.outbound || []),
		];
		return buildTopologyGraph({
			exchanges: exchange ? [...allExchanges, exchange] : allExchanges,
			queues: allQueues,
			bindings: allBindings,
			vhost,
			focalType: "exchange",
			focalName: exchangeName,
			onNavigate: (path) => navigate({ to: path }),
		});
	}, [
		allExchanges,
		allQueues,
		bindingsData,
		exchange,
		exchangeName,
		vhost,
		navigate,
	]);

	// Test Publisher State
	const [pubRoutingKey, setPubRoutingKey] = React.useState("");
	const [pubPayload, setPubPayload] = React.useState(
		JSON.stringify(
			{ message: "Hello RabbitMQ!", timestamp: new Date().toISOString() },
			null,
			2,
		),
	);
	const [isPublishing, setIsPublishing] = React.useState(false);
	const [pubResult, setPubResult] = React.useState<{ routed: boolean } | null>(
		null,
	);

	// Bind Form State
	const [destType, setDestType] = React.useState<"queue" | "exchange">("queue");
	const [destName, setDestName] = React.useState("");
	const [bindRoutingKey, setBindRoutingKey] = React.useState("");
	const [isBinding, setIsBinding] = React.useState(false);
	const [isDestDropdownOpen, setIsDestDropdownOpen] = React.useState(false);
	const [destHighlightedIndex, setDestHighlightedIndex] = React.useState(-1);
	const destDropdownRef = React.useRef<HTMLDivElement>(null);
	const [bindingFilter, setBindingFilter] = React.useState("");
	const [bindingTypeFilter, setBindingTypeFilter] = React.useState<
		"all" | "queue" | "exchange"
	>("all");

	const availableExchanges = React.useMemo(
		() => allExchanges.filter((ex) => ex.name && ex.name !== exchangeName),
		[allExchanges, exchangeName],
	);

	const matchingDestItems = React.useMemo(() => {
		const query = destName.trim().toLowerCase();
		if (destType === "queue") {
			if (!query) return allQueues;
			return allQueues.filter((q) => q.name.toLowerCase().includes(query));
		} else {
			if (!query) return availableExchanges;
			return availableExchanges.filter((ex) =>
				ex.name.toLowerCase().includes(query),
			);
		}
	}, [destType, destName, allQueues, availableExchanges]);

	// Close destination suggestion dropdown on outside click
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				destDropdownRef.current &&
				!destDropdownRef.current.contains(event.target as Node)
			) {
				setIsDestDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const destOptions: DropdownOption<"queue" | "exchange">[] = React.useMemo(
		() => [
			{
				label: "To Queue",
				value: "queue",
				icon: <Layers className="h-3.5 w-3.5 text-blue-400" />,
				subLabel: `${allQueues.length} available`,
			},
			{
				label: "To Exchange",
				value: "exchange",
				icon: <Share2 className="h-3.5 w-3.5 text-purple-400" />,
				subLabel: `${availableExchanges.length} available`,
			},
		],
		[allQueues.length, availableExchanges.length],
	);

	// Filter bindings where this exchange is the source (outbound bindings)
	const outboundBindings = bindingsData?.outbound || [];
	const inboundBindings = bindingsData?.inbound || [];

	const queueBindingsCount = React.useMemo(
		() => outboundBindings.filter((b) => b.destination_type === "queue").length,
		[outboundBindings],
	);
	const exchangeBindingsCount = React.useMemo(
		() =>
			outboundBindings.filter((b) => b.destination_type === "exchange").length,
		[outboundBindings],
	);

	const filteredOutboundBindings = React.useMemo(() => {
		return outboundBindings.filter((b) => {
			if (
				bindingTypeFilter !== "all" &&
				b.destination_type !== bindingTypeFilter
			) {
				return false;
			}
			if (bindingFilter.trim()) {
				const q = bindingFilter.toLowerCase();
				return (
					b.destination.toLowerCase().includes(q) ||
					b.routing_key.toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [outboundBindings, bindingTypeFilter, bindingFilter]);

	// Delete Confirm Modal
	const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

	// Active tab, reflected in the URL as an optional trailing path segment
	const activeTab: ExchangeTab =
		params.tab && (EXCHANGE_TAB_IDS as string[]).includes(params.tab)
			? (params.tab as ExchangeTab)
			: DEFAULT_EXCHANGE_TAB;

	const setActiveTab = React.useCallback(
		(tab: ExchangeTab) => {
			navigate({
				to: "/exchanges/$vhost/$name/$tab",
				params: { vhost: params.vhost ?? "", name: params.name ?? "", tab },
				replace: true,
			});
		},
		[navigate, params.vhost, params.name],
	);

	// Publish Handler
	const handlePublish = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsPublishing(true);
		setPubResult(null);
		try {
			const res = await publishMessage.mutateAsync({
				vhost,
				exchange: exchangeName,
				data: {
					routing_key: pubRoutingKey.trim(),
					payload: pubPayload,
					payload_encoding: "string",
					properties: {
						delivery_mode: 2,
						content_type: "application/json",
						timestamp: Math.floor(Date.now() / 1000),
					},
				},
			});
			setPubResult({ routed: res.routed });
			setTimeout(() => setPubResult(null), 5000);
			refetchExchange();
		} catch (err: any) {
			toast.error("Failed to publish message", err.message || String(err));
		} finally {
			setIsPublishing(false);
		}
	};

	// Bind Handler
	const handleCreateBinding = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!destName.trim()) return;
		setIsBinding(true);
		try {
			await createBinding.mutateAsync({
				vhost,
				source: exchangeName,
				destination: destName.trim(),
				destinationType: destType,
				data: {
					routing_key: bindRoutingKey.trim(),
					arguments: {},
				},
			});
			toast.success(
				`Successfully bound ${destType} "${destName.trim()}" to this exchange`,
			);
			setDestName("");
			setBindRoutingKey("");
			setIsDestDropdownOpen(false);
			refetchBindings();
		} catch (err: any) {
			toast.error("Failed to create binding", err.message || String(err));
		} finally {
			setIsBinding(false);
		}
	};

	// Unbind Handler
	const handleDeleteBinding = async (
		destination: string,
		destinationType: "queue" | "exchange",
		propertiesKey: string,
	) => {
		try {
			await deleteBinding.mutateAsync({
				vhost,
				source: exchangeName,
				destination,
				destinationType,
				propertiesKey,
			});
			toast.success(`Removed binding to ${destinationType} "${destination}"`);
			refetchBindings();
		} catch (err: any) {
			toast.error("Failed to remove binding", err.message || String(err));
		}
	};

	// Unbind Inbound Handler
	const handleDeleteInboundBinding = async (
		source: string,
		propertiesKey: string,
	) => {
		try {
			await deleteBinding.mutateAsync({
				vhost,
				source,
				destination: exchangeName,
				destinationType: "exchange",
				propertiesKey,
			});
			toast.success(
				`Removed inbound binding from exchange "${source || "(AMQP default)"}"`,
			);
			refetchBindings();
		} catch (err: any) {
			toast.error("Failed to remove inbound binding", err.message || String(err));
		}
	};

	// Delete Exchange Handler
	const handleDelete = async () => {
		try {
			await deleteExchange.mutateAsync({ vhost, name: exchangeName });
			setShowDeleteConfirm(false);
			navigate({ to: "/exchanges" });
		} catch (err: any) {
			toast.error("Failed to delete exchange", err.message || String(err));
		}
	};

	if (isExchangeLoading && !exchange) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
				<RefreshCw className="h-6 w-6 animate-spin text-primary" />
				<div className="text-xs text-muted-foreground font-mono">
					Loading exchange {rawName}...
				</div>
			</div>
		);
	}

	if (!exchange) {
		const isAuthError =
			(exchangeError as any)?.status === 401 ||
			(exchangeError as any)?.status === 403;
		return (
			<div className="space-y-6">
				<Breadcrumbs className="shrink-0">
					<Link
						to="/exchanges"
						className="hover:text-foreground transition-colors"
					>
						Exchanges
					</Link>
					<ChevronRight className="h-3 w-3 text-muted-foreground/50" />
					<span className="text-foreground font-medium truncate max-w-xs">
						{rawName}
					</span>
				</Breadcrumbs>

				<Card className="border border-border/80">
					<CardContent className="py-16 flex flex-col items-center justify-center text-center px-4">
						<div className="p-3 rounded-full bg-amber-500/10 text-amber-500 mb-4 border border-amber-500/20">
							<ShieldAlert className="h-8 w-8" />
						</div>
						<h2 className="text-lg font-semibold text-foreground">
							{isAuthError ? "Access Denied" : "Exchange Not Found"}
						</h2>
						<p className="text-sm text-muted-foreground mt-1 max-w-md">
							{isAuthError
								? `You do not have permission to view exchange "${rawName}" in virtual host "${vhost}".`
								: `The exchange "${rawName}" could not be loaded.`}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-6"
							onClick={() => navigate({ to: "/exchanges" })}
						>
							Back to Exchanges
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const isDefaultExchange = exchangeName === "";
	const isSystemExchange = exchangeName.startsWith("amq.") || isDefaultExchange;
	const displayName = isDefaultExchange ? "(AMQP default)" : exchangeName;

	const msgInRate = exchange?.message_stats?.publish_in_details?.rate || 0;
	const msgOutRate = exchange?.message_stats?.publish_out_details?.rate || 0;

	return (
		<div
			className={cn(
				"space-y-6",
				activeTab === "topology" ? "flex-1 flex flex-col min-h-0" : "pb-16",
			)}
		>
			<Breadcrumbs className="shrink-0">
				<Link
					to="/exchanges"
					className="hover:text-foreground transition-colors"
				>
					Exchanges
				</Link>
				<ChevronRight className="h-3 w-3 text-muted-foreground/50" />
				<span className="text-foreground font-medium truncate max-w-xs">
					{displayName}
				</span>
			</Breadcrumbs>

			{/* Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4 shrink-0">
				<div>
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
							<Share2 className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
									{displayName}
								</h1>
								<Tooltip
									content={
										EXCHANGE_TYPE_DESCRIPTIONS[exchange?.type ?? "direct"] ??
										exchange?.type
									}
								>
									<Badge
										variant="outline"
										className={`text-[10px] uppercase font-mono font-semibold cursor-default ${
											exchange?.type === "topic"
												? "border-purple-500/30 text-purple-400 bg-purple-500/10"
												: exchange?.type === "fanout"
													? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
													: exchange?.type === "headers"
														? "border-amber-500/30 text-amber-400 bg-amber-500/10"
														: "border-sky-500/30 text-sky-400 bg-sky-500/10"
										}`}
									>
										{exchange?.type || "direct"}
									</Badge>
								</Tooltip>
								{isDefaultExchange && (
									<Badge
										variant="outline"
										className="text-[10px] border-border text-muted-foreground"
									>
										System Default
									</Badge>
								)}
							</div>
							<p className="text-xs text-muted-foreground">
								Durability:{" "}
								<span className="font-mono text-foreground/80">
									{exchange?.durable ? "Durable" : "Transient"}
								</span>
								{" • "}
								Auto-delete:{" "}
								<span className="font-mono text-foreground/80">
									{exchange?.auto_delete ? "Yes" : "No"}
								</span>
								{" • "}
								Internal:{" "}
								<span className="font-mono text-foreground/80">
									{exchange?.internal ? "Yes" : "No"}
								</span>
							</p>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							refetchExchange();
							refetchBindings();
						}}
						className="h-8 text-xs font-mono"
					>
						<RefreshCw className="h-3.5 w-3.5 mr-1.5" />
						Refresh
					</Button>

					<span
						title={
							isSystemExchange
								? "System exchanges cannot be deleted"
								: !canConfigure && !isPermissionsLoading
									? "Delete disabled: Configure permission required on this virtual host"
									: undefined
						}
						className="inline-flex"
					>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowDeleteConfirm(true)}
							disabled={isSystemExchange || (!canConfigure && !isPermissionsLoading)}
							className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 disabled:opacity-40"
						>
							<Trash2 className="h-3.5 w-3.5 mr-1" />
							Delete Exchange
						</Button>
					</span>
				</div>
			</div>

			{/* Limited VHost Access Banner */}
			{(!hasVHostAccess || isAdminWithoutVHostPerms) && !isPermissionsLoading && (
				<div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-700 dark:text-amber-400 shrink-0">
					<div className="flex items-start sm:items-center gap-2.5">
						<ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
						<div>
							<span className="font-semibold">Limited Access Notice:</span> You do not have permissions granted on virtual host{" "}
							<span className="font-mono font-bold text-foreground">{vhost}</span>. Exchange operations (publishing, configuring bindings) are restricted by RabbitMQ.
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

			{/* Metric Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Exchange Type
						</span>
						<div className="text-xl font-bold font-mono text-foreground uppercase">
							{exchange?.type || "direct"}
						</div>
						<div className="text-[11px] text-muted-foreground">
							{exchange?.type === "direct"
								? "Exact match on routing key"
								: exchange?.type === "topic"
									? "Wildcard matching (* and #)"
									: exchange?.type === "fanout"
										? "Broadcast to all bound queues"
										: "Header attributes match"}
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Message Ingress
						</span>
						<div className="text-2xl font-bold font-mono text-primary">
							{formatRate(msgInRate)}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							Incoming from producers
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Message Egress
						</span>
						<div className="text-2xl font-bold font-mono text-foreground">
							{formatRate(msgOutRate)}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							Routed to bound queues
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Outbound Bindings
						</span>
						<div className="text-2xl font-bold font-mono text-foreground">
							{outboundBindings.length}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							Connected endpoints
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Historical Message Rates Chart */}
			<div className="shrink-0">
				<MessageRatesChart
					title="Exchange throughput rates"
					stats={exchange?.message_stats}
					mode="exchange"
					availableRanges={QUEUE_CHART_RANGES}
					selectedRange={chartRange}
					onRangeChange={setChartRange}
					height={180}
				/>
			</div>

			{/* Tab Bar */}
			<div className="border-b border-border/60 shrink-0">
				<div className="flex items-center gap-0.5">
					{(
						[
							{
								id: "topology",
								label: "Topology & Wiring",
								icon: <Network className="h-3.5 w-3.5" />,
							},
							{
								id: "bindings",
								label: "Bindings",
								icon: <LinkIcon className="h-3.5 w-3.5" />,
							},
							{
								id: "publish",
								label: "Publish",
								icon: <Send className="h-3.5 w-3.5" />,
							},
						] as { id: ExchangeTab; label: string; icon: React.ReactNode }[]
					).map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all duration-150 border-b-2 -mb-px ${
								activeTab === tab.id
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
							}`}
						>
							{tab.icon}
							{tab.label}
							{tab.id === "bindings" && outboundBindings.length > 0 && (
								<span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-mono">
									{outboundBindings.length}
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
						: "animate-in fade-in duration-150 space-y-6",
				)}
			>
				{activeTab === "topology" && (
					<Card className="flex-1 flex flex-col border-border bg-card/60 backdrop-blur-sm overflow-hidden min-h-[420px] transition-none">
						<CardHeader className="p-4 pb-2 border-b border-border/60 shrink-0">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Network className="h-4 w-4 text-primary" />
									<CardTitle className="text-base font-mono">
										Topology & Routing Wiring
									</CardTitle>
								</div>
								<span className="text-[11px] font-mono text-muted-foreground">
									{topologyNodes.length} Nodes &bull; {topologyEdges.length}{" "}
									Active Bindings
								</span>
							</div>
							<CardDescription className="text-xs">
								Visual topology map showing upstream exchange sources and
								downstream queues/exchanges wired to this exchange.
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

				{activeTab === "bindings" && (
					<div className="space-y-6">
						{/* Outbound Bindings Card */}
						<Card className="border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
							<CardHeader className="pb-3 border-b border-border/50">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div className="space-y-1">
										<CardTitle className="text-base flex items-center gap-2">
											<div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
												<LinkIcon className="h-4 w-4" />
											</div>
											<span>Outbound Bindings</span>
											<Badge variant="outline" className="font-mono text-xs">
												{outboundBindings.length}
											</Badge>
											{outboundBindings.length > 0 && (
												<span className="text-xs text-muted-foreground font-mono font-normal">
													({queueBindingsCount}{" "}
													{queueBindingsCount === 1 ? "queue" : "queues"}
													{exchangeBindingsCount > 0 &&
														`, ${exchangeBindingsCount} ${
															exchangeBindingsCount === 1
																? "exchange"
																: "exchanges"
														}`}
													)
												</span>
											)}
										</CardTitle>
										<CardDescription className="text-xs">
											Destinations (queues or downstream exchanges) subscribed
											to receive messages from this exchange.
										</CardDescription>
									</div>

									{outboundBindings.length > 2 && (
										<div className="flex flex-wrap items-center gap-2">
											{queueBindingsCount > 0 && exchangeBindingsCount > 0 && (
												<div className="flex items-center gap-1 border border-border/60 rounded-md p-0.5 bg-muted/20">
													<button
														type="button"
														onClick={() => setBindingTypeFilter("all")}
														className={cn(
															"px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer",
															bindingTypeFilter === "all"
																? "bg-card text-foreground font-semibold shadow-xs"
																: "text-muted-foreground hover:text-foreground",
														)}
													>
														All ({outboundBindings.length})
													</button>
													<button
														type="button"
														onClick={() => setBindingTypeFilter("queue")}
														className={cn(
															"px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer",
															bindingTypeFilter === "queue"
																? "bg-card text-blue-400 font-semibold shadow-xs"
																: "text-muted-foreground hover:text-foreground",
														)}
													>
														Queues ({queueBindingsCount})
													</button>
													<button
														type="button"
														onClick={() => setBindingTypeFilter("exchange")}
														className={cn(
															"px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer",
															bindingTypeFilter === "exchange"
																? "bg-card text-purple-400 font-semibold shadow-xs"
																: "text-muted-foreground hover:text-foreground",
														)}
													>
														Exchanges ({exchangeBindingsCount})
													</button>
												</div>
											)}

											<div className="relative">
												<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
												<input
													type="text"
													placeholder="Search bindings..."
													value={bindingFilter}
													onChange={(e) => setBindingFilter(e.target.value)}
													className="h-8 w-44 sm:w-52 rounded-md border border-border/70 bg-background/60 pl-8 pr-2.5 text-xs font-mono focus:border-primary focus:outline-none placeholder:text-muted-foreground/60 transition-colors"
												/>
											</div>
										</div>
									)}
								</div>
							</CardHeader>
							<CardContent className="p-0">
								{/* Bindings List / Table */}
								{outboundBindings.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-10 px-4 text-center">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30 border border-border/60 text-muted-foreground/60 mb-3">
											<LinkIcon className="h-6 w-6 stroke-1 text-muted-foreground" />
										</div>
										<h4 className="text-sm font-semibold text-foreground mb-1">
											No Outbound Bindings Configured
										</h4>
										<p className="text-xs text-muted-foreground max-w-md mb-2">
											Messages published to{" "}
											<span className="font-mono text-foreground font-medium">
												{displayName}
											</span>{" "}
											will not route anywhere until a destination queue or
											exchange is bound.
										</p>
										<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-mono bg-muted/20 px-3 py-1 rounded-md border border-border/40">
											<Info className="h-3.5 w-3.5 text-primary shrink-0" />
											<span>
												Use the form below to wire this exchange to a
												destination.
											</span>
										</div>
									</div>
								) : filteredOutboundBindings.length === 0 ? (
									<div className="py-10 text-center text-xs text-muted-foreground font-mono space-y-1.5">
										<div>No bindings match filter "{bindingFilter}".</div>
										<button
											type="button"
											onClick={() => {
												setBindingFilter("");
												setBindingTypeFilter("all");
											}}
											className="text-primary hover:underline cursor-pointer"
										>
											Clear filters
										</button>
									</div>
								) : (
									<div className="overflow-x-auto">
										<Table>
											<TableHeader>
												<TableRow className="border-border/60 hover:bg-transparent">
													<TableHead className="w-32 text-xs font-semibold">
														Type
													</TableHead>
													<TableHead className="text-xs font-semibold">
														Destination
													</TableHead>
													<TableHead className="text-xs font-semibold">
														Routing Key
													</TableHead>
													<TableHead className="text-xs font-semibold">
														Arguments
													</TableHead>
													<TableHead className="w-16 text-right text-xs font-semibold">
														Actions
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredOutboundBindings.map((b, idx) => (
													<TableRow
														key={`${b.destination_type}-${b.destination}-${b.properties_key || idx}`}
														className="border-border/40 hover:bg-muted/30 transition-colors"
													>
														<TableCell className="py-2.5">
															{b.destination_type === "queue" ? (
																<Badge
																	variant="outline"
																	className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px] font-mono gap-1.5 py-0.5"
																>
																	<Layers className="h-3 w-3" />
																	Queue
																</Badge>
															) : (
																<Badge
																	variant="outline"
																	className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px] font-mono gap-1.5 py-0.5"
																>
																	<Share2 className="h-3 w-3" />
																	Exchange
																</Badge>
															)}
														</TableCell>
														<TableCell className="py-2.5 font-mono text-xs">
															<Link
																to={
																	b.destination_type === "queue"
																		? "/queues/$vhost/$name"
																		: "/exchanges/$vhost/$name"
																}
																params={{
																	vhost: encodeURIComponent(vhost),
																	name: encodeURIComponent(b.destination),
																}}
																className="font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group cursor-pointer"
															>
																<span className="truncate max-w-xs">
																	{b.destination}
																</span>
																<ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity shrink-0" />
															</Link>
														</TableCell>
														<TableCell className="py-2.5 font-mono text-xs">
															{b.routing_key ? (
																<code className="px-2 py-0.5 rounded bg-muted/60 border border-border/60 text-xs font-mono text-primary font-semibold select-all">
																	{b.routing_key}
																</code>
															) : (
																<span className="text-muted-foreground/50 italic text-xs">
																	(empty / match-all)
																</span>
															)}
														</TableCell>
														<TableCell className="py-2.5 font-mono text-xs">
															{b.arguments &&
															Object.keys(b.arguments).length > 0 ? (
																<div className="flex flex-wrap gap-1 max-w-xs">
																	{Object.entries(b.arguments).map(
																		([k, v]) => (
																			<Badge
																				key={k}
																				variant="outline"
																				className="text-[10px] font-mono border-border/60 bg-muted/20"
																			>
																				<span className="text-muted-foreground">
																					{k}:
																				</span>{" "}
																				{String(v)}
																			</Badge>
																		),
																	)}
																</div>
															) : (
																<span className="text-muted-foreground/40 text-xs">
																	-
																</span>
															)}
														</TableCell>
														<TableCell className="py-2.5 text-right">
															<Tooltip
																content={`Unbind ${b.destination_type} "${b.destination}"`}
															>
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		handleDeleteBinding(
																			b.destination,
																			b.destination_type,
																			b.properties_key,
																		)
																	}
																	className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
																>
																	<Unlink className="h-3.5 w-3.5" />
																</Button>
															</Tooltip>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}

								{!canConfigure && !isPermissionsLoading && (
									<div className="border-t border-border/50 bg-muted/10 p-4 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400">
										<ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
										<span>Binding management restricted: Configure permission required on this virtual host.</span>
									</div>
								)}

								{/* Add Binding Form Section */}
								{canConfigure && (
									<div className="border-t border-border/50 bg-muted/10 p-4 sm:p-5 space-y-4">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2.5">
												<div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
													<Plus className="h-3.5 w-3.5" />
												</div>
												<div>
													<h4 className="text-xs font-semibold text-foreground">
														Add Outbound Binding
													</h4>
												<p className="text-[11px] text-muted-foreground">
													Wire messages from this exchange to a destination queue or exchange
												</p>
											</div>
										</div>

										<Badge
											variant="outline"
											className="text-[10px] font-mono text-muted-foreground hidden sm:inline-flex"
										>
											Type: {exchange?.type || "direct"}
										</Badge>
									</div>

									<form onSubmit={handleCreateBinding} className="space-y-3">
										<div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
											{/* Destination Type Dropdown */}
											<div className="sm:col-span-3 space-y-1.5">
												<label className="text-[11px] font-medium text-muted-foreground block">
													Destination Type
												</label>
												<Dropdown<"queue" | "exchange">
													value={destType}
													options={destOptions}
													onChange={(val) => {
														setDestType(val);
														setDestName("");
														setIsDestDropdownOpen(false);
														setDestHighlightedIndex(-1);
													}}
													align="left"
													className="w-full"
													buttonClassName="w-full justify-between h-9 text-xs font-mono bg-background border-border/80 hover:bg-muted/40 transition-colors"
													contentClassName="w-full font-mono text-xs"
												/>
											</div>

											{/* Destination Name with Custom Suggestion Dropdown Popover */}
											<div className="sm:col-span-4 space-y-1.5" ref={destDropdownRef}>
												<label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
													<span>
														Destination {destType === "queue" ? "Queue" : "Exchange"}
													</span>
													<span className="text-[10px] text-muted-foreground/60 font-mono">
														{destType === "queue"
															? `${allQueues.length} available`
															: `${availableExchanges.length} available`}
													</span>
												</label>
												<div className="relative">
													<input
														type="text"
														required
														value={destName}
														onFocus={() => setIsDestDropdownOpen(true)}
														onKeyDown={(e) => {
															if (!isDestDropdownOpen) {
																if (e.key === "ArrowDown" || e.key === "ArrowUp") {
																	e.preventDefault();
																	setIsDestDropdownOpen(true);
																}
																return;
															}

															if (e.key === "Escape") {
																e.preventDefault();
																setIsDestDropdownOpen(false);
															} else if (e.key === "ArrowDown") {
																e.preventDefault();
																setDestHighlightedIndex((prev) =>
																	matchingDestItems.length === 0
																		? -1
																		: prev < matchingDestItems.length - 1
																			? prev + 1
																			: 0,
																);
															} else if (e.key === "ArrowUp") {
																e.preventDefault();
																setDestHighlightedIndex((prev) =>
																	matchingDestItems.length === 0
																		? -1
																		: prev > 0
																			? prev - 1
																			: matchingDestItems.length - 1,
																);
															} else if (
																e.key === "Enter" &&
																destHighlightedIndex >= 0 &&
																destHighlightedIndex < matchingDestItems.length
															) {
																e.preventDefault();
																setDestName(matchingDestItems[destHighlightedIndex].name);
																setIsDestDropdownOpen(false);
															}
														}}
														onChange={(e) => {
															setDestName(e.target.value);
															setIsDestDropdownOpen(true);
															setDestHighlightedIndex(-1);
														}}
														placeholder={
															destType === "queue"
																? "Search known queues or enter name..."
																: "Search known exchanges or enter name..."
														}
														className="h-9 w-full rounded-md border border-border/80 bg-background pl-3 pr-8 text-xs font-mono text-foreground focus:border-primary focus:outline-none placeholder:text-muted-foreground/60 transition-colors"
													/>
													<button
														type="button"
														onClick={() => setIsDestDropdownOpen((prev) => !prev)}
														tabIndex={-1}
														className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
														title="Toggle suggestions"
													>
														<ChevronDown
															className={`h-3.5 w-3.5 transition-transform duration-150 ${
																isDestDropdownOpen ? "rotate-180" : ""
															}`}
														/>
													</button>

													{/* Suggestion Dropdown Popover */}
													{isDestDropdownOpen && matchingDestItems.length > 0 && (
														<div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-52 overflow-y-auto scrollbar-thin rounded-md border border-border bg-popover text-popover-foreground shadow-xl animate-in fade-in-50 zoom-in-95 duration-100">
															<div className="p-1 text-[10px] uppercase font-mono text-muted-foreground px-2.5 pt-1.5 pb-1 border-b border-border/40">
																Known {destType === "queue" ? "Queues" : "Exchanges"} in {vhost} ({matchingDestItems.length})
															</div>
															{matchingDestItems.map((item, idx) => {
																const isSelected = destName === item.name;
																const isHighlighted = destHighlightedIndex === idx;
																return (
																	<button
																		key={item.name}
																		type="button"
																		onMouseDown={(e) => {
																			// Prevent input blur before click registers
																			e.preventDefault();
																		}}
																		onClick={() => {
																			setDestName(item.name);
																			setIsDestDropdownOpen(false);
																		}}
																		onMouseEnter={() => setDestHighlightedIndex(idx)}
																		className={cn(
																			"w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-mono transition-colors cursor-pointer",
																			isSelected
																				? "bg-primary/15 text-primary font-semibold"
																				: isHighlighted
																					? "bg-muted text-foreground"
																					: "text-foreground hover:bg-muted/70",
																		)}
																	>
																		<div className="flex items-center gap-1.5 truncate">
																			{destType === "queue" ? (
																				<Layers className="h-3 w-3 text-muted-foreground shrink-0" />
																			) : (
																				<Share2 className="h-3 w-3 text-muted-foreground shrink-0" />
																			)}
																			<span className="truncate">{item.name}</span>
																		</div>
																		<span className="text-[10px] text-muted-foreground shrink-0 ml-2">
																			{destType === "queue"
																				? `${(item as any).messages_ready ?? (item as any).messages ?? 0} ready`
																				: (item as any).type}
																		</span>
																	</button>
																);
															})}
														</div>
													)}
												</div>
											</div>

											{/* Routing Key */}
											<div className="sm:col-span-3 space-y-1.5">
												<label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
													<span>Routing Key</span>
													<span className="text-[10px] text-muted-foreground/60 italic">
														{exchange?.type === "fanout"
															? "ignored"
															: exchange?.type === "topic"
																? "pattern"
																: "optional"}
													</span>
												</label>
												<input
													type="text"
													value={bindRoutingKey}
													onChange={(e) => setBindRoutingKey(e.target.value)}
													placeholder={
														exchange?.type === "topic"
															? "e.g. order.* or #"
															: exchange?.type === "fanout"
																? "(ignored by fanout)"
																: "e.g. order.created"
													}
													className="h-9 w-full rounded-md border border-border/80 bg-background px-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none placeholder:text-muted-foreground/60 transition-colors"
												/>
											</div>

											{/* Submit Button */}
											<div className="sm:col-span-2">
												<Button
													type="submit"
													disabled={isBinding || !destName.trim()}
													className="w-full h-9 text-xs font-medium gap-1.5 cursor-pointer shadow-xs"
												>
													{isBinding ? (
														<>
															<RefreshCw className="h-3.5 w-3.5 animate-spin" />
															Binding...
														</>
													) : (
														<>
															<Plus className="h-3.5 w-3.5" />
															Bind
														</>
													)}
												</Button>
											</div>
										</div>

										<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-mono">
											<Info className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
											<span>
												{exchange?.type === "topic"
													? "Topic exchanges route by pattern matching. You can use '*' (one word) and '#' (zero or more words) in routing keys."
													: exchange?.type === "fanout"
														? "Fanout exchanges broadcast every message to all bound destinations, ignoring any routing key specified."
														: exchange?.type === "headers"
															? "Headers exchanges route based on message header attributes rather than the routing key."
															: "Direct exchanges route messages whose routing key exactly matches the binding routing key."}
											</span>
										</div>
									</form>
								</div>
							)}
						</CardContent>
						</Card>

						{/* Inbound Bindings Card (when exchange is destination of other exchanges) */}
						{inboundBindings.length > 0 && (
							<Card className="border border-border/80 bg-card/60 backdrop-blur-xs shadow-xs">
								<CardHeader className="pb-3 border-b border-border/50">
									<div className="flex items-center justify-between">
										<div className="space-y-1">
											<CardTitle className="text-base flex items-center gap-2">
												<div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
													<Share2 className="h-4 w-4" />
												</div>
												<span>Inbound Bindings</span>
												<Badge variant="outline" className="font-mono text-xs">
													{inboundBindings.length}
												</Badge>
											</CardTitle>
											<CardDescription className="text-xs">
												Upstream exchanges delivering messages into this exchange (exchange-to-exchange bindings).
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="p-0">
									<div className="overflow-x-auto">
										<Table>
											<TableHeader>
												<TableRow className="border-border/60 hover:bg-transparent">
													<TableHead className="w-32 text-xs font-semibold">
														Source Type
													</TableHead>
													<TableHead className="text-xs font-semibold">
														Source Exchange
													</TableHead>
													<TableHead className="text-xs font-semibold">
														Routing Key
													</TableHead>
													<TableHead className="text-xs font-semibold">
														Arguments
													</TableHead>
													<TableHead className="w-16 text-right text-xs font-semibold">
														Actions
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{inboundBindings.map((b, idx) => (
													<TableRow
														key={`${b.source}-${b.properties_key || idx}`}
														className="border-border/40 hover:bg-muted/30 transition-colors"
													>
														<TableCell className="py-2.5">
															<Badge
																variant="outline"
																className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px] font-mono gap-1.5 py-0.5"
															>
																<Share2 className="h-3 w-3" />
																Exchange
															</Badge>
														</TableCell>
														<TableCell className="py-2.5 font-mono text-xs">
															<Link
																to="/exchanges/$vhost/$name"
																params={{
																	vhost: encodeURIComponent(vhost),
																	name: encodeURIComponent(
																		b.source || "(default)",
																	),
																}}
																className="font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group cursor-pointer"
															>
																<span>{b.source || "(AMQP default)"}</span>
																<ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity shrink-0" />
															</Link>
														</TableCell>
														<TableCell className="py-2.5 font-mono text-xs">
															{b.routing_key ? (
																<code className="px-2 py-0.5 rounded bg-muted/60 border border-border/60 text-xs font-mono text-primary font-semibold select-all">
																	{b.routing_key}
																</code>
															) : (
																<span className="text-muted-foreground/50 italic text-xs">
																	(empty / match-all)
																</span>
															)}
														</TableCell>
														<TableCell className="py-2.5 font-mono text-xs">
															{b.arguments &&
															Object.keys(b.arguments).length > 0 ? (
																<div className="flex flex-wrap gap-1 max-w-xs">
																	{Object.entries(b.arguments).map(
																		([k, v]) => (
																			<Badge
																				key={k}
																				variant="outline"
																				className="text-[10px] font-mono border-border/60 bg-muted/20"
																			>
																				<span className="text-muted-foreground">
																					{k}:
																				</span>{" "}
																				{String(v)}
																			</Badge>
																		),
																	)}
																</div>
															) : (
																<span className="text-muted-foreground/40 text-xs">
																	-
																</span>
															)}
														</TableCell>
														<TableCell className="py-2.5 text-right">
															<Tooltip
																content={`Unbind upstream exchange "${b.source || "(AMQP default)"}"`}
															>
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		handleDeleteInboundBinding(
																			b.source,
																			b.properties_key,
																		)
																	}
																	className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
																>
																	<Unlink className="h-3.5 w-3.5" />
																</Button>
															</Tooltip>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				)}

				{activeTab === "publish" && (
					<Card className="border border-border/80">
						<CardHeader className="pb-3 border-b border-border/50">
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="text-base flex items-center gap-2">
										<Send className="h-4 w-4 text-primary" />
										Publish
									</CardTitle>
									<CardDescription className="text-xs">
										Publish a message directly to this exchange with a routing
										key.
									</CardDescription>
								</div>

								<div className="flex items-center gap-2">
									{pubResult && (
										<Badge
											variant="outline"
											className={`font-mono text-xs ${
												pubResult.routed
													? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
													: "border-amber-500/30 text-amber-400 bg-amber-500/10"
											}`}
										>
											{pubResult.routed ? (
												<>
													<CheckCircle2 className="h-3 w-3 mr-1" /> Routed to
													Queue(s)
												</>
											) : (
												<>
													<AlertCircle className="h-3 w-3 mr-1" /> Unroutable /
													Dropped
												</>
											)}
										</Badge>
									)}
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-4 space-y-3">
							{!canWrite && !isPermissionsLoading && (
								<div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400">
									<ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
									<span>Publishing restricted: You do not have write permission on this exchange/virtual host.</span>
								</div>
							)}
							<form onSubmit={handlePublish} className="space-y-3">
								<div className="space-y-1">
									<label className="text-xs font-medium text-muted-foreground">
										Routing Key
									</label>
									<input
										type="text"
										value={pubRoutingKey}
										onChange={(e) => setPubRoutingKey(e.target.value)}
										placeholder="e.g. order.created or leave empty"
										className="h-8 w-full rounded border border-border bg-muted/20 px-2.5 text-xs font-mono focus:border-primary focus:outline-none"
									/>
								</div>

								<PayloadEditor
									value={pubPayload}
									onChange={setPubPayload}
									label="Payload"
									rows={16}
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
											<Send className="h-3.5 w-3.5 mr-1.5" /> Publish Message
										</>
									)}
								</Button>
							</form>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Delete Exchange Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
					<Card className="max-w-md w-full border-destructive/40 animate-in zoom-in-95 fade-in duration-150">
						<CardHeader className="pb-2">
							<CardTitle className="text-base text-destructive flex items-center gap-2">
								<AlertTriangle className="h-5 w-5" />
								Delete Exchange Permanently?
							</CardTitle>
							<CardDescription className="text-xs">
								Are you sure you want to delete exchange{" "}
								<code className="font-mono text-foreground">{displayName}</code>
								? All associated bindings will be removed. This action cannot be
								undone.
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
								Delete Exchange
							</Button>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
