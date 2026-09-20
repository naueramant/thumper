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
import { toast } from "@/components/ui/toast/index.tsx";
import { Tooltip } from "@/components/ui/tooltip/index.tsx";
import {
	useRabbitExchangeBindings,
	useRabbitExchangeDetail,
	useRabbitExchanges,
	useRabbitMutations,
	useRabbitQueues,
} from "@/hooks/useRabbitMQ/index.ts";
import { EXCHANGE_TYPE_DESCRIPTIONS, formatRate } from "@/services/rabbitmq/utils.ts";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	ChevronRight,
	Link as LinkIcon,
	Network,
	RefreshCw,
	Send,
	Share2,
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

	const {
		data: exchange,
		isLoading: isExchangeLoading,
		refetch: refetchExchange,
	} = useRabbitExchangeDetail(vhost, exchangeName);

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
			setDestName("");
			setBindRoutingKey("");
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
			refetchBindings();
		} catch (err: any) {
			toast.error("Failed to remove binding", err.message || String(err));
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

	const isDefaultExchange = exchangeName === "";
	const isSystemExchange = exchangeName.startsWith("amq.") || isDefaultExchange;
	const displayName = isDefaultExchange ? "(AMQP default)" : exchangeName;

	const msgInRate = exchange?.message_stats?.publish_in_details?.rate || 0;
	const msgOutRate = exchange?.message_stats?.publish_out_details?.rate || 0;

	// Filter bindings where this exchange is the source (outbound bindings)
	const outboundBindings = bindingsData?.outbound || [];

	return (
		<div className="space-y-6 pb-16">
			<Breadcrumbs>
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
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
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

					{!isSystemExchange && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowDeleteConfirm(true)}
							className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
						>
							<Trash2 className="h-3.5 w-3.5 mr-1" />
							Delete Exchange
						</Button>
					)}
				</div>
			</div>

			{/* Metric Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

			{/* Tab Bar */}
			<div className="border-b border-border/60">
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
			<div className="animate-in fade-in duration-150 space-y-6">
				{activeTab === "topology" && (
					<Card className="border-border bg-card/60 backdrop-blur-sm overflow-hidden">
						<CardHeader className="p-4 pb-2 border-b border-border/60">
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
						<CardContent className="p-0">
							<TopologyFlow
								nodes={topologyNodes}
								edges={topologyEdges}
								height="420px"
								showMinimap={false}
								className="rounded-t-none border-0"
							/>
						</CardContent>
					</Card>
				)}

				{activeTab === "bindings" && (
					<Card className="border border-border/80">
						<CardHeader className="pb-3 border-b border-border/50">
							<CardTitle className="text-base flex items-center gap-2">
								<LinkIcon className="h-4 w-4 text-primary" />
								Outbound Bindings
								<Badge variant="outline" className="font-mono text-xs">
									{outboundBindings.length}
								</Badge>
							</CardTitle>
							<CardDescription className="text-xs">
								Destinations (queues or exchanges) subscribed to receive
								messages from this exchange.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-4 space-y-4">
							{/* Bindings List */}
							<div className="space-y-2 max-h-96 overflow-y-auto">
								{outboundBindings.length === 0 ? (
									<div className="text-xs text-muted-foreground font-mono py-6 text-center">
										No outbound bindings configured for this exchange.
									</div>
								) : (
									outboundBindings.map((b, idx) => (
										<div
											key={idx}
											className="flex items-center justify-between p-2 rounded border border-border/60 bg-muted/20 text-xs font-mono"
										>
											<div className="flex items-center gap-2 truncate">
												<span className="text-muted-foreground">→</span>
												<Badge
													variant="outline"
													className="text-[10px] uppercase font-mono px-1 py-0"
												>
													{b.destination_type}
												</Badge>
												<span className="font-semibold text-foreground">
													{b.destination}
												</span>
												<span className="text-muted-foreground">key:</span>
												<Badge
													variant="outline"
													className="text-[10px] text-primary"
												>
													{b.routing_key || "(empty)"}
												</Badge>
											</div>

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
												className="h-6 px-1.5 text-destructive hover:bg-destructive/10"
												title="Remove binding"
											>
												<Unlink className="h-3.5 w-3.5" />
											</Button>
										</div>
									))
								)}
							</div>

							{/* Add Binding Form */}
							<form
								onSubmit={handleCreateBinding}
								className="pt-3 border-t border-border/50 space-y-2"
							>
								<span className="text-xs font-semibold text-foreground block">
									Add Outbound Binding
								</span>
								<div className="grid grid-cols-3 gap-2">
									<select
										value={destType}
										onChange={(e) =>
											setDestType(e.target.value as "queue" | "exchange")
										}
										className="h-8 rounded border border-border bg-muted/20 px-2 text-xs font-mono focus:border-primary focus:outline-none"
									>
										<option value="queue">To Queue</option>
										<option value="exchange">To Exchange</option>
									</select>

									<input
										type="text"
										required
										value={destName}
										onChange={(e) => setDestName(e.target.value)}
										placeholder={`${destType} name`}
										className="h-8 rounded border border-border bg-muted/20 px-2 text-xs font-mono focus:border-primary focus:outline-none"
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
									disabled={isBinding || !destName.trim()}
									className="w-full h-8 text-xs font-mono"
								>
									{isBinding ? "Binding..." : "+ Bind Destination"}
								</Button>
							</form>
						</CardContent>
					</Card>
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
										placeholder="e.g. order.created or leave empty"
										className="h-8 w-full rounded border border-border bg-muted/20 px-2.5 text-xs font-mono focus:border-primary focus:outline-none"
									/>
								</div>

								<PayloadEditor
									value={pubPayload}
									onChange={setPubPayload}
									label="Payload (JSON or Raw Text)"
									rows={16}
									placeholder='{"message": "hello"}'
								/>

								<Button
									type="submit"
									disabled={isPublishing || !pubPayload.trim()}
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
								variant="outline"
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

