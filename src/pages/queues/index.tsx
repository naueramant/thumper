import { useConfirm } from "@/components/ConfirmDialog/index.tsx";
import { QuickFilters } from "@/components/common/QuickFilters/index.tsx";
import { TableFilters } from "@/components/common/TableFilters/index.tsx";
import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
import { Checkbox } from "@/components/ui/checkbox/index.tsx";
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
	useRabbitExchanges,
	useRabbitMutations,
	useRabbitQueues,
	useRabbitShovelPlugin,
} from "@/hooks/useRabbitMQ/index.ts";
import { MoveMessagesDialog } from "./components/MoveMessagesDialog.tsx";
import { isDlqSink, isDlqSource, getDlqTargetExchange } from "./utils/dlqUtils.ts";
import { useUrlState } from "@/hooks/useUrlState/index.ts";
import { useVHost } from "@/hooks/useVHost/index.ts";
import type { Queue } from "@/services/rabbitmq/types/queue.ts";
import {
	formatBytes,
	QUEUE_STATE_DESCRIPTIONS,
	QUEUE_TYPE_DESCRIPTIONS,
} from "@/services/rabbitmq/utils.ts";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth/index.ts";
import { useResourcePermissions } from "@/hooks/usePermissions/index.ts";
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
	ArrowUp,
	ArrowUpDown,
	ChevronRight,
	Eraser,
	Layers,
	Plus,
	Search,
	Share2,
	ShieldAlert,
	Shovel,
	X,
} from "lucide-react";
import * as React from "react";

const columnHelper = createColumnHelper<Queue>();

