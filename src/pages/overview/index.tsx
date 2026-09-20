import { MetricCard } from "@/components/MetricCard/index.tsx";
import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
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
import { toast } from "@/components/ui/toast/index.tsx";
import { getRabbitMQClient } from "@/hooks/useAuth/index.ts";
import {
	useRabbitNodes,
	useRabbitOverview,
	useRabbitQueues,
} from "@/hooks/useRabbitMQ/index.ts";
import type { Node as RabbitNode } from "@/services/rabbitmq/types/node.ts";
import type { Listener } from "@/services/rabbitmq/types/overview.ts";
import { formatBytes } from "@/services/rabbitmq/utils.ts";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowDownRight,
	ArrowUp,
	ArrowUpDown,
	ArrowUpRight,
	Download,
	Layers,
	Radio,
	Server,
	Upload,
	Zap,
} from "lucide-react";
import * as React from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const nodeColumnHelper = createColumnHelper<RabbitNode>();

export function OverviewPage() {
	const { data: overview } = useRabbitOverview();
	const { data: queues = [] } = useRabbitQueues();
	const { data: nodes = [] } = useRabbitNodes();

	const [nodeSorting, setNodeSorting] = React.useState<SortingState>([]);
	const [isExporting, setIsExporting] = React.useState(false);
	const [importStatus, setImportStatus] = React.useState<string | null>(null);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	// Listeners are reported per cluster node, so group them to avoid showing duplicate port cards.
	const listenersByNode = React.useMemo(() => {
		const groups = new Map<string, Listener[]>();
		for (const l of overview?.listeners ?? []) {
			const group = groups.get(l.node);
			if (group) group.push(l);
			else groups.set(l.node, [l]);
		}
		return Array.from(groups.entries());
	}, [overview?.listeners]);

	// Extract stable primitive values so the effect below only fires when the
	// actual rate numbers change — not on every new object reference from React Query.
	const pubRate = overview?.message_stats?.publish_details?.rate ?? 0;
	const delRate = overview?.message_stats?.deliver_get_details?.rate ?? 0;

	const MAX_TELEMETRY_POINTS = 20;

	// Dynamic time-series chart data generated from current publish/deliver rates
	const [telemetryHistory, setTelemetryHistory] = React.useState<
		{ time: string; ingress: number; egress: number }[]
	>([
		{ time: "19:50", ingress: 0, egress: 0 },
		{ time: "19:51", ingress: 0, egress: 0 },
		{ time: "19:52", ingress: 0, egress: 0 },
		{ time: "19:53", ingress: 0, egress: 0 },
		{ time: "19:54", ingress: 0, egress: 0 },
		{ time: "19:55", ingress: 0, egress: 0 },
	]);

	React.useEffect(() => {
		if (!overview) return;
		const now = new Date();
		const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

		setTelemetryHistory((prev) => {
			const next = [
				...prev.slice(-(MAX_TELEMETRY_POINTS - 1)),
				{
					time: timeStr,
					ingress: Math.round(pubRate * 10) / 10,
					egress: Math.round(delRate * 10) / 10,
				},
			];
			return next;
		});
		// Depend on the extracted primitive rate values, not the full overview object,
		// to avoid appending a duplicate point every time React Query returns a new reference.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pubRate, delRate]);

	const handleExportDefinitions = async () => {
		setIsExporting(true);
		try {
			const client = getRabbitMQClient();
			const defs = await client.definitions.exportDefinitions();
			const blob = new Blob([JSON.stringify(defs, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `rabbitmq_definitions_${overview?.cluster_name || "cluster"}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err: any) {
			console.error("Failed to export definitions:", err);
			toast.error("Failed to export definitions", err.message || String(err));
		} finally {
			setIsExporting(false);
		}
	};

	const handleImportDefinitions = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setImportStatus("Importing definitions...");
		try {
			const text = await file.text();
			const json = JSON.parse(text);
			const client = getRabbitMQClient();
			await client.definitions.importDefinitions(json);
			setImportStatus("Successfully imported definitions!");
			setTimeout(() => setImportStatus(null), 4000);
		} catch (err: any) {
			console.error("Failed to import definitions:", err);
			setImportStatus(
				"Import error: " + (err.message || "Invalid JSON format"),
			);
			setTimeout(() => setImportStatus(null), 5000);
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	// Nodes table columns
	const nodeColumns = React.useMemo(
		() => [
			nodeColumnHelper.accessor("name", {
				header: "Node Name",
				cell: (info) => (
					<div className="flex items-center gap-2">
						<span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
						<span className="font-mono text-xs font-semibold text-foreground">
							{info.getValue()}
						</span>
						{info.row.original.type && (
							<Badge
								variant="outline"
								className="text-[10px] uppercase font-mono py-0"
							>
								{info.row.original.type}
							</Badge>
						)}
					</div>
				),
			}),
			nodeColumnHelper.accessor("fd_used", {
				header: "File Descriptors",
				cell: (info) => {
					const used = info.getValue() ?? 0;
					const total = info.row.original.fd_total ?? 65536;
					const pct = Math.min(100, Math.round((used / total) * 100));
					return (
						<div className="space-y-1 min-w-28">
							<div className="flex justify-between text-[11px] font-mono">
								<span>{used}</span>
								<span className="text-muted-foreground">
									/ {total} ({pct}%)
								</span>
							</div>
							<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
								<div
									className={`h-full ${pct > 85 ? "bg-destructive" : pct > 65 ? "bg-amber-500" : "bg-primary"}`}
									style={{ width: `${Math.max(3, pct)}%` }}
								/>
							</div>
						</div>
					);
				},
			}),
			nodeColumnHelper.accessor("sockets_used", {
				header: "Sockets",
				cell: (info) => {
					const used = info.getValue() ?? 0;
					const total = info.row.original.sockets_total ?? 50000;
					return (
						<span className="font-mono text-xs">
							{used} / {total}
						</span>
					);
				},
			}),
			nodeColumnHelper.accessor("proc_used", {
				header: "Erlang Processes",
				cell: (info) => {
					const used = info.getValue() ?? 0;
					const total = info.row.original.proc_total ?? 1048576;
					return (
						<span className="font-mono text-xs">
							{used.toLocaleString()} / {total.toLocaleString()}
						</span>
					);
				},
			}),
			nodeColumnHelper.accessor("mem_used", {
				header: "Memory (High Watermark)",
				cell: (info) => {
					const used = info.getValue() ?? 0;
					const limit = info.row.original.mem_limit ?? 1;
					const pct = Math.min(100, Math.round((used / limit) * 100));
					return (
						<div className="space-y-1 min-w-32">
							<div className="flex justify-between text-[11px] font-mono">
								<span className="font-medium">{formatBytes(used)}</span>
								<span className="text-muted-foreground">
									/ {formatBytes(limit)} ({pct}%)
								</span>
							</div>
							<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
								<div
									className={`h-full ${pct > 80 ? "bg-destructive" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
									style={{ width: `${Math.max(3, pct)}%` }}
								/>
							</div>
						</div>
					);
				},
			}),
			nodeColumnHelper.accessor("disk_free", {
				header: "Free Disk Space",
				cell: (info) => {
					const free = info.getValue() ?? 0;
					const limit = info.row.original.disk_free_limit ?? 50000000;
					const isAlarm = info.row.original.disk_free_alarm;
					return (
						<div className="flex items-center gap-1.5 font-mono text-xs">
							<span
								className={
									isAlarm ? "text-destructive font-bold" : "text-foreground"
								}
							>
								{formatBytes(free)}
							</span>
							<span className="text-[10px] text-muted-foreground">
								(min: {formatBytes(limit)})
							</span>
						</div>
					);
				},
			}),
			nodeColumnHelper.accessor("uptime", {
				header: "Uptime",
				cell: (info) => {
					const ms = info.getValue() ?? 0;
					const seconds = Math.floor(ms / 1000);
					const days = Math.floor(seconds / 86400);
					const hours = Math.floor((seconds % 86400) / 3600);
					const minutes = Math.floor((seconds % 3600) / 60);
					const uptimeStr =
						days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
					return (
						<span className="font-mono text-xs text-muted-foreground">
							{uptimeStr}
						</span>
					);
				},
			}),
		],
		[],
	);

	// Memoized so the fallback placeholder object is not a new array reference on
	// every render, which was causing useReactTable to recompute all row models
	// every render cycle even when neither nodes nor overview changed.
	const nodeTableData = React.useMemo<RabbitNode[]>(() => {
		if (nodes.length > 0) return nodes;
		if (!overview?.node) return [];
		return [
			{
				name: overview.node,
				type: "disc",
				uptime: 86400000 * 3,
				running: true,
				fd_used: 128,
				fd_total: 65536,
				sockets_used: 32,
				sockets_total: 58893,
				mem_used: 245000000,
				mem_limit: 12000000000,
				proc_used: 1420,
				proc_total: 1048576,
				disk_free: 8200000000,
				disk_free_limit: 50000000,
				disk_free_alarm: false,
				mem_alarm: false,
				rates_mode: "basic",
			} as RabbitNode,
		];
	}, [nodes, overview?.node]);

	const nodeTable = useReactTable({
		data: nodeTableData,
		columns: nodeColumns,
		state: { sorting: nodeSorting },
		onSortingChange: setNodeSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const totalMessages = overview?.queue_totals?.messages ?? 0;
	const readyMessages = overview?.queue_totals?.messages_ready ?? 0;
	const unackedMessages = overview?.queue_totals?.messages_unacknowledged ?? 0;

	const ackRate = overview?.message_stats?.ack_details?.rate ?? 0;

	return (
		<div className="space-y-6">
			{/* Top Banner / Title */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Cluster Overview
						</h1>
						<Badge variant="outline" className="font-mono text-xs">
							RabbitMQ {overview?.rabbitmq_version || "4.3.6"}
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground mt-0.5">
						Connected to{" "}
						<strong className="text-primary font-mono">
							{overview?.cluster_name || "local"}
						</strong>{" "}
						&bull; Erlang {overview?.erlang_version || "27"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{importStatus && (
						<span className="text-xs font-medium text-emerald-500 animate-in fade-in">
							{importStatus}
						</span>
					)}
					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						onChange={handleImportDefinitions}
						className="hidden"
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						className="text-xs"
					>
						<Upload className="h-3.5 w-3.5 mr-1" /> Import Definitions
					</Button>
					<Button
						size="sm"
						onClick={handleExportDefinitions}
						disabled={isExporting}
						className="text-xs"
					>
						<Download className="h-3.5 w-3.5 mr-1" />
						{isExporting ? "Exporting..." : "Export Definitions"}
					</Button>
				</div>
			</div>

			{/* KPI Ribbon */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<MetricCard
					title="Queued Messages"
					value={totalMessages.toLocaleString()}
					subValue={`${readyMessages.toLocaleString()} ready • ${unackedMessages.toLocaleString()} unacked`}
					rate={
						unackedMessages > 0 ? `${unackedMessages} in-flight` : "All ready"
					}
					trend={unackedMessages > 100 ? "up" : "neutral"}
					icon={<Layers className="h-5 w-5" />}
				/>
				<MetricCard
					title="Publish Velocity"
					value={`${pubRate.toFixed(1)} /s`}
					subValue={`${(overview?.message_stats?.publish ?? 0).toLocaleString()} published total`}
					rate={pubRate > 100 ? "High Rate" : "Normal"}
					trend="up"
					icon={<ArrowUpRight className="h-5 w-5" />}
				/>
				<MetricCard
					title="Delivery & Ack Rate"
					value={`${delRate.toFixed(1)} /s`}
					subValue={`Ack: ${ackRate.toFixed(1)}/s`}
					rate={delRate >= pubRate ? "Balanced" : "Lagging"}
					trend={delRate >= pubRate ? "neutral" : "down"}
					icon={<ArrowDownRight className="h-5 w-5" />}
				/>
				<MetricCard
					title="Topology Inventory"
					value={`${overview?.object_totals?.queues ?? queues.length} Queues`}
					subValue={`${overview?.object_totals?.connections ?? 0} Conns • ${overview?.object_totals?.channels ?? 0} Chans • ${overview?.object_totals?.exchanges ?? 0} Exch`}
					rate={`${overview?.object_totals?.consumers ?? 0} Consumers`}
					trend="neutral"
					icon={<Zap className="h-5 w-5" />}
				/>
			</div>

			{/* Real-Time Throughput Chart */}
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base">
								Message Ingress & Egress Rates
							</CardTitle>
							<CardDescription className="text-xs">
								Published vs Delivered message throughput (msg/sec)
							</CardDescription>
						</div>
						<div className="flex items-center gap-4 text-xs font-mono">
							<span className="flex items-center gap-1.5 text-foreground">
								<span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Pub:{" "}
								{pubRate.toFixed(1)}/s
							</span>
							<span className="flex items-center gap-1.5 text-muted-foreground">
								<span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/60" />{" "}
								Del: {delRate.toFixed(1)}/s
							</span>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="h-64 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={telemetryHistory}
								margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
							>
								<defs>
									<linearGradient
										id="ingressGradient"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor="var(--color-primary, #ea6a28)"
											stopOpacity={0.35}
										/>
										<stop
											offset="95%"
											stopColor="var(--color-primary, #ea6a28)"
											stopOpacity={0.0}
										/>
									</linearGradient>
									<linearGradient
										id="egressGradient"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop offset="5%" stopColor="#71717a" stopOpacity={0.2} />
										<stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									opacity={0.15}
								/>
								<XAxis
									dataKey="time"
									tickLine={false}
									axisLine={false}
									fontSize={11}
									stroke="#888888"
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									fontSize={11}
									stroke="#888888"
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "var(--color-card, #1c1d22)",
										borderColor: "var(--color-border, #2e3039)",
										borderRadius: "8px",
										fontSize: "12px",
										color: "var(--color-foreground, #ffffff)",
									}}
								/>
								<Area
									type="monotone"
									dataKey="ingress"
									name="Publish Rate"
									stroke="var(--color-primary, #ea6a28)"
									strokeWidth={2}
									fillOpacity={1}
									fill="url(#ingressGradient)"
									isAnimationActive={false}
								/>
								<Area
									type="monotone"
									dataKey="egress"
									name="Deliver Rate"
									stroke="#a1a1aa"
									strokeWidth={1.5}
									strokeDasharray="4 4"
									fillOpacity={1}
									fill="url(#egressGradient)"
									isAnimationActive={false}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Cluster Nodes Health & Resource Monitoring */}
			<Card>
				<CardHeader className="py-3 px-5 border-b border-border">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<Server className="h-4 w-4 text-primary" />
							<div>
								<CardTitle className="text-sm font-semibold">
									Cluster Nodes Health
								</CardTitle>
								<CardDescription className="text-xs">
									File descriptors, memory watermark, and free disk space alarms
								</CardDescription>
							</div>
						</div>
						<Badge variant="outline" className="font-mono text-xs">
							{nodeTable.getRowModel().rows.length} node(s) active
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							{nodeTable.getHeaderGroups().map((hg) => (
								<TableRow key={hg.id}>
									{hg.headers.map((header) => {
										const sortDir = header.column.getIsSorted();
										return (
											<TableHead key={header.id}>
												<div
													className={
														header.column.getCanSort()
															? `flex items-center gap-1 cursor-pointer select-none hover:text-foreground ${sortDir ? "text-foreground font-semibold" : ""}`
															: ""
													}
													onClick={header.column.getToggleSortingHandler()}
												>
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
													{header.column.getCanSort() &&
														(sortDir === "asc" ? (
															<ArrowUp className="h-3 w-3 text-primary" />
														) : sortDir === "desc" ? (
															<ArrowDown className="h-3 w-3 text-primary" />
														) : (
															<ArrowUpDown className="h-3 w-3 text-muted-foreground/70" />
														))}
												</div>
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{nodeTable.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Network Listeners & Web Contexts */}
			{overview?.listeners && overview.listeners.length > 0 && (
				<Card>
					<CardHeader className="py-3 px-5 border-b border-border">
						<div className="flex items-center gap-2.5">
							<Radio className="h-4 w-4 text-primary" />
							<div>
								<CardTitle className="text-sm font-semibold">
									Ports and Network Listeners
								</CardTitle>
								<CardDescription className="text-xs">
									Active AMQP, HTTP management, clustering, and Prometheus ports
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-4 space-y-4">
						{listenersByNode.map(([node, listeners]) => (
							<div key={node} className="space-y-2">
								{/* only show the node label when the cluster has more than one node */}
								{listenersByNode.length > 1 && (
									<div className="text-[11px] font-mono text-muted-foreground truncate">
										{node}
									</div>
								)}
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
									{listeners.map((l, idx) => (
										<div
											key={idx}
											className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1"
										>
											<div className="flex items-center justify-between">
												<span className="font-semibold text-xs text-foreground uppercase tracking-wider">
													{l.protocol}
												</span>
												<Badge
													variant={l.tls ? "success" : "outline"}
													className="text-[10px] font-mono"
												>
													{l.tls ? "TLS" : "Plain"}
												</Badge>
											</div>
											<div className="text-lg font-bold font-mono text-primary">
												:{l.port}
											</div>
											<div className="text-[11px] font-mono text-muted-foreground truncate">
												bind: {l.ip_address}
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
