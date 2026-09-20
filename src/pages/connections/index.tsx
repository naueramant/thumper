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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table/index.tsx";
import { useRabbitConnections } from "@/hooks/useRabbitMQ/index.ts";
import { useUrlState } from "@/hooks/useUrlState/index.ts";
import { useVHost } from "@/hooks/useVHost/index.ts";
import type { Connection } from "@/services/rabbitmq/types/connection.ts";
import { formatBytes } from "@/services/rabbitmq/utils.ts";
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
	ArrowLeftRight,
	ArrowUp,
	ArrowUpDown,
	Lock,
	Search,
	ShieldCheck,
} from "lucide-react";
import * as React from "react";

const columnHelper = createColumnHelper<Connection>();

export function ConnectionsPage() {
	const { selectedVHost } = useVHost();
	const { data: connections = [], isLoading } =
		useRabbitConnections(selectedVHost);

	const [urlState, setUrlState] = useUrlState({
		q: "",
		tls: "",
		state: "all",
		node: "all",
		qf: "",
		sort: "",
		dir: "",
	});
	const search = urlState.q;
	const tlsOnly = urlState.tls === "1";
	const stateFilter = urlState.state;
	const nodeFilter = urlState.node;
	const setSearch = (value: string) => setUrlState({ q: value });
	const setTlsOnly = (value: boolean) => setUrlState({ tls: value ? "1" : "" });
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

	const stateOptions = React.useMemo(() => {
		const states = Array.from(new Set(connections.map((c) => c.state))).sort();
		return [
			{ label: "All States", value: "all" },
			...states.map((s) => ({ label: s, value: s })),
		];
	}, [connections]);

	const nodeOptions = React.useMemo(() => {
		const nodes = Array.from(
			new Set(connections.map((c) => c.node).filter(Boolean)),
		).sort() as string[];
		return [
			{ label: "All Nodes", value: "all" },
			...nodes.map((n) => ({ label: n, value: n })),
		];
	}, [connections]);

	const clearFilters = () => {
		setUrlState({ state: "all", node: "all", qf: "" });
	};

	const quickFilterDefs = React.useMemo(
		() => [
			{
				id: "blocked",
				label: "Blocked",
				predicate: (c: Connection) =>
					c.state === "blocked" || c.state === "blocking",
			},
			{
				id: "noChannels",
				label: "No channels",
				predicate: (c: Connection) => (c.channels ?? 0) === 0,
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

	const filteredConnections = React.useMemo(() => {
		const activePredicates = quickFilterDefs.filter((f) =>
			activeQuickFilters.has(f.id),
		);
		return connections.filter((c) => {
			const matchSearch =
				c.name.toLowerCase().includes(search.toLowerCase()) ||
				(c.user && c.user.toLowerCase().includes(search.toLowerCase())) ||
				(c.vhost && c.vhost.toLowerCase().includes(search.toLowerCase())) ||
				(c.node && c.node.toLowerCase().includes(search.toLowerCase()));

			const matchTls = tlsOnly ? c.ssl === true : true;
			const matchState = stateFilter === "all" || c.state === stateFilter;
			const matchNode = nodeFilter === "all" || c.node === nodeFilter;
			const matchQuick = activePredicates.every((f) => f.predicate(c));
			return matchSearch && matchTls && matchState && matchNode && matchQuick;
		});
	}, [
		connections,
		search,
		tlsOnly,
		stateFilter,
		nodeFilter,
		activeQuickFilters,
		quickFilterDefs,
	]);

	const columns = React.useMemo(
		() => [
			columnHelper.accessor("name", {
				header: "Client / Peer Address",
				cell: (info) => {
					const conn = info.row.original;
					const clientProd = conn.client_properties?.product || "AMQP Client";
					const clientVer = conn.client_properties?.version
						? `v${conn.client_properties.version}`
						: "";
					return (
						<Link
							to="/connections/$name"
							params={{ name: encodeURIComponent(conn.name) }}
							className="flex flex-col max-w-xs group"
						>
							<span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate font-mono text-xs">
								{info.getValue()}
							</span>
							<span className="text-[11px] text-muted-foreground font-mono truncate">
								{clientProd} {clientVer}
							</span>
						</Link>
					);
				},
			}),
			columnHelper.accessor("user", {
				header: "User",
				cell: (info) => (
					<span className="font-mono text-xs">{info.getValue() || "—"}</span>
				),
			}),
			columnHelper.accessor("vhost", {
				header: "VHost",
				cell: (info) => (
					<span className="font-mono text-xs">{info.getValue()}</span>
				),
			}),
			columnHelper.accessor("state", {
				header: "State",
				cell: (info) => {
					const state = info.getValue() || "running";
					return (
						<Badge
							variant={
								state === "running"
									? "success"
									: state === "blocked"
										? "destructive"
										: "warning"
							}
							className="text-[10px] uppercase font-mono"
						>
							{state}
						</Badge>
					);
				},
			}),
			columnHelper.accessor("ssl", {
				header: "Security",
				cell: (info) => (
					<div className="flex items-center gap-1">
						{info.getValue() ? (
							<Badge variant="success" className="text-[10px] font-mono py-0">
								<Lock className="h-2.5 w-2.5 mr-0.5" /> TLS
							</Badge>
						) : (
							<Badge
								variant="outline"
								className="text-[10px] font-mono py-0 text-muted-foreground"
							>
								Plain
							</Badge>
						)}
					</div>
				),
			}),
			columnHelper.accessor("channels", {
				header: "Channels",
				cell: (info) => (
					<span className="font-mono text-xs font-semibold">
						{info.getValue() ?? 0}
					</span>
				),
			}),
			columnHelper.accessor("recv_oct", {
				header: "Network Recv",
				cell: (info) => (
					<span className="font-mono text-xs text-muted-foreground">
						{formatBytes(info.getValue() ?? 0)}
					</span>
				),
			}),
			columnHelper.accessor("send_oct", {
				header: "Network Sent",
				cell: (info) => (
					<span className="font-mono text-xs text-muted-foreground">
						{formatBytes(info.getValue() ?? 0)}
					</span>
				),
			}),
			columnHelper.accessor("node", {
				header: "Node",
				cell: (info) => (
					<span className="font-mono text-[11px] text-muted-foreground">
						{info.getValue()}
					</span>
				),
			}),
			columnHelper.display({
				id: "actions",
				header: "",
				cell: (info) => (
					<Link
						to="/connections/$name"
						params={{ name: encodeURIComponent(info.row.original.name) }}
					>
						<Button
							variant="outline"
							size="sm"
							className="h-6 text-[11px] px-2"
						>
							Inspect
						</Button>
					</Link>
				),
			}),
		],
		[],
	);

	const table = useReactTable({
		data: filteredConnections,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="space-y-5">
			{/* Top Title */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Connections
						</h1>
					</div>
					<p className="text-xs text-muted-foreground">
						Active TCP & AMQP client connections in vhost{" "}
						<strong className="text-primary font-mono">{selectedVHost}</strong>
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant={tlsOnly ? "secondary" : "outline"}
						size="sm"
						onClick={() => setTlsOnly(!tlsOnly)}
						className="text-xs"
					>
						<ShieldCheck className="h-3.5 w-3.5 mr-1" />
						{tlsOnly ? "Showing TLS Only" : "TLS/SSL Only"}
					</Button>
				</div>
			</div>

			{/* Main Table Card */}
			<Card>
				<CardHeader className="py-3 px-5 border-b border-border">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
								<ArrowLeftRight className="h-4 w-4" />
							</div>
							<div className="space-y-0.5">
								<CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
									All Client Connections
									{!isLoading && (
										<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
											{filteredConnections.length}
										</span>
									)}
								</CardTitle>
								<CardDescription className="text-xs text-muted-foreground">
									Client telemetry, connection state, SSL/TLS security, and
									frame transmission
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
									placeholder="Filter connections by client, user, host..."
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
											? "Loading connections from RabbitMQ..."
											: "No active client connections found."}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
