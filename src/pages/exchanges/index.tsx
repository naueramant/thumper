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
} from "@/hooks/useRabbitMQ/index.ts";
import { useUrlState } from "@/hooks/useUrlState/index.ts";
import { useVHost } from "@/hooks/useVHost/index.ts";
import type { Exchange } from "@/services/rabbitmq/types/exchange.ts";
import { EXCHANGE_TYPE_DESCRIPTIONS } from "@/services/rabbitmq/utils.ts";
import { Link } from "@tanstack/react-router";
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
	Eye,
	Plus,
	Search,
	Share2,
	Trash2,
	X,
} from "lucide-react";
import * as React from "react";

const columnHelper = createColumnHelper<Exchange>();

export function ExchangesPage() {
	const { selectedVHost, availableVHosts } = useVHost();
	const confirm = useConfirm();
	const { data: exchanges = [], isLoading } = useRabbitExchanges(selectedVHost);
	const { createExchange, deleteExchange } = useRabbitMutations();

	const [urlState, setUrlState] = useUrlState({
		q: "",
		type: "all",
		internal: "",
		qf: "",
		sort: "",
		dir: "",
	});
	const search = urlState.q;
	const typeFilter = urlState.type;
	const showInternal = urlState.internal === "1";
	const setSearch = (value: string) => setUrlState({ q: value });
	const setTypeFilter = (value: string) => setUrlState({ type: value });
	const setShowInternal = (updater: boolean | ((v: boolean) => boolean)) =>
		setUrlState((s) => ({
			internal: (
				typeof updater === "function"
					? updater(s.internal === "1")
					: updater
			)
				? "1"
				: "",
		}));
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

	// Add exchange form state
	const [newVHost, setNewVHost] = React.useState(
		selectedVHost === "all" ? "/" : selectedVHost,
	);
	const [newName, setNewName] = React.useState("");
	const [newType, setNewType] = React.useState<
		"direct" | "fanout" | "topic" | "headers"
	>("direct");
	const [newDurable, setNewDurable] = React.useState(true);
	const [newAutoDelete, setNewAutoDelete] = React.useState(false);
	const [newInternal, setNewInternal] = React.useState(false);
	const [newAltExchange, setNewAltExchange] = React.useState("");
	const [isCreating, setIsCreating] = React.useState(false);

	const typeOptions = React.useMemo(() => {
		const types = Array.from(new Set(exchanges.map((e) => e.type))).sort();
		return [
			{ label: "All Types", value: "all" },
			...types.map((t) => ({ label: t, value: t })),
		];
	}, [exchanges]);

	const clearFilters = () => {
		setUrlState({ type: "all" });
	};

	const quickFilterDefs = React.useMemo(
		() => [
			{
				id: "unused",
				label: "Unused",
				predicate: (e: Exchange) =>
					(e.message_stats?.publish_in ?? 0) === 0 &&
					(e.message_stats?.publish_out ?? 0) === 0,
			},
			{
				id: "unroutable",
				label: "Has unroutable",
				predicate: (e: Exchange) =>
					(e.message_stats?.return_unroutable ?? 0) > 0,
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

	const filteredExchanges = React.useMemo(() => {
		const activePredicates = quickFilterDefs.filter((f) =>
			activeQuickFilters.has(f.id),
		);
		return exchanges.filter(
			(e) =>
				((e.name || "(AMQP default)")
					.toLowerCase()
					.includes(search.toLowerCase()) ||
					e.type.toLowerCase().includes(search.toLowerCase()) ||
					e.vhost.toLowerCase().includes(search.toLowerCase())) &&
				(typeFilter === "all" || e.type === typeFilter) &&
				(showInternal || e.internal !== true) &&
				activePredicates.every((f) => f.predicate(e)),
		);
	}, [
		exchanges,
		search,
		typeFilter,
		showInternal,
		activeQuickFilters,
		quickFilterDefs,
	]);

	const handleCreateExchange = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newName.trim()) return;
		setIsCreating(true);
		try {
			const args: Record<string, unknown> = {};
			if (newAltExchange.trim()) {
				args["alternate-exchange"] = newAltExchange.trim();
			}
			await createExchange.mutateAsync({
				vhost: newVHost,
				name: newName.trim(),
				data: {
					type: newType,
					durable: newDurable,
					auto_delete: newAutoDelete,
					internal: newInternal,
					arguments: args,
				},
			});
			setIsAddModalOpen(false);
			setNewName("");
			setNewAltExchange("");
		} catch (err: any) {
			toast.error("Failed to create exchange", err.message || String(err));
		} finally {
			setIsCreating(false);
		}
	};

	const handleDeleteExchange = React.useCallback(
		async (ex: Exchange) => {
			if (
				!(await confirm({
					title: "Delete Exchange?",
					description: `Are you sure you want to delete exchange "${ex.name}" in vhost "${ex.vhost}"?`,
					confirmLabel: "Delete Exchange",
				}))
			)
				return;
			try {
				await deleteExchange.mutateAsync({ vhost: ex.vhost, name: ex.name });
			} catch (err: any) {
				toast.error("Failed to delete exchange", err.message || String(err));
			}
		},
		[confirm, deleteExchange],
	);

	const columns = React.useMemo(
		() => [
			columnHelper.accessor("name", {
				header: "Exchange Name",
				cell: (info) => {
					const ex = info.row.original;
					const displayName = ex.name || "(AMQP default)";
					const rawName = ex.name || "(default)";
					const isDefault = !ex.name;
					return (
						<Link
							to="/exchanges/$vhost/$name"
							params={{
								vhost: encodeURIComponent(ex.vhost),
								name: encodeURIComponent(rawName),
							}}
							className="flex flex-col group cursor-pointer"
						>
							<div className="flex items-center gap-1.5">
								<span className="font-semibold text-foreground group-hover:text-primary transition-colors font-mono text-xs flex items-center gap-1">
									{displayName}
									<ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
								</span>
								{isDefault && (
									<Badge variant="secondary" className="text-[9px] py-0">
										System Default
									</Badge>
								)}
							</div>
							<span className="text-[11px] text-muted-foreground font-mono">
								vhost: {ex.vhost}
							</span>
						</Link>
					);
				},
			}),
			columnHelper.accessor("type", {
				header: "Type",
				cell: (info) => {
					const type = info.getValue();
					return (
						<Tooltip content={EXCHANGE_TYPE_DESCRIPTIONS[type] ?? type}>
							<Badge
								variant="outline"
								className={`font-mono text-[10px] uppercase cursor-default ${
									type === "topic"
										? "border-purple-500/30 text-purple-400 bg-purple-500/10"
										: type === "fanout"
											? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
											: type === "headers"
												? "border-amber-500/30 text-amber-400 bg-amber-500/10"
												: "border-sky-500/30 text-sky-400 bg-sky-500/10"
								}`}
							>
								{type}
							</Badge>
						</Tooltip>
					);
				},
			}),
			columnHelper.accessor("durable", {
				header: "Features",
				cell: (info) => {
					const row = info.row.original;
					return (
						<div className="flex items-center gap-1">
							<Badge
								variant="outline"
								className="text-[10px] px-1.5 py-0 font-mono"
								title={row.durable ? "Durable" : "Transient"}
							>
								{row.durable ? "D" : "T"}
							</Badge>
							{row.internal && (
								<Badge
									variant="secondary"
									className="text-[10px] px-1.5 py-0 font-mono"
									title="Internal only"
								>
									I
								</Badge>
							)}
							{row.auto_delete && (
								<Badge
									variant="warning"
									className="text-[10px] px-1.5 py-0 font-mono"
									title="Auto Delete"
								>
									AD
								</Badge>
							)}
						</div>
					);
				},
			}),
			columnHelper.accessor(
				(row) => row.message_stats?.publish_in_details?.rate ?? 0,
				{
					id: "publishIn",
					header: "Msg In /s",
					cell: (info) => {
						const rate = info.getValue();
						return (
							<span className="font-mono text-xs text-primary font-medium">
								{rate.toFixed(1)}/s
							</span>
						);
					},
				},
			),
			columnHelper.accessor(
				(row) => row.message_stats?.publish_out_details?.rate ?? 0,
				{
					id: "publishOut",
					header: "Msg Out /s",
					cell: (info) => {
						const rate = info.getValue();
						return (
							<span className="font-mono text-xs text-muted-foreground">
								{rate.toFixed(1)}/s
							</span>
						);
					},
				},
			),
			columnHelper.display({
				id: "actions",
				header: "",
				cell: (info) => {
					const ex = info.row.original;
					const rawName = ex.name || "(default)";
					const isSystem = ex.name.startsWith("amq.") || !ex.name;
					return (
						<div className="flex items-center justify-end gap-1">
							<Link
								to="/exchanges/$vhost/$name"
								params={{
									vhost: encodeURIComponent(ex.vhost),
									name: encodeURIComponent(rawName),
								}}
							>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10"
									title="Explore Exchange Details & Routing"
								>
									<Eye className="h-3 w-3 mr-1" />
									Explore
								</Button>
							</Link>
							<span
								title={
									isSystem
										? "System exchanges cannot be deleted"
										: "Delete Exchange"
								}
								className="inline-flex"
							>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleDeleteExchange(ex)}
									disabled={isSystem}
									className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
								>
									<Trash2 className="h-3 w-3" />
								</Button>
							</span>
						</div>
					);
				},
			}),
		],
		[handleDeleteExchange],
	);

	const table = useReactTable({
		data: filteredExchanges,
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
							Exchanges
						</h1>
					</div>
					<p className="text-xs text-muted-foreground">
						Message routing exchanges and topology bindings in vhost{" "}
						<strong className="text-primary font-mono">{selectedVHost}</strong>
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						onClick={() => setIsAddModalOpen(true)}
						className="text-xs"
					>
						<Plus className="h-4 w-4 mr-1" /> Add Exchange
					</Button>
				</div>
			</div>

			{/* Main Table Card */}
			<Card>
				<CardHeader className="py-3 px-5 border-b border-border">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
								<Share2 className="h-4 w-4" />
							</div>
							<div className="space-y-0.5">
								<CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
									All Routing Exchanges
									{!isLoading && (
										<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
											{filteredExchanges.length}
										</span>
									)}
								</CardTitle>
								<CardDescription className="text-xs text-muted-foreground">
									AMQP Direct, Fanout, Topic, Headers, and custom message
									distributors
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
								]}
								onClearAll={clearFilters}
							/>
							<Button
								variant={showInternal ? "default" : "outline"}
								size="sm"
								className="h-8 text-xs"
								onClick={() => setShowInternal((v) => !v)}
							>
								{showInternal ? "Showing Internal" : "Show Internal"}
							</Button>
							<div className="relative w-full sm:w-72 shrink-0">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
								<input
									type="text"
									placeholder="Filter exchanges by name, type..."
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
							{table.getRowModel().rows.length ? (
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
											? "Loading exchanges from RabbitMQ..."
											: "No matching exchanges found."}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Add Exchange Modal */}
			{isAddModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
						<div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
							<div className="flex items-center gap-2">
								<Share2 className="h-4 w-4 text-primary" />
								<h3 className="text-sm font-bold text-foreground">
									Add New Exchange
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
							onSubmit={handleCreateExchange}
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
									Exchange Name
								</label>
								<input
									type="text"
									required
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="e.g. orders.topic or notifications"
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
											{ label: "Direct", value: "direct" },
											{ label: "Fanout", value: "fanout" },
											{ label: "Topic", value: "topic" },
											{ label: "Headers", value: "headers" },
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

							<div className="grid grid-cols-2 gap-3 pt-1">
								<label className="flex items-center gap-2 cursor-pointer">
									<Checkbox
										checked={newAutoDelete}
										onChange={(e) => setNewAutoDelete(e.target.checked)}
									/>
									<span className="text-muted-foreground">Auto-delete</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<Checkbox
										checked={newInternal}
										onChange={(e) => setNewInternal(e.target.checked)}
									/>
									<span className="text-muted-foreground">Internal only</span>
								</label>
							</div>

							<div className="space-y-1.5 pt-1">
								<label className="font-medium text-muted-foreground">
									Alternate Exchange (optional)
								</label>
								<input
									type="text"
									value={newAltExchange}
									onChange={(e) => setNewAltExchange(e.target.value)}
									placeholder="e.g. unroutable.deadletter"
									className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm text-foreground font-mono"
								/>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-border">
								<Button
									type="button"
									variant="outline"
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
									{isCreating ? "Creating..." : "Create Exchange"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