export function QueuesPage() {
	const { selectedVHost, availableVHosts } = useVHost();
	const { user } = useAuth();
	const permissions = useResourcePermissions({ vhost: selectedVHost });
	const {
		hasVHostAccess,
		canConfigure,
		canRead,
		isAdminWithoutVHostPerms,
		isLoading: isPermissionsLoading,
	} = permissions;

	const confirm = useConfirm();
	const {
		data: queues = [],
		isLoading,
		error: queuesError,
	} = useRabbitQueues(selectedVHost);
	const { data: isShovelEnabled = false } = useRabbitShovelPlugin();
	const { createQueue, purgeQueue } = useRabbitMutations();
	const [shovelingQueue, setShovelingQueue] = React.useState<Queue | null>(null);

	const [urlState, setUrlState] = useUrlState({
		q: "",
		type: "all",
		state: "all",
		node: "all",
		qf: "",
		sort: "",
		dir: "",
	});
	const search = urlState.q;
	const typeFilter = urlState.type;
	const stateFilter = urlState.state;
	const nodeFilter = urlState.node;
	const setSearch = (value: string) => setUrlState({ q: value });
	const setTypeFilter = (value: string) => setUrlState({ type: value });
	const setStateFilter = (value: string) => setUrlState({ state: value });
	const setNodeFilter = (value: string) => setUrlState({ node: value });
	const activeQuickFilters = React.useMemo(
		() => new Set(urlState.qf ? urlState.qf.split(",") : []),
		[urlState.qf],
	);
	// Memoized: a fresh array here makes useReactTable rebuild every row model
	// on every render, including each 5s poll.
	const sorting = React.useMemo<SortingState>(
		() =>
			urlState.sort
				? [{ id: urlState.sort, desc: urlState.dir === "desc" }]
				: [],
		[urlState.sort, urlState.dir],
	);
	const setSorting: React.Dispatch<React.SetStateAction<SortingState>> = (
		updater,
	) => {
		const next = typeof updater === "function" ? updater(sorting) : updater;
		const first = next[0];
		setUrlState({
			sort: first?.id ?? "",
			dir: first ? (first.desc ? "desc" : "asc") : "",
		});
	};
	const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

	// Add queue state
	const [newVHost, setNewVHost] = React.useState(
		selectedVHost === "all"
			? availableVHosts.some((v) => v.name === "/")
				? "/"
				: availableVHosts[0]?.name || "/"
			: selectedVHost,
	);
	const [newName, setNewName] = React.useState("");
	const [newType, setNewType] = React.useState<"classic" | "quorum" | "stream">(
		"classic",
	);
	const [newDurable, setNewDurable] = React.useState(true);
	const [newAutoDelete, setNewAutoDelete] = React.useState(false);
	const [newTtl, setNewTtl] = React.useState("");
	const [newMaxLength, setNewMaxLength] = React.useState("");
	const [newDlx, setNewDlx] = React.useState("");
	const [isCreating, setIsCreating] = React.useState(false);

	// Exchanges for Dead Letter Exchange autocompletion
	const { data: vhostExchanges = [] } = useRabbitExchanges(newVHost);
	const dlxOptions = React.useMemo(() => {
		return vhostExchanges
			.filter((ex) => ex.name && ex.name.trim() !== "")
			.map((ex) => ({
				label: ex.name,
				value: ex.name,
				subLabel: ex.type,
				icon: <Share2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
			}));
	}, [vhostExchanges]);

	const typeOptions = React.useMemo(() => {
		const types = Array.from(
			new Set(queues.map((q) => q.type || "classic")),
		).sort();
		return [
			{ label: "All Types", value: "all" },
			...types.map((t) => ({ label: t, value: t })),
		];
	}, [queues]);

	const stateOptions = React.useMemo(() => {
		const states = Array.from(
			new Set(queues.map((q) => q.state || "running")),
		).sort();
		return [
			{ label: "All States", value: "all" },
			...states.map((s) => ({ label: s, value: s })),
		];
	}, [queues]);

	const nodeOptions = React.useMemo(() => {
		const nodes = Array.from(
			new Set(queues.map((q) => q.node).filter(Boolean)),
		).sort() as string[];
		return [
			{ label: "All Nodes", value: "all" },
			...nodes.map((n) => ({ label: n, value: n })),
		];
	}, [queues]);

	const clearFilters = () => {
		setUrlState({ type: "all", state: "all", node: "all", qf: "" });
	};

	const quickFilterDefs = React.useMemo(
		() => [
			{
				id: "nonEmpty",
				label: "Non-empty",
				predicate: (q: Queue) => q.messages > 0,
			},
			{
				id: "empty",
				label: "Empty",
				predicate: (q: Queue) => q.messages === 0,
			},
			{
				id: "unacked",
				label: "Unacked",
				predicate: (q: Queue) => q.messages_unacknowledged > 0,
			},
			{
				id: "noConsumers",
				label: "No consumers",
				predicate: (q: Queue) => q.consumers === 0,
			},
			{
				id: "notRunning",
				label: "Not running",
				predicate: (q: Queue) => (q.state || "running") !== "running",
			},
			{
				id: "dlq",
				label: "DLQ Queues",
				predicate: (q: Queue) => isDlqSink(q) || isDlqSource(q),
			},
		],
		[],
	);

	const toggleQuickFilter = (id: string) => {
		setUrlState((s) => {
			const next = new Set(s.qf ? s.qf.split(",") : []);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return { qf: Array.from(next).join(",") };
		});
	};

	const filteredQueues = React.useMemo(() => {
		const activePredicates = quickFilterDefs.filter((f) =>
			activeQuickFilters.has(f.id),
		);
		return queues.filter(
			(q) =>
				(q.name.toLowerCase().includes(search.toLowerCase()) ||
					q.vhost.toLowerCase().includes(search.toLowerCase()) ||
					(q.type && q.type.toLowerCase().includes(search.toLowerCase())) ||
					(q.node && q.node.toLowerCase().includes(search.toLowerCase()))) &&
				(typeFilter === "all" || (q.type || "classic") === typeFilter) &&
				(stateFilter === "all" || (q.state || "running") === stateFilter) &&
				(nodeFilter === "all" || q.node === nodeFilter) &&
				activePredicates.every((f) => f.predicate(q)),
		);
	}, [
		queues,
		search,
		typeFilter,
		stateFilter,
		nodeFilter,
		activeQuickFilters,
		quickFilterDefs,
	]);

	const handleCreateQueue = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newName.trim()) return;
		setIsCreating(true);
		try {
			const args: Record<string, unknown> = {};
			if (newType !== "classic") {
				args["x-queue-type"] = newType;
			}
			if (newTtl.trim()) {
				args["x-message-ttl"] = Number(newTtl);
			}
			if (newMaxLength.trim()) {
				args["x-max-length"] = Number(newMaxLength);
			}
			if (newDlx.trim()) {
				args["x-dead-letter-exchange"] = newDlx.trim();
			}

			await createQueue.mutateAsync({
				vhost: newVHost,
				name: newName.trim(),
				data: {
					durable: newDurable,
					auto_delete: newAutoDelete,
					arguments: args,
				},
			});
			setIsAddModalOpen(false);
			setNewName("");
			setNewTtl("");
			setNewMaxLength("");
			setNewDlx("");
		} catch (err: any) {
			toast.error("Failed to declare queue", err.message || String(err));
		} finally {
			setIsCreating(false);
		}
	};

	const handlePurgeQueue = React.useCallback(
		async (q: Queue) => {
			if (
				!(await confirm({
					title: "Purge Queue?",
					description: `Are you sure you want to purge all messages from queue "${q.name}"?`,
					confirmLabel: "Purge Messages",
					variant: "warning",
				}))
			)
				return;
			try {
				const res = await purgeQueue.mutateAsync({
					vhost: q.vhost,
					name: q.name,
				});
				toast.success(
					`Purged ${res.message_count ?? "all"} message(s) from ${q.name}.`,
				);
			} catch (err: any) {
				toast.error("Failed to purge queue", err.message || String(err));
			}
		},
		[confirm, purgeQueue],
	);

	const handleShovelQueue = React.useCallback((q: Queue) => {
		setShovelingQueue(q);
	}, []);

	const columns = React.useMemo(
		() => [
			columnHelper.accessor("name", {
				header: "Queue Name",
				cell: (info) => {
					const q = info.row.original;
					return (
						<Link
							to="/queues/$vhost/$name"
							params={{
								vhost: encodeURIComponent(q.vhost),
								name: encodeURIComponent(q.name),
							}}
							className="flex flex-col group cursor-pointer"
						>
							<span className="font-semibold text-foreground group-hover:text-primary transition-colors font-mono text-xs flex items-center gap-1.5 flex-wrap">
								{info.getValue()}
								{isDlqSink(q) && (
									<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium leading-none border border-rose-500/30 text-rose-500 bg-rose-500/10">
										DLQ
									</span>
								)}
								{isDlqSource(q) && (
									<span
										className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium leading-none border border-amber-500/30 text-amber-500 bg-amber-500/10"
										title={`Configured with dead-letter exchange: ${getDlqTargetExchange(q)}`}
									>
										DLX
									</span>
								)}
								<ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
							</span>
							<span className="text-[11px] text-muted-foreground font-mono">
								vhost: {q.vhost}
							</span>
						</Link>
					);
				},
			}),
			columnHelper.accessor("type", {
				header: "Type",
				cell: (info) => {
					const type = info.getValue() || "classic";
					return (
						<Tooltip content={QUEUE_TYPE_DESCRIPTIONS[type] ?? type}>
							<Badge
								variant="outline"
								className={`text-[10px] capitalize cursor-default ${
									type === "quorum"
										? "border-purple-500/30 text-purple-400 bg-purple-500/10"
										: type === "stream"
											? "border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
											: "border-orange-500/30 text-orange-400 bg-orange-500/10"
								}`}
							>
								{type}
							</Badge>
						</Tooltip>
					);
				},
			}),
			columnHelper.accessor("state", {
				header: "State",
				cell: (info) => {
					const state = info.getValue() || "running";
					return (
						<Tooltip content={QUEUE_STATE_DESCRIPTIONS[state] ?? state}>
							<Badge
								variant={state === "running" ? "success" : "warning"}
								className="text-[10px] capitalize cursor-default"
							>
								{state}
							</Badge>
						</Tooltip>
					);
				},
			}),
			columnHelper.accessor("messages_ready", {
				header: "Ready",
				cell: (info) => (
					<span className="font-mono text-xs font-semibold text-primary">
						{(info.getValue() ?? 0).toLocaleString()}
					</span>
				),
			}),
			columnHelper.accessor("messages_unacknowledged", {
				header: "Unacked",
				cell: (info) => {
					const val = info.getValue() ?? 0;
					return (
						<span
							className={`font-mono text-xs ${val > 0 ? "text-amber-500 font-semibold" : "text-muted-foreground"}`}
						>
							{val.toLocaleString()}
						</span>
					);
				},
			}),
			columnHelper.accessor("messages", {
				header: "Total",
				cell: (info) => (
					<span className="font-mono text-xs font-medium">
						{(info.getValue() ?? 0).toLocaleString()}
					</span>
				),
			}),
			columnHelper.accessor("consumers", {
				header: "Consumers",
				cell: (info) => (
					<span className="font-mono text-xs">{info.getValue() ?? 0}</span>
				),
			}),
			columnHelper.accessor(
				(row) => row.message_stats?.publish_details?.rate ?? 0,
				{
					id: "pubRate",
					header: "Pub Rate",
					cell: (info) => (
						<span className="font-mono text-xs text-primary">
							{info.getValue().toFixed(1)}/s
						</span>
					),
				},
			),
			columnHelper.accessor(
				(row) => row.message_stats?.deliver_get_details?.rate ?? 0,
				{
					id: "deliverRate",
					header: "Deliver Rate",
					cell: (info) => (
						<span className="font-mono text-xs text-muted-foreground">
							{info.getValue().toFixed(1)}/s
						</span>
					),
				},
			),
			columnHelper.accessor("memory", {
				header: "Memory",
				cell: (info) => (
					<span className="font-mono text-[11px] text-muted-foreground">
						{formatBytes(info.getValue() ?? 0)}
					</span>
				),
			}),
			columnHelper.display({
				id: "actions",
				header: "",
				cell: (info) => {
					const q = info.row.original;
					const isStream = q.type === "stream";
					return (
						<div className="flex items-center justify-end gap-1">
							{isShovelEnabled && (
								<span
									title="Move messages via Shovel"
									className="inline-flex"
								>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleShovelQueue(q)}
										className="h-6 w-6 p-0 text-primary hover:bg-primary/10"
									>
										<Shovel className="h-3 w-3" />
									</Button>
								</span>
							)}
							<span
								title={
									!canRead && !isPermissionsLoading
										? "Purge disabled: Read permission required on this queue"
										: isStream
											? "Streams cannot be purged"
											: "Purge Queue Messages"
								}
								className="inline-flex"
							>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handlePurgeQueue(q)}
									disabled={isStream || (!canRead && !isPermissionsLoading)}
									className="h-6 w-6 p-0 text-amber-500 hover:bg-amber-500/10 disabled:opacity-40"
								>
									<Eraser className="h-3 w-3" />
								</Button>
							</span>
						</div>
					);
				},
			}),
		],
		[handlePurgeQueue, handleShovelQueue, isShovelEnabled, canRead, isPermissionsLoading],
	);

	const table = useReactTable({
		data: filteredQueues,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="space-y-5">
			{/* Header */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Queues & Streams
						</h1>
					</div>
					<p className="text-xs text-muted-foreground">
						Classic queues, Quorum replicated sets, and RabbitMQ Streams{" "}
						{selectedVHost === "all" ? (
							"across all virtual hosts"
						) : (
							<>
								in vhost{" "}
								<strong className="text-primary font-mono">{selectedVHost}</strong>
							</>
						)}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{canConfigure ? (
						<Button
							size="sm"
							onClick={() => {
								if (
									newVHost === "all" ||
									!availableVHosts.some((v) => v.name === newVHost)
								) {
									setNewVHost(
										availableVHosts.some((v) => v.name === "/")
											? "/"
											: availableVHosts[0]?.name || "/",
									);
								}
								setIsAddModalOpen(true);
							}}
							className="text-xs"
						>
							<Plus className="h-4 w-4 mr-1" /> Add Queue
						</Button>
					) : (
						<Tooltip content="Add Queue disabled: Configure permission required on this virtual host">
							<Button
								size="sm"
								disabled
								className="text-xs opacity-50 cursor-not-allowed"
							>
								<Plus className="h-4 w-4 mr-1" /> Add Queue
							</Button>
						</Tooltip>
					)}
				</div>
			</div>

			{/* Limited VHost Access Banner */}
			{selectedVHost !== "all" && (!hasVHostAccess || isAdminWithoutVHostPerms) && !isPermissionsLoading && (
				<div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-700 dark:text-amber-400">
					<div className="flex items-start sm:items-center gap-2.5">
						<ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
						<div>
							<span className="font-semibold">Limited Access Notice:</span> You do not have permissions granted on virtual host{" "}
							<span className="font-mono font-bold text-foreground">{selectedVHost}</span>. Queue operations (declaring, reading, purging) are restricted by RabbitMQ.
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

			{/* Main Table Card */}
			<Card>
				<CardHeader className="py-3 px-5 border-b border-border">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
								<Layers className="h-4 w-4" />
							</div>
							<div className="space-y-0.5">
								<CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
									All Queues
									{!isLoading && (
										<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
											{filteredQueues.length}
										</span>
									)}
								</CardTitle>
								<CardDescription className="text-xs text-muted-foreground">
									Queue depth, message rates, consumer readiness, and
									replication status
								</CardDescription>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
							<QuickFilters
								filters={quickFilterDefs.map((f) => ({
									id: f.id,
									label: f.label,
									active: activeQuickFilters.has(f.id),
									onToggle: () => toggleQuickFilter(f.id),
								}))}
							/>
							<TableFilters
								filters={[
									{
										id: "type",
										label: "Type",
										value: typeFilter,
										onChange: setTypeFilter,
										options: typeOptions,
									},
									{
										id: "state",
										label: "State",
										value: stateFilter,
										onChange: setStateFilter,
										options: stateOptions,
									},
									{
										id: "node",
										label: "Node",
										value: nodeFilter,
										onChange: setNodeFilter,
										options: nodeOptions,
									},
								]}
								onClearAll={clearFilters}
							/>
							<div className="relative w-full sm:w-72 shrink-0">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
								<input
									type="text"
									placeholder="Filter queues by name, vhost, type..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="h-8 w-full rounded-md border border-border/70 bg-muted/20 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
								/>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((hg) => (
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
							{queuesError ? (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-32 text-center text-muted-foreground text-xs"
									>
										<div className="flex flex-col items-center justify-center gap-1.5 py-4">
											<div className="p-2 rounded-full bg-amber-500/10 text-amber-500 mb-1 border border-amber-500/20">
												<ShieldAlert className="h-5 w-5" />
											</div>
											<span className="font-semibold text-foreground">
												{(queuesError as any)?.status === 401 || (queuesError as any)?.status === 403
													? "Access Denied"
													: "Failed to load queues"}
											</span>
											<span className="text-muted-foreground max-w-sm">
												{(queuesError as any)?.status === 401 || (queuesError as any)?.status === 403
													? `You do not have permission to view queues in virtual host "${selectedVHost}".`
													: queuesError.message || "An error occurred while loading queues."}
											</span>
										</div>
									</TableCell>
								</TableRow>
							) : table.getRowModel().rows.length ? (
								table.getRowModel().rows.map((row) => (
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
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-28 text-center text-muted-foreground text-xs"
									>
										{isLoading
											? "Loading queues from RabbitMQ..."
											: "No queues found in this virtual host."}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Add Queue Modal */}
			{isAddModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
						<div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
							<div className="flex items-center gap-2">
								<Layers className="h-4 w-4 text-primary" />
								<h3 className="text-sm font-bold text-foreground">
									Add New Queue
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsAddModalOpen(false)}
								className="p-1 rounded text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<form
							onSubmit={handleCreateQueue}
							className="p-6 space-y-4 text-sm"
						>
							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Virtual Host
								</label>
								<Dropdown
									value={newVHost}
									onChange={(v) => setNewVHost(v as string)}
									options={availableVHosts.map((vh) => ({
										label: vh.name,
										value: vh.name,
									}))}
									className="w-full"
									buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
									contentClassName="w-full"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Queue Name
								</label>
								<input
									type="text"
									required
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="e.g. orders.checkout or emails.high-priority"
									className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm text-foreground font-mono"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<label className="font-medium text-muted-foreground">
										Type
									</label>
									<Dropdown
										value={newType}
										onChange={(v) => setNewType(v as typeof newType)}
										options={[
											{ label: "Classic", value: "classic" },
											{ label: "Quorum (HA Replicated)", value: "quorum" },
											{ label: "Stream (Append-only Log)", value: "stream" },
										]}
										className="w-full"
										buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
										contentClassName="w-full"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="font-medium text-muted-foreground">
										Durability
									</label>
									<Dropdown
										value={newDurable ? "durable" : "transient"}
										onChange={(v) => setNewDurable(v === "durable")}
										options={[
											{ label: "Durable", value: "durable" },
											{ label: "Transient", value: "transient" },
										]}
										className="w-full"
										buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
										contentClassName="w-full"
									/>
								</div>
							</div>

							<div className="pt-1">
								<label className="flex items-center gap-2 cursor-pointer">
									<Checkbox
										checked={newAutoDelete}
										onChange={(e) => setNewAutoDelete(e.target.checked)}
									/>
									<span className="text-muted-foreground">
										Auto-delete (delete when all consumers disconnect)
									</span>
								</label>
							</div>

							{/* Arguments Presets */}
							<div className="space-y-3 pt-2 border-t border-border">
								<div className="text-xs font-semibold text-muted-foreground">
									Optional Arguments
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-1.5">
										<label className="text-xs text-muted-foreground">
											Message TTL (ms)
										</label>
										<input
											type="number"
											value={newTtl}
											onChange={(e) => setNewTtl(e.target.value)}
											placeholder="e.g. 60000"
											className="h-9 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="text-xs text-muted-foreground">
											Max Length (msgs)
										</label>
										<input
											type="number"
											value={newMaxLength}
											onChange={(e) => setNewMaxLength(e.target.value)}
											placeholder="e.g. 10000"
											className="h-9 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
										/>
									</div>
								</div>
								<div className="space-y-1.5">
									<label className="text-xs text-muted-foreground">
										Dead Letter Exchange
									</label>
									<Dropdown<string>
										value={newDlx}
										onChange={(val) => setNewDlx(val)}
										options={dlxOptions}
										searchable
										clearable
										allowCustom
										searchPlaceholder="Filter exchanges..."
										placeholder="e.g. dlx.exchange"
										align="left"
										className="w-full"
										buttonClassName="h-9 w-full justify-between px-3 text-sm font-mono bg-muted/20 border-border"
										contentClassName="w-full"
									/>
								</div>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-border">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => setIsAddModalOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									size="sm"
									disabled={isCreating || !newName.trim()}
								>
									{isCreating ? "Declaring..." : "Add Queue"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{shovelingQueue && (
				<MoveMessagesDialog
					isOpen={Boolean(shovelingQueue)}
					onClose={() => setShovelingQueue(null)}
					vhost={shovelingQueue.vhost}
					sourceQueue={shovelingQueue.name}
					totalMessages={shovelingQueue.messages ?? 0}
					queueType={shovelingQueue.type}
				/>
			)}
		</div>
	);
}
