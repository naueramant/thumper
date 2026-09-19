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
import { useRabbitChannels } from "@/hooks/useRabbitMQ/index.ts";
import { useUrlState } from "@/hooks/useUrlState/index.ts";
import { useVHost } from "@/hooks/useVHost/index.ts";
import type { Channel } from "@/services/rabbitmq/types/channel.ts";
import { Link } from "@tanstack/react-router";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Radio, Search } from "lucide-react";
import * as React from "react";

const columnHelper = createColumnHelper<Channel>();

export function ChannelsPage() {
	const { selectedVHost } = useVHost();
	const { data: channels = [], isLoading } = useRabbitChannels(selectedVHost);

	const [urlState, setUrlState] = useUrlState({
		q: "",
		state: "all",
		mode: "all",
		node: "all",
		qf: "",
		sort: "",
		dir: "",
	});
	const search = urlState.q;
	const stateFilter = urlState.state;
	const modeFilter = urlState.mode;
	const nodeFilter = urlState.node;
	const setSearch = (value: string) => setUrlState({ q: value });
	const setStateFilter = (value: string) => setUrlState({ state: value });
	const setModeFilter = (value: string) => setUrlState({ mode: value });
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
		const states = Array.from(
			new Set(channels.map((c) => c.state || "running")),
		).sort();
		return [
			{ label: "All States", value: "all" },
			...states.map((s) => ({ label: s, value: s })),
		];
	}, [channels]);

	const modeOf = (c: Channel) =>
		c.confirm ? "Confirm" : c.transactional ? "Tx" : "Standard";

	const modeOptions = React.useMemo(() => {
		const modes = Array.from(new Set(channels.map(modeOf))).sort();
		return [
			{ label: "All Modes", value: "all" },
			...modes.map((m) => ({ label: m, value: m })),
		];
	}, [channels]);

	const nodeOptions = React.useMemo(() => {
		const nodes = Array.from(
			new Set(channels.map((c) => c.node).filter(Boolean)),
		).sort() as string[];
		return [
			{ label: "All Nodes", value: "all" },
			...nodes.map((n) => ({ label: n, value: n })),
		];
	}, [channels]);

	const clearFilters = () => {
		setUrlState({ state: "all", mode: "all", node: "all", qf: "" });
	};

	const quickFilterDefs = React.useMemo(
		() => [
			{
				id: "unacked",
				label: "Unacked",
				predicate: (c: Channel) => (c.messages_unacknowledged ?? 0) > 0,
			},
			{
				id: "unconfirmed",
				label: "Unconfirmed",
				predicate: (c: Channel) => (c.messages_unconfirmed ?? 0) > 0,
			},
			{
				id: "noConsumers",
				label: "No consumers",
				predicate: (c: Channel) => (c.consumer_count ?? 0) === 0,
			},
			{
				id: "flow",
				label: "Flow control",
				predicate: (c: Channel) => c.state === "flow",
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

	const filteredChannels = React.useMemo(() => {
		const activePredicates = quickFilterDefs.filter((f) =>
			activeQuickFilters.has(f.id),
		);
		return channels.filter(
			(c) =>
				(c.name.toLowerCase().includes(search.toLowerCase()) ||
					(c.user && c.user.toLowerCase().includes(search.toLowerCase())) ||
					(c.vhost && c.vhost.toLowerCase().includes(search.toLowerCase())) ||
					(c.node && c.node.toLowerCase().includes(search.toLowerCase()))) &&
				(stateFilter === "all" || (c.state || "running") === stateFilter) &&
				(modeFilter === "all" || modeOf(c) === modeFilter) &&
				(nodeFilter === "all" || c.node === nodeFilter) &&
				activePredicates.every((f) => f.predicate(c)),
		);
	}, [
		channels,
		search,
		stateFilter,
		modeFilter,
		nodeFilter,
		activeQuickFilters,
		quickFilterDefs,
	]);

	const columns = React.useMemo(
		() => [
			columnHelper.accessor("name", {
				header: "Channel Name",
				cell: (info) => {
					const ch = info.row.original;
					return (
						<Link
							to="/channels/$name"
							params={{ name: encodeURIComponent(ch.name) }}
							className="flex flex-col max-w-sm group"
						>
							<span className="font-semibold text-foreground group-hover:text-primary transition-colors font-mono text-xs truncate">
								{info.getValue()}
							</span>
							<span className="text-[11px] text-muted-foreground font-mono">
								ch #{ch.number ?? 1} &bull; node: {ch.node}
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
									: state === "flow"
										? "warning"
										: "outline"
							}
							className="text-[10px] uppercase font-mono"
						>
							{state}
						</Badge>
					);
				},
			}),
			columnHelper.accessor("confirm", {
				header: "Mode",
				cell: (info) => {
					const isConfirm = info.getValue();
					const isTransactional = info.row.original.transactional;
					return (
						<Badge
							variant="outline"
							className="font-mono text-[10px] uppercase"
						>
							{isConfirm ? "Confirm" : isTransactional ? "Tx" : "Standard"}
						</Badge>
					);
				},
			}),
			columnHelper.accessor("prefetch_count", {
				header: "Prefetch",
				cell: (info) => (
					<span className="font-mono text-xs">{info.getValue() ?? 0}</span>
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
							{val}
						</span>
					);
				},
			}),
			columnHelper.accessor("messages_unconfirmed", {
				header: "Unconfirmed",
				cell: (info) => {
					const val = info.getValue() ?? 0;
					return (
						<span
							className={`font-mono text-xs ${val > 0 ? "text-amber-500 font-semibold" : "text-muted-foreground"}`}
						>
							{val}
						</span>
					);
				},
			}),
			columnHelper.accessor("consumer_count", {
				header: "Consumers",
				cell: (info) => (
					<span className="font-mono text-xs font-semibold">
						{info.getValue() ?? 0}
					</span>
				),
			}),
			columnHelper.accessor("message_stats.publish_details.rate", {
				id: "publishRate",
				header: "Pub Rate",
				cell: (info) => {
					const rate = info.getValue() ?? 0;
					return (
						<span className="font-mono text-xs text-primary">
							{rate.toFixed(1)}/s
						</span>
					);
				},
			}),
			columnHelper.display({
				id: "actions",
				header: "",
				cell: (info) => (
					<Link
						to="/channels/$name"
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
		data: filteredChannels,
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
							Channels
						</h1>
					</div>
					<p className="text-xs text-muted-foreground">
						Active multiplexed AMQP sessions and consumer flow control in vhost{" "}
						<strong className="text-primary font-mono">{selectedVHost}</strong>
					</p>
				</div>
			</div>

			{/* Main Table Card */}
			<Card>
				<CardHeader className="py-3 px-5 border-b border-border">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
								<Radio className="h-4 w-4" />
							</div>
							<div className="space-y-0.5">
								<CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
									All Channels
									{!isLoading && (
										<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
											{filteredChannels.length}
										</span>
									)}
								</CardTitle>
								<CardDescription className="text-xs text-muted-foreground">
									Channel status, consumer acknowledgments, and unconfirmed
									message trackers
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
										id: "mode",
										label: "Mode",
										value: modeFilter,
										onChange: setModeFilter,
										options: modeOptions,
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
									placeholder="Filter channels by name, user..."
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
									{hg.headers.map((header) => (
										<TableHead key={header.id}>
											<div
												className={
													header.column.getCanSort()
														? "flex items-center gap-1 cursor-pointer select-none hover:text-foreground"
														: ""
												}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
												{header.column.getCanSort() && (
													<ArrowUpDown className="h-3 w-3 text-muted-foreground/70" />
												)}
											</div>
										</TableHead>
									))}
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
											? "Loading channels from RabbitMQ..."
											: "No active AMQP channels found."}
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
