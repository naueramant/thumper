import { useConfirm } from "@/components/ConfirmDialog/index.tsx";
import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { Checkbox } from "@/components/ui/checkbox/index.tsx";
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
	useRabbitDynamicShovels,
	useRabbitExchanges,
	useRabbitMutations,
	useRabbitQueues,
	useRabbitShovelPlugin,
	useRabbitShovelStatuses,
	useRabbitVHosts,
} from "@/hooks/useRabbitMQ/index.ts";
import { useVHost } from "@/hooks/useVHost/index.ts";
import type {
	DynamicShovelDefinition,
	ShovelAckMode,
	ShovelProtocol,
	ShovelStatus,
} from "@/services/rabbitmq/types/shovel.ts";
import { formatNumber } from "@/services/rabbitmq/utils.ts";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	Copy,
	Eye,
	Layers,
	Plus,
	RefreshCw,
	RotateCw,
	Search,
	Share2,
	Shovel,
	Terminal,
	Trash2,
	X,
} from "lucide-react";
import * as React from "react";

export function ShovelsPage() {
	const { selectedVHost } = useVHost();
	const confirm = useConfirm();

	// Check if shovel plugin is enabled
	const {
		data: isPluginEnabled,
		isLoading: isCheckingPlugin,
		refetch: refetchPlugin,
	} = useRabbitShovelPlugin();

	const activeVHostParam = selectedVHost === "all" ? undefined : selectedVHost;

	// Live status query
	const {
		data: shovelStatuses = [],
		refetch: refetchStatuses,
		isFetching: isFetchingStatuses,
	} = useRabbitShovelStatuses(activeVHostParam);

	// Dynamic shovel definitions query
	const { data: dynamicShovels = [], refetch: refetchDynamics } =
		useRabbitDynamicShovels(activeVHostParam);

	const { data: vhosts = [] } = useRabbitVHosts();
	const { createShovel, deleteShovel, restartShovel } = useRabbitMutations();

	// UI State
	const [activeTab, setActiveTab] = React.useState<"status" | "configs">(
		"status",
	);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [stateFilter, setStateFilter] = React.useState<string>("all");

	// Add Shovel Modal State
	const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
	const [formVHost, setFormVHost] = React.useState("/");
	const [formName, setFormName] = React.useState("");
	const [formSrcProtocol, setFormSrcProtocol] =
		React.useState<ShovelProtocol>("amqp091");
	const [formSrcUri, setFormSrcUri] = React.useState("amqp://");
	const [formSrcEndpointType, setFormSrcEndpointType] = React.useState<
		"queue" | "exchange"
	>("queue");
	const [formSrcQueue, setFormSrcQueue] = React.useState("");
	const [formSrcExchange, setFormSrcExchange] = React.useState("");
	const [formSrcExchangeKey, setFormSrcExchangeKey] = React.useState("");
	const [formSrcPrefetch, setFormSrcPrefetch] = React.useState(1000);
	const [formSrcDeleteAfter, setFormSrcDeleteAfter] = React.useState<
		"never" | "queue-length" | "count"
	>("never");
	const [formSrcDeleteCount, setFormSrcDeleteCount] = React.useState(100);

	const [formDestProtocol, setFormDestProtocol] =
		React.useState<ShovelProtocol>("amqp091");
	const [formDestUri, setFormDestUri] = React.useState("amqp://");
	const [formDestEndpointType, setFormDestEndpointType] = React.useState<
		"queue" | "exchange"
	>("queue");
	const [formDestQueue, setFormDestQueue] = React.useState("");
	const [formDestExchange, setFormDestExchange] = React.useState("");
	const [formDestExchangeKey, setFormDestExchangeKey] = React.useState("");
	const [formDestAddHeaders, setFormDestAddHeaders] = React.useState(false);

	const [formAckMode, setFormAckMode] =
		React.useState<ShovelAckMode>("on-confirm");
	const [formReconnectDelay, setFormReconnectDelay] = React.useState(1);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	// Detail inspection modal state
	const [selectedStatus, setSelectedStatus] =
		React.useState<ShovelStatus | null>(null);

	// Available queues & exchanges in the selected vhost for autocompletion
	const { data: vhostQueues = [] } = useRabbitQueues(formVHost);
	const { data: vhostExchanges = [] } = useRabbitExchanges(formVHost);

	// Sync form vhost when global vhost changes
	React.useEffect(() => {
		if (selectedVHost && selectedVHost !== "all") {
			setFormVHost(selectedVHost);
		} else if (vhosts.length > 0) {
			setFormVHost(vhosts[0].name);
		}
	}, [selectedVHost, vhosts]);

	// Filtered statuses
	const filteredStatuses = React.useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		return shovelStatuses.filter((s) => {
			const matchesSearch =
				!q ||
				s.name.toLowerCase().includes(q) ||
				s.vhost.toLowerCase().includes(q) ||
				(s.src_queue && s.src_queue.toLowerCase().includes(q)) ||
				(s.src_exchange && s.src_exchange.toLowerCase().includes(q)) ||
				(s.dest_queue && s.dest_queue.toLowerCase().includes(q)) ||
				(s.dest_exchange && s.dest_exchange.toLowerCase().includes(q)) ||
				(s.node && s.node.toLowerCase().includes(q));

			const matchesState =
				stateFilter === "all" ||
				(stateFilter === "running" && s.state === "running") ||
				(stateFilter === "terminated" && s.state === "terminated") ||
				(stateFilter === "other" &&
					s.state !== "running" &&
					s.state !== "terminated");

			return matchesSearch && matchesState;
		});
	}, [shovelStatuses, searchQuery, stateFilter]);

	// Filtered dynamic configurations
	const filteredConfigs = React.useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		return dynamicShovels.filter((s) => {
			const val = s.value;
			return (
				!q ||
				s.name.toLowerCase().includes(q) ||
				s.vhost.toLowerCase().includes(q) ||
				(val["src-queue"] && val["src-queue"].toLowerCase().includes(q)) ||
				(val["src-exchange"] &&
					val["src-exchange"].toLowerCase().includes(q)) ||
				(val["dest-queue"] && val["dest-queue"].toLowerCase().includes(q)) ||
				(val["dest-exchange"] && val["dest-exchange"].toLowerCase().includes(q))
			);
		});
	}, [dynamicShovels, searchQuery]);

	// Summary statistics
	const totalShovels = shovelStatuses.length;
	const runningShovels = shovelStatuses.filter(
		(s) => s.state === "running",
	).length;
	const terminatedShovels = shovelStatuses.filter(
		(s) => s.state === "terminated",
	).length;
	const totalForwarded = shovelStatuses.reduce(
		(acc, s) => acc + (s.forwarded || 0),
		0,
	);

	// Action handlers
	const handleRestart = async (vhost: string, name: string) => {
		if (
			!(await confirm({
				title: "Restart Shovel?",
				description: `Are you sure you want to restart shovel "${name}" on virtual host "${vhost}"?`,
				confirmLabel: "Restart Shovel",
				variant: "warning",
			}))
		) {
			return;
		}

		try {
			await restartShovel.mutateAsync({ vhost, name });
			toast.success(`Shovel "${name}" restarted`);
			refetchStatuses();
		} catch (err: any) {
			toast.error("Failed to restart shovel", err?.message || String(err));
		}
	};

	const handleDelete = async (vhost: string, name: string) => {
		if (
			!(await confirm({
				title: "Delete Dynamic Shovel?",
				description: `Are you sure you want to delete shovel "${name}" on virtual host "${vhost}"? Shoveling will immediately stop and cannot be undone.`,
				confirmLabel: "Delete Shovel",
			}))
		) {
			return;
		}

		try {
			await deleteShovel.mutateAsync({ vhost, name });
			toast.success(`Shovel "${name}" deleted`);
			refetchStatuses();
			refetchDynamics();
			if (selectedStatus?.name === name && selectedStatus?.vhost === vhost) {
				setSelectedStatus(null);
			}
		} catch (err: any) {
			toast.error("Failed to delete shovel", err?.message || String(err));
		}
	};

	const handleCreateSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formName.trim()) {
			toast.error("Shovel name is required");
			return;
		}

		setIsSubmitting(true);
		try {
			const definition: DynamicShovelDefinition = {
				"src-protocol": formSrcProtocol,
				"src-uri": formSrcUri.trim() || "amqp://",
				"dest-protocol": formDestProtocol,
				"dest-uri": formDestUri.trim() || "amqp://",
				"ack-mode": formAckMode,
				"reconnect-delay": Number(formReconnectDelay) || 1,
				"dest-add-forward-headers": formDestAddHeaders,
			};

			if (formSrcEndpointType === "queue") {
				if (!formSrcQueue.trim()) {
					toast.error("Source queue name is required");
					setIsSubmitting(false);
					return;
				}
				definition["src-queue"] = formSrcQueue.trim();
			} else {
				if (!formSrcExchange.trim()) {
					toast.error("Source exchange name is required");
					setIsSubmitting(false);
					return;
				}
				definition["src-exchange"] = formSrcExchange.trim();
				if (formSrcExchangeKey.trim()) {
					definition["src-exchange-key"] = formSrcExchangeKey.trim();
				}
			}

			if (formDestEndpointType === "queue") {
				if (!formDestQueue.trim()) {
					toast.error("Destination queue name is required");
					setIsSubmitting(false);
					return;
				}
				definition["dest-queue"] = formDestQueue.trim();
			} else {
				if (!formDestExchange.trim()) {
					toast.error("Destination exchange name is required");
					setIsSubmitting(false);
					return;
				}
				definition["dest-exchange"] = formDestExchange.trim();
				if (formDestExchangeKey.trim()) {
					definition["dest-exchange-key"] = formDestExchangeKey.trim();
				}
			}

			if (formSrcPrefetch > 0) {
				definition["src-prefetch-count"] = Number(formSrcPrefetch);
			}

			if (formSrcDeleteAfter === "never") {
				definition["src-delete-after"] = "never";
			} else if (formSrcDeleteAfter === "queue-length") {
				definition["src-delete-after"] = "queue-length";
			} else if (formSrcDeleteAfter === "count") {
				definition["src-delete-after"] = Number(formSrcDeleteCount);
			}

			await createShovel.mutateAsync({
				vhost: formVHost,
				name: formName.trim(),
				definition,
			});

			toast.success(
				`Dynamic shovel "${formName.trim()}" created successfully!`,
			);
			setIsAddModalOpen(false);
			setFormName("");
			setFormSrcQueue("");
			setFormDestQueue("");
			refetchStatuses();
			refetchDynamics();
		} catch (err: any) {
			toast.error(
				"Failed to create dynamic shovel",
				err?.message || String(err),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Fallback UI when Shovel plugin is disabled on the cluster
	if (!isCheckingPlugin && isPluginEnabled === false) {
		return (
			<div className="space-y-6 pb-16">
				<div className="flex items-center justify-between border-b border-border pb-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border">
							<Shovel className="h-5 w-5" />
						</div>
						<div>
							<h1 className="text-xl font-bold tracking-tight text-foreground">
								Shovels
							</h1>
							<p className="text-xs text-muted-foreground">
								Unidirectional cross-broker and inter-queue message bridges
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetchPlugin()}
						className="gap-1.5 text-xs font-mono"
					>
						<RefreshCw className="h-3.5 w-3.5" />
						Re-check Plugin
					</Button>
				</div>

				<Card className="border-amber-500/30 bg-amber-500/5 max-w-2xl mx-auto mt-8">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2 text-amber-500">
							<AlertTriangle className="h-5 w-5 shrink-0" />
							<CardTitle className="text-base font-semibold">
								Shovel Plugin Not Enabled
							</CardTitle>
						</div>
						<CardDescription className="text-xs text-muted-foreground">
							The RabbitMQ Shovel plugin provides reliable message replication
							and drain capabilities between queues, exchanges, and clusters. It
							is currently not enabled on this node.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-xs">
						<p className="text-foreground">
							To enable Shovel and its management API on your RabbitMQ cluster,
							run the following command on the host or inside your container:
						</p>

						<div className="relative rounded-md bg-zinc-950 p-3 font-mono text-[11px] text-zinc-200 border border-zinc-800">
							<div className="flex items-center justify-between pb-1 text-zinc-400">
								<span className="flex items-center gap-1.5">
									<Terminal className="h-3.5 w-3.5" />
									Shell Command
								</span>
								<button
									type="button"
									onClick={() => {
										navigator.clipboard.writeText(
											"rabbitmq-plugins enable rabbitmq_shovel rabbitmq_shovel_management",
										);
										toast.success("Copied activation command to clipboard");
									}}
									className="text-zinc-400 hover:text-zinc-100 flex items-center gap-1 text-[10px]"
								>
									<Copy className="h-3 w-3" />
									Copy
								</button>
							</div>
							<code>
								rabbitmq-plugins enable rabbitmq_shovel
								rabbitmq_shovel_management
							</code>
						</div>

						<p className="text-muted-foreground text-[11px]">
							No broker restart is required; dynamic shovels will be available
							as soon as the plugin is activated.
						</p>

						<div className="pt-2 flex justify-end">
							<Button
								size="sm"
								onClick={() => refetchPlugin()}
								className="gap-1.5 text-xs"
							>
								<RefreshCw className="h-3.5 w-3.5" />
								Check Again
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6 pb-16">
			{/* Page Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
						<Shovel className="h-5 w-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-xl font-bold tracking-tight text-foreground">
								Shovels
							</h1>
							<Badge
								variant="outline"
								className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono"
							>
								Plugin Active
							</Badge>
						</div>
						<p className="text-xs text-muted-foreground">
							Unidirectional message bridges between queues and exchanges across
							virtual hosts or clusters
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							refetchStatuses();
							refetchDynamics();
						}}
						disabled={isFetchingStatuses}
						className="gap-1.5 text-xs font-mono h-8"
					>
						<RefreshCw
							className={`h-3.5 w-3.5 ${isFetchingStatuses ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
					<Button
						size="sm"
						onClick={() => setIsAddModalOpen(true)}
						className="gap-1.5 text-xs h-8"
					>
						<Plus className="h-3.5 w-3.5" />
						Add Shovel
					</Button>
				</div>
			</div>

			{/* Metric Summary Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Total Shovels
						</span>
						<div className="flex items-baseline justify-between">
							<span className="text-2xl font-bold font-mono text-foreground">
								{totalShovels}
							</span>
							<span className="text-[11px] font-mono text-muted-foreground">
								{dynamicShovels.length} dynamic
							</span>
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Active / Running
						</span>
						<div className="flex items-baseline justify-between">
							<span className="text-2xl font-bold font-mono text-emerald-500">
								{runningShovels}
							</span>
							<span className="flex items-center gap-1 text-[11px] font-mono text-emerald-500">
								<CheckCircle2 className="h-3 w-3" />
								Healthy
							</span>
						</div>
					</CardContent>
				</Card>

				<Card
					className={`border bg-card/60 ${terminatedShovels > 0 ? "border-destructive/40" : "border-border/80"}`}
				>
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Terminated / Errors
						</span>
						<div className="flex items-baseline justify-between">
							<span
								className={`text-2xl font-bold font-mono ${terminatedShovels > 0 ? "text-destructive" : "text-foreground"}`}
							>
								{terminatedShovels}
							</span>
							<span className="text-[11px] font-mono text-muted-foreground">
								{terminatedShovels > 0 ? "Attention required" : "None"}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Forwarded Messages
						</span>
						<div className="flex items-baseline justify-between">
							<span className="text-2xl font-bold font-mono text-foreground">
								{formatNumber(totalForwarded)}
							</span>
							<span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
								<Activity className="h-3 w-3 text-primary" />
								Bridged
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters & Tabs Navigation */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				{/* Tabs */}
				<div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30">
					<button
						type="button"
						onClick={() => setActiveTab("status")}
						className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
							activeTab === "status"
								? "bg-card text-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Live Status ({totalShovels})
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("configs")}
						className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
							activeTab === "configs"
								? "bg-card text-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Dynamic Configurations ({dynamicShovels.length})
					</button>
				</div>

				{/* Search & State Filter */}
				<div className="flex items-center gap-2">
					{activeTab === "status" && (
						<select
							value={stateFilter}
							onChange={(e) => setStateFilter(e.target.value)}
							className="h-8 px-2.5 rounded-md border border-border bg-card text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
						>
							<option value="all">All States</option>
							<option value="running">Running</option>
							<option value="terminated">Terminated / Error</option>
							<option value="other">Starting / Other</option>
						</select>
					)}
					<div className="relative w-64">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
						<input
							type="text"
							placeholder="Filter shovels..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-card text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
						/>
					</div>
				</div>
			</div>

			{/* TAB 1: LIVE STATUS */}
			{activeTab === "status" && (
				<Card className="border border-border">
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>VHost</TableHead>
									<TableHead>State</TableHead>
									<TableHead>Source</TableHead>
									<TableHead className="w-6 text-center"></TableHead>
									<TableHead>Destination</TableHead>
									<TableHead className="text-right">Forwarded</TableHead>
									<TableHead className="text-right">Remaining</TableHead>
									<TableHead>Last Activity</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredStatuses.length > 0 ? (
									filteredStatuses.map((s) => {
										const isRunning = s.state === "running";
										const isTerminated = s.state === "terminated";

										return (
											<TableRow key={`${s.vhost}:${s.name}`}>
												{/* Name & Type */}
												<TableCell>
													<div className="space-y-0.5">
														<button
															type="button"
															onClick={() => setSelectedStatus(s)}
															className="font-mono text-xs font-semibold text-foreground hover:text-primary transition-colors text-left"
														>
															{s.name}
														</button>
														<div className="flex items-center gap-1.5">
															<Badge
																variant="outline"
																className="text-[9px] uppercase font-mono px-1 py-0 border-border text-muted-foreground"
															>
																{s.type}
															</Badge>
															{s.node && (
																<span
																	className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]"
																	title={s.node}
																>
																	{s.node}
																</span>
															)}
														</div>
													</div>
												</TableCell>

												{/* VHost */}
												<TableCell className="font-mono text-xs text-muted-foreground">
													{s.vhost}
												</TableCell>

												{/* State */}
												<TableCell>
													<div className="flex items-center gap-1.5">
														<span
															className={`h-2 w-2 rounded-full ${
																isRunning
																	? "bg-emerald-500 animate-pulse"
																	: isTerminated
																		? "bg-destructive"
																		: "bg-amber-500"
															}`}
														/>
														<span
															className={`text-xs font-medium capitalize ${
																isRunning
																	? "text-emerald-500"
																	: isTerminated
																		? "text-destructive"
																		: "text-amber-500"
															}`}
														>
															{s.state}
														</span>
														{s.reason && (
															<Tooltip content={s.reason}>
																<AlertCircle className="h-3.5 w-3.5 text-destructive cursor-help" />
															</Tooltip>
														)}
													</div>
												</TableCell>

												{/* Source */}
												<TableCell>
													<div className="space-y-0.5 font-mono text-[11px]">
														<div className="flex items-center gap-1 text-foreground">
															{s.src_queue ? (
																<>
																	<Layers className="h-3 w-3 text-muted-foreground" />
																	<span>{s.src_queue}</span>
																</>
															) : s.src_exchange ? (
																<>
																	<Share2 className="h-3 w-3 text-muted-foreground" />
																	<span>{s.src_exchange}</span>
																</>
															) : (
																<span>{s.src_address || "Custom"}</span>
															)}
														</div>
														<div
															className="text-[10px] text-muted-foreground truncate max-w-[150px]"
															title={s.src_uri}
														>
															{s.src_uri || "amqp://"}
														</div>
													</div>
												</TableCell>

												{/* Arrow */}
												<TableCell className="text-center text-muted-foreground p-0">
													<ArrowRight className="h-3.5 w-3.5 inline-block text-primary/70" />
												</TableCell>

												{/* Destination */}
												<TableCell>
													<div className="space-y-0.5 font-mono text-[11px]">
														<div className="flex items-center gap-1 text-foreground">
															{s.dest_queue ? (
																<>
																	<Layers className="h-3 w-3 text-muted-foreground" />
																	<span>{s.dest_queue}</span>
																</>
															) : s.dest_exchange ? (
																<>
																	<Share2 className="h-3 w-3 text-muted-foreground" />
																	<span>{s.dest_exchange}</span>
																</>
															) : (
																<span>{s.dest_address || "Custom"}</span>
															)}
														</div>
														<div
															className="text-[10px] text-muted-foreground truncate max-w-[150px]"
															title={s.dest_uri}
														>
															{s.dest_uri || "amqp://"}
														</div>
													</div>
												</TableCell>

												{/* Forwarded */}
												<TableCell className="text-right font-mono text-xs font-semibold">
													{formatNumber(s.forwarded || 0)}
												</TableCell>

												{/* Remaining */}
												<TableCell className="text-right font-mono text-xs text-muted-foreground">
													{s.remaining !== undefined &&
													s.remaining !== "unlimited"
														? formatNumber(Number(s.remaining))
														: "∞"}
												</TableCell>

												{/* Last Activity */}
												<TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
													{s.timestamp || "—"}
												</TableCell>

												{/* Actions */}
												<TableCell className="text-right">
													<div className="flex items-center justify-end gap-1">
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-muted-foreground hover:text-foreground"
															onClick={() => setSelectedStatus(s)}
															title="Inspect details"
														>
															<Eye className="h-3.5 w-3.5" />
														</Button>

														{s.type === "dynamic" && (
															<>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-7 w-7 text-muted-foreground hover:text-primary"
																	onClick={() => handleRestart(s.vhost, s.name)}
																	title="Restart shovel"
																>
																	<RotateCw className="h-3.5 w-3.5" />
																</Button>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-7 w-7 text-muted-foreground hover:text-destructive"
																	onClick={() => handleDelete(s.vhost, s.name)}
																	title="Delete shovel"
																>
																	<Trash2 className="h-3.5 w-3.5" />
																</Button>
															</>
														)}
													</div>
												</TableCell>
											</TableRow>
										);
									})
								) : (
									<TableRow>
										<TableCell colSpan={10} className="h-32 text-center">
											<div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
												<Shovel className="h-6 w-6 stroke-1" />
												<p className="text-xs">No shovel instances found</p>
												<Button
													variant="outline"
													size="sm"
													className="mt-2 text-xs"
													onClick={() => setIsAddModalOpen(true)}
												>
													<Plus className="h-3.5 w-3.5 mr-1" />
													Create First Shovel
												</Button>
											</div>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* TAB 2: DYNAMIC CONFIGURATIONS */}
			{activeTab === "configs" && (
				<Card className="border border-border">
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>VHost</TableHead>
									<TableHead>Source Config</TableHead>
									<TableHead>Destination Config</TableHead>
									<TableHead>Prefetch</TableHead>
									<TableHead>Ack Mode</TableHead>
									<TableHead>Auto-Delete</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredConfigs.length > 0 ? (
									filteredConfigs.map((s) => {
										const val = s.value;
										return (
											<TableRow key={`${s.vhost}:${s.name}`}>
												<TableCell className="font-mono text-xs font-semibold text-foreground">
													{s.name}
												</TableCell>
												<TableCell className="font-mono text-xs text-muted-foreground">
													{s.vhost}
												</TableCell>
												<TableCell>
													<div className="font-mono text-xs space-y-0.5">
														<div className="text-foreground">
															{val["src-queue"]
																? `queue: ${val["src-queue"]}`
																: `exchange: ${val["src-exchange"]}`}
														</div>
														<div
															className="text-[10px] text-muted-foreground truncate max-w-[200px]"
															title={String(val["src-uri"])}
														>
															{String(val["src-uri"])}
														</div>
													</div>
												</TableCell>
												<TableCell>
													<div className="font-mono text-xs space-y-0.5">
														<div className="text-foreground">
															{val["dest-queue"]
																? `queue: ${val["dest-queue"]}`
																: `exchange: ${val["dest-exchange"]}`}
														</div>
														<div
															className="text-[10px] text-muted-foreground truncate max-w-[200px]"
															title={String(val["dest-uri"])}
														>
															{String(val["dest-uri"])}
														</div>
													</div>
												</TableCell>
												<TableCell className="font-mono text-xs">
													{val["src-prefetch-count"] || 1000}
												</TableCell>
												<TableCell>
													<Badge
														variant="outline"
														className="text-[10px] font-mono"
													>
														{val["ack-mode"] || "on-confirm"}
													</Badge>
												</TableCell>
												<TableCell className="text-xs text-muted-foreground font-mono">
													{val["src-delete-after"]
														? String(val["src-delete-after"])
														: "never"}
												</TableCell>
												<TableCell className="text-right">
													<div className="flex items-center justify-end gap-1">
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-muted-foreground hover:text-primary"
															onClick={() => handleRestart(s.vhost, s.name)}
															title="Restart shovel"
														>
															<RotateCw className="h-3.5 w-3.5" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-muted-foreground hover:text-destructive"
															onClick={() => handleDelete(s.vhost, s.name)}
															title="Delete shovel"
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										);
									})
								) : (
									<TableRow>
										<TableCell
											colSpan={8}
											className="h-28 text-center text-muted-foreground text-xs"
										>
											No dynamic shovels configured.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* CREATE SHOVEL MODAL */}
			{isAddModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
					<Card className="w-full max-w-2xl shadow-xl border-border bg-card my-8">
						<CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
							<div>
								<CardTitle className="text-base font-semibold flex items-center gap-2">
									<Shovel className="h-4.5 w-4.5 text-primary" />
									Create Dynamic Shovel
								</CardTitle>
								<CardDescription className="text-xs">
									Configure an automated, reliable bridge between queues or
									exchanges
								</CardDescription>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-muted-foreground hover:text-foreground"
								onClick={() => setIsAddModalOpen(false)}
							>
								<X className="h-4 w-4" />
							</Button>
						</CardHeader>

						<form onSubmit={handleCreateSubmit}>
							<CardContent className="space-y-4 pt-4 text-xs max-h-[70vh] overflow-y-auto scrollbar-thin">
								{/* Quick Presets */}
								<div className="space-y-1.5">
									<label className="font-medium text-foreground">
										Common Presets
									</label>
									<div className="grid grid-cols-3 gap-2">
										<button
											type="button"
											onClick={() => {
												setFormSrcUri("amqp://");
												setFormDestUri("amqp://");
												setFormSrcEndpointType("queue");
												setFormDestEndpointType("queue");
											}}
											className="p-2 text-left rounded-md border border-border hover:bg-muted/40 transition-colors"
										>
											<div className="font-semibold text-foreground">
												Queue &rarr; Queue (Local)
											</div>
											<div className="text-[10px] text-muted-foreground">
												Within same broker
											</div>
										</button>
										<button
											type="button"
											onClick={() => {
												setFormSrcUri("amqp://");
												setFormDestUri(
													"amqp://user:password@remote-host:5672/%2f",
												);
												setFormSrcEndpointType("queue");
												setFormDestEndpointType("queue");
											}}
											className="p-2 text-left rounded-md border border-border hover:bg-muted/40 transition-colors"
										>
											<div className="font-semibold text-foreground">
												Local &rarr; Remote Broker
											</div>
											<div className="text-[10px] text-muted-foreground">
												Cross-cluster replication
											</div>
										</button>
										<button
											type="button"
											onClick={() => {
												setFormSrcUri("amqp://");
												setFormDestUri("amqp://");
												setFormSrcEndpointType("exchange");
												setFormDestEndpointType("queue");
											}}
											className="p-2 text-left rounded-md border border-border hover:bg-muted/40 transition-colors"
										>
											<div className="font-semibold text-foreground">
												Exchange &rarr; Queue
											</div>
											<div className="text-[10px] text-muted-foreground">
												Publishing bridge
											</div>
										</button>
									</div>
								</div>

								{/* VHost and Name */}
								<div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
									<div className="space-y-1.5">
										<label className="font-medium text-foreground">
											Virtual Host <span className="text-destructive">*</span>
										</label>
										<select
											value={formVHost}
											onChange={(e) => setFormVHost(e.target.value)}
											className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
										>
											{vhosts.map((v) => (
												<option key={v.name} value={v.name}>
													{v.name}
												</option>
											))}
										</select>
									</div>
									<div className="space-y-1.5">
										<label className="font-medium text-foreground">
											Shovel Name <span className="text-destructive">*</span>
										</label>
										<input
											type="text"
											required
											placeholder="e.g. orders-sync-shovel"
											value={formName}
											onChange={(e) => setFormName(e.target.value)}
											className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
										/>
									</div>
								</div>

								{/* SOURCE CARD */}
								<div className="rounded-lg border border-border/70 p-3 space-y-3 bg-muted/20">
									<div className="flex items-center justify-between">
										<span className="font-semibold text-foreground flex items-center gap-1.5">
											<span className="h-2 w-2 rounded-full bg-blue-500" />
											Source Configuration
										</span>
										<div className="flex items-center gap-2">
											<label className="text-[11px] text-muted-foreground">
												Protocol:
											</label>
											<select
												value={formSrcProtocol}
												onChange={(e) =>
													setFormSrcProtocol(e.target.value as ShovelProtocol)
												}
												className="h-7 px-2 rounded border border-border bg-background text-xs font-mono"
											>
												<option value="amqp091">AMQP 0.9.1</option>
												<option value="amqp10">AMQP 1.0</option>
											</select>
										</div>
									</div>

									<div className="space-y-1.5">
										<label className="text-[11px] text-muted-foreground">
											Source URI
										</label>
										<input
											type="text"
											value={formSrcUri}
											onChange={(e) => setFormSrcUri(e.target.value)}
											placeholder="amqp:// (or amqp://user:pass@host:5672/vhost)"
											className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono text-foreground"
										/>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-1.5">
											<label className="text-[11px] text-muted-foreground">
												Endpoint Type
											</label>
											<div className="flex rounded-md border border-border overflow-hidden h-8">
												<button
													type="button"
													onClick={() => setFormSrcEndpointType("queue")}
													className={`flex-1 text-xs font-medium transition-colors ${
														formSrcEndpointType === "queue"
															? "bg-primary text-primary-foreground"
															: "bg-background text-muted-foreground hover:bg-muted"
													}`}
												>
													Queue
												</button>
												<button
													type="button"
													onClick={() => setFormSrcEndpointType("exchange")}
													className={`flex-1 text-xs font-medium transition-colors ${
														formSrcEndpointType === "exchange"
															? "bg-primary text-primary-foreground"
															: "bg-background text-muted-foreground hover:bg-muted"
													}`}
												>
													Exchange
												</button>
											</div>
										</div>

										{formSrcEndpointType === "queue" ? (
											<div className="space-y-1.5">
												<label className="text-[11px] text-muted-foreground">
													Source Queue Name
												</label>
												<input
													type="text"
													list="src-queues-list"
													value={formSrcQueue}
													onChange={(e) => setFormSrcQueue(e.target.value)}
													placeholder="queue-name"
													className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
												/>
												<datalist id="src-queues-list">
													{vhostQueues.map((q) => (
														<option key={q.name} value={q.name} />
													))}
												</datalist>
											</div>
										) : (
											<>
												<div className="space-y-1.5">
													<label className="text-[11px] text-muted-foreground">
														Source Exchange
													</label>
													<input
														type="text"
														list="src-exchanges-list"
														value={formSrcExchange}
														onChange={(e) => setFormSrcExchange(e.target.value)}
														placeholder="exchange-name"
														className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
													/>
													<datalist id="src-exchanges-list">
														{vhostExchanges.map((ex) => (
															<option key={ex.name} value={ex.name} />
														))}
													</datalist>
												</div>
												<div className="space-y-1.5 col-span-2">
													<label className="text-[11px] text-muted-foreground">
														Routing Key (optional)
													</label>
													<input
														type="text"
														value={formSrcExchangeKey}
														onChange={(e) =>
															setFormSrcExchangeKey(e.target.value)
														}
														placeholder="routing-key"
														className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
													/>
												</div>
											</>
										)}
									</div>

									<div className="grid grid-cols-2 gap-3 pt-1">
										<div className="space-y-1.5">
											<label className="text-[11px] text-muted-foreground">
												Prefetch Count
											</label>
											<input
												type="number"
												min={1}
												value={formSrcPrefetch}
												onChange={(e) =>
													setFormSrcPrefetch(
														parseInt(e.target.value, 10) || 1000,
													)
												}
												className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
											/>
										</div>
										<div className="space-y-1.5">
											<label className="text-[11px] text-muted-foreground">
												Auto-Delete Mode
											</label>
											<select
												value={formSrcDeleteAfter}
												onChange={(e) =>
													setFormSrcDeleteAfter(e.target.value as any)
												}
												className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
											>
												<option value="never">Never (keep running)</option>
												<option value="queue-length">
													After initial queue drained
												</option>
												<option value="count">After specific count</option>
											</select>
										</div>
										{formSrcDeleteAfter === "count" && (
											<div className="space-y-1.5 col-span-2">
												<label className="text-[11px] text-muted-foreground">
													Messages Count
												</label>
												<input
													type="number"
													min={1}
													value={formSrcDeleteCount}
													onChange={(e) =>
														setFormSrcDeleteCount(
															parseInt(e.target.value, 10) || 1,
														)
													}
													className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
												/>
											</div>
										)}
									</div>
								</div>

								{/* DESTINATION CARD */}
								<div className="rounded-lg border border-border/70 p-3 space-y-3 bg-muted/20">
									<div className="flex items-center justify-between">
										<span className="font-semibold text-foreground flex items-center gap-1.5">
											<span className="h-2 w-2 rounded-full bg-emerald-500" />
											Destination Configuration
										</span>
										<div className="flex items-center gap-2">
											<label className="text-[11px] text-muted-foreground">
												Protocol:
											</label>
											<select
												value={formDestProtocol}
												onChange={(e) =>
													setFormDestProtocol(e.target.value as ShovelProtocol)
												}
												className="h-7 px-2 rounded border border-border bg-background text-xs font-mono"
											>
												<option value="amqp091">AMQP 0.9.1</option>
												<option value="amqp10">AMQP 1.0</option>
											</select>
										</div>
									</div>

									<div className="space-y-1.5">
										<label className="text-[11px] text-muted-foreground">
											Destination URI
										</label>
										<input
											type="text"
											value={formDestUri}
											onChange={(e) => setFormDestUri(e.target.value)}
											placeholder="amqp:// (or amqp://user:pass@host:5672/vhost)"
											className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono text-foreground"
										/>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-1.5">
											<label className="text-[11px] text-muted-foreground">
												Endpoint Type
											</label>
											<div className="flex rounded-md border border-border overflow-hidden h-8">
												<button
													type="button"
													onClick={() => setFormDestEndpointType("queue")}
													className={`flex-1 text-xs font-medium transition-colors ${
														formDestEndpointType === "queue"
															? "bg-primary text-primary-foreground"
															: "bg-background text-muted-foreground hover:bg-muted"
													}`}
												>
													Queue
												</button>
												<button
													type="button"
													onClick={() => setFormDestEndpointType("exchange")}
													className={`flex-1 text-xs font-medium transition-colors ${
														formDestEndpointType === "exchange"
															? "bg-primary text-primary-foreground"
															: "bg-background text-muted-foreground hover:bg-muted"
													}`}
												>
													Exchange
												</button>
											</div>
										</div>

										{formDestEndpointType === "queue" ? (
											<div className="space-y-1.5">
												<label className="text-[11px] text-muted-foreground">
													Destination Queue
												</label>
												<input
													type="text"
													list="dest-queues-list"
													value={formDestQueue}
													onChange={(e) => setFormDestQueue(e.target.value)}
													placeholder="target-queue"
													className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
												/>
												<datalist id="dest-queues-list">
													{vhostQueues.map((q) => (
														<option key={q.name} value={q.name} />
													))}
												</datalist>
											</div>
										) : (
											<>
												<div className="space-y-1.5">
													<label className="text-[11px] text-muted-foreground">
														Destination Exchange
													</label>
													<input
														type="text"
														list="dest-exchanges-list"
														value={formDestExchange}
														onChange={(e) =>
															setFormDestExchange(e.target.value)
														}
														placeholder="target-exchange"
														className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
													/>
													<datalist id="dest-exchanges-list">
														{vhostExchanges.map((ex) => (
															<option key={ex.name} value={ex.name} />
														))}
													</datalist>
												</div>
												<div className="space-y-1.5 col-span-2">
													<label className="text-[11px] text-muted-foreground">
														Routing Key (optional)
													</label>
													<input
														type="text"
														value={formDestExchangeKey}
														onChange={(e) =>
															setFormDestExchangeKey(e.target.value)
														}
														placeholder="routing-key"
														className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
													/>
												</div>
											</>
										)}
									</div>

									<div className="pt-1">
										<label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
											<Checkbox
												checked={formDestAddHeaders}
												onChange={(e) =>
													setFormDestAddHeaders(e.target.checked)
												}
											/>
											<span>
												Add forwarding headers (records source and destination
												timestamps)
											</span>
										</label>
									</div>
								</div>

								{/* RELIABILITY SETTINGS */}
								<div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
									<div className="space-y-1.5">
										<label className="font-medium text-foreground">
											Acknowledgement Mode
										</label>
										<select
											value={formAckMode}
											onChange={(e) =>
												setFormAckMode(e.target.value as ShovelAckMode)
											}
											className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
										>
											<option value="on-confirm">
												on-confirm (Lossless, Recommended)
											</option>
											<option value="on-publish">on-publish (Fast)</option>
											<option value="no-ack">
												no-ack (At most once, no ACKs)
											</option>
										</select>
									</div>
									<div className="space-y-1.5">
										<label className="font-medium text-foreground">
											Reconnect Delay (seconds)
										</label>
										<input
											type="number"
											min={1}
											value={formReconnectDelay}
											onChange={(e) =>
												setFormReconnectDelay(parseInt(e.target.value, 10) || 1)
											}
											className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-mono"
										/>
									</div>
								</div>
							</CardContent>

							<CardFooter className="flex justify-end gap-2 border-t border-border pt-3">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setIsAddModalOpen(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									size="sm"
									disabled={isSubmitting || !formName.trim()}
									className="gap-1.5"
								>
									<Plus className="h-3.5 w-3.5" />
									{isSubmitting ? "Creating..." : "Create Shovel"}
								</Button>
							</CardFooter>
						</form>
					</Card>
				</div>
			)}

			{/* SHOVEL DETAIL / DIAGNOSTICS MODAL */}
			{selectedStatus && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
					<Card className="w-full max-w-xl shadow-xl border-border bg-card">
						<CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
							<div>
								<CardTitle className="text-base font-semibold flex items-center gap-2">
									<Shovel className="h-4.5 w-4.5 text-primary" />
									Shovel Details:{" "}
									<span className="font-mono text-foreground">
										{selectedStatus.name}
									</span>
								</CardTitle>
								<CardDescription className="text-xs font-mono">
									Virtual Host: {selectedStatus.vhost} &bull; Type:{" "}
									{selectedStatus.type}
								</CardDescription>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-muted-foreground hover:text-foreground"
								onClick={() => setSelectedStatus(null)}
							>
								<X className="h-4 w-4" />
							</Button>
						</CardHeader>

						<CardContent className="space-y-4 pt-4 text-xs">
							{/* State banner */}
							<div
								className={`p-3 rounded-lg border flex items-start gap-2.5 ${
									selectedStatus.state === "running"
										? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
										: selectedStatus.state === "terminated"
											? "border-destructive/30 bg-destructive/10 text-destructive"
											: "border-amber-500/30 bg-amber-500/10 text-amber-400"
								}`}
							>
								{selectedStatus.state === "running" ? (
									<CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
								) : (
									<AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
								)}
								<div>
									<div className="font-semibold capitalize">
										State: {selectedStatus.state}
									</div>
									{selectedStatus.reason && (
										<p className="mt-1 font-mono text-[11px] whitespace-pre-wrap break-all opacity-90">
											{selectedStatus.reason}
										</p>
									)}
								</div>
							</div>

							{/* Runtime details grid */}
							<div className="grid grid-cols-2 gap-3">
								<div className="p-2.5 rounded-md border border-border/70 bg-muted/20 space-y-1">
									<span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
										Running On Node
									</span>
									<p className="font-mono text-xs text-foreground truncate">
										{selectedStatus.node || "—"}
									</p>
								</div>
								<div className="p-2.5 rounded-md border border-border/70 bg-muted/20 space-y-1">
									<span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
										Last Changed
									</span>
									<p className="font-mono text-xs text-foreground truncate">
										{selectedStatus.timestamp || "—"}
									</p>
								</div>
								<div className="p-2.5 rounded-md border border-border/70 bg-muted/20 space-y-1">
									<span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
										Messages Forwarded
									</span>
									<p className="font-mono text-xs text-foreground font-semibold">
										{formatNumber(selectedStatus.forwarded || 0)}
									</p>
								</div>
								<div className="p-2.5 rounded-md border border-border/70 bg-muted/20 space-y-1">
									<span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
										Remaining / Pending
									</span>
									<p className="font-mono text-xs text-foreground">
										{selectedStatus.remaining ?? "unlimited"} /{" "}
										{selectedStatus.pending ?? 0}
									</p>
								</div>
							</div>

							{/* Endpoints */}
							<div className="space-y-2 border-t border-border/50 pt-3">
								<div className="flex items-center gap-2">
									<span className="w-20 font-semibold text-muted-foreground">
										Source:
									</span>
									<span className="font-mono text-foreground">
										{selectedStatus.src_queue
											? `queue "${selectedStatus.src_queue}"`
											: `exchange "${selectedStatus.src_exchange}"`}
									</span>
									<span className="text-muted-foreground font-mono text-[10px] truncate max-w-xs">
										({selectedStatus.src_uri})
									</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="w-20 font-semibold text-muted-foreground">
										Destination:
									</span>
									<span className="font-mono text-foreground">
										{selectedStatus.dest_queue
											? `queue "${selectedStatus.dest_queue}"`
											: `exchange "${selectedStatus.dest_exchange}"`}
									</span>
									<span className="text-muted-foreground font-mono text-[10px] truncate max-w-xs">
										({selectedStatus.dest_uri})
									</span>
								</div>
							</div>
						</CardContent>

						<CardFooter className="flex justify-between border-t border-border pt-3">
							{selectedStatus.type === "dynamic" ? (
								<Button
									variant="destructive"
									size="sm"
									onClick={() =>
										handleDelete(selectedStatus.vhost, selectedStatus.name)
									}
									className="gap-1.5 text-xs"
								>
									<Trash2 className="h-3.5 w-3.5" />
									Delete
								</Button>
							) : (
								<span className="text-[10px] text-muted-foreground italic">
									Static shovel defined in rabbitmq.conf (read-only)
								</span>
							)}

							<div className="flex items-center gap-2">
								{selectedStatus.type === "dynamic" && (
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											handleRestart(selectedStatus.vhost, selectedStatus.name)
										}
										className="gap-1.5 text-xs"
									>
										<RotateCw className="h-3.5 w-3.5" />
										Restart
									</Button>
								)}
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setSelectedStatus(null)}
									className="text-xs"
								>
									Close
								</Button>
							</div>
						</CardFooter>
					</Card>
				</div>
			)}
		</div>
	);
}
