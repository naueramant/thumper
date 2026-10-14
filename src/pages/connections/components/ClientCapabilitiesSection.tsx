import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import { JsonHighlighter } from "@/components/common/JsonViewer";
import { cn } from "@/utilities/cn/index.ts";
import {
	BellRing,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Copy,
	CornerDownLeft,
	Cpu,
	GitFork,
	Info,
	LayoutGrid,
	List,
	Lock,
	OctagonAlert,
	Package,
	RotateCcw,
	Search,
	ShieldCheck,
	SlidersHorizontal,
	Tag,
	Terminal,
	X,
} from "lucide-react";
import * as React from "react";

interface CapabilityMeta {
	name: string;
	category: "Reliability" | "Consumer" | "Topology" | "Flow Control" | "Security" | "Performance" | "RPC" | "Extension";
	description: string;
	icon: React.ComponentType<{ className?: string }>;
}

const KNOWN_CAPABILITIES: Record<string, CapabilityMeta> = {
	publisher_confirms: {
		name: "Publisher Confirms",
		category: "Reliability",
		description:
			"Asynchronous acknowledgement from the broker when published messages are safely routed or committed to disk.",
		icon: ShieldCheck,
	},
	basic_nack: {
		name: "Basic Nack",
		category: "Consumer",
		description:
			"Negative acknowledgement extension allowing consumers to reject single or bulk messages with requeue control.",
		icon: RotateCcw,
	},
	"basic.nack": {
		name: "Basic Nack",
		category: "Consumer",
		description:
			"Negative acknowledgement extension allowing consumers to reject single or bulk messages with requeue control.",
		icon: RotateCcw,
	},
	consumer_cancel_notify: {
		name: "Consumer Cancel Notify",
		category: "Consumer",
		description:
			"Broker informs active consumers when a subscribed queue is deleted, cancelled, or fails over in a cluster.",
		icon: BellRing,
	},
	exchange_exchange_bindings: {
		name: "Exchange-to-Exchange Bindings",
		category: "Topology",
		description:
			"Enables direct routing bindings between exchanges to create layered, decoupled messaging topologies.",
		icon: GitFork,
	},
	"connection.blocked": {
		name: "Connection Blocked Alerts",
		category: "Flow Control",
		description:
			"Broker actively alerts the client when publishes are blocked or unblocked due to memory or disk space alarms.",
		icon: OctagonAlert,
	},
	connection_blocked: {
		name: "Connection Blocked Alerts",
		category: "Flow Control",
		description:
			"Broker actively alerts the client when publishes are blocked or unblocked due to memory or disk space alarms.",
		icon: OctagonAlert,
	},
	authentication_failure_close: {
		name: "Auth Failure Close",
		category: "Security",
		description:
			"Sends an explicit AMQP 320 (Access Refused) error frame on bad credentials rather than severing TCP abruptly.",
		icon: Lock,
	},
	per_consumer_qos: {
		name: "Per-Consumer QoS",
		category: "Performance",
		description:
			"Allows prefetch limits to be enforced independently per consumer rather than shared across the channel.",
		icon: SlidersHorizontal,
	},
	direct_reply_to: {
		name: "Direct Reply-To",
		category: "RPC",
		description:
			"Enables fast RPC request/reply patterns via pseudo-queues without the latency of creating temporary queues.",
		icon: CornerDownLeft,
	},
	consumer_priorities: {
		name: "Consumer Priorities",
		category: "Consumer",
		description:
			"Allows consumers to declare priority levels so messages are dispatched to highest-priority active consumers first.",
		icon: SlidersHorizontal,
	},
};

function formatCapabilityName(key: string): string {
	return key
		.replace(/[._]/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

export interface ClientCapabilitiesSectionProps {
	clientProperties?: Record<string, any>;
}

export function ClientCapabilitiesSection({
	clientProperties,
}: ClientCapabilitiesSectionProps) {
	const [searchQuery, setSearchQuery] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<"all" | "supported" | "unsupported">("all");
	const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");
	const [showRawJson, setShowRawJson] = React.useState(false);
	const [copied, setCopied] = React.useState(false);

	const capabilities = (clientProperties?.capabilities || {}) as Record<string, any>;
	const capabilityEntries = React.useMemo(() => Object.entries(capabilities), [capabilities]);

	const totalCount = capabilityEntries.length;
	const supportedCount = capabilityEntries.filter(([, v]) => Boolean(v)).length;
	const unsupportedCount = totalCount - supportedCount;

	const filteredEntries = React.useMemo(() => {
		return capabilityEntries.filter(([key, value]) => {
			const isSupported = Boolean(value);
			if (statusFilter === "supported" && !isSupported) return false;
			if (statusFilter === "unsupported" && isSupported) return false;

			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			const meta = KNOWN_CAPABILITIES[key];
			const name = meta?.name || formatCapabilityName(key);
			const desc = meta?.description || "";
			const cat = meta?.category || "";

			return (
				key.toLowerCase().includes(q) ||
				name.toLowerCase().includes(q) ||
				desc.toLowerCase().includes(q) ||
				cat.toLowerCase().includes(q)
			);
		});
	}, [capabilityEntries, statusFilter, searchQuery]);

	const handleCopyJson = () => {
		navigator.clipboard.writeText(JSON.stringify(capabilities, null, 2));
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="space-y-4">
			{/* Top Bar: Title, Summary Badges, Controls */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
				<div className="flex items-center gap-2.5">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
						<Cpu className="h-4 w-4" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold text-foreground">
								Protocol Capabilities
							</h3>
							{totalCount > 0 && (
								<Badge
									variant={supportedCount === totalCount ? "success" : "secondary"}
									className="text-[10px] px-2 py-0.5 gap-1 font-mono"
								>
									<CheckCircle2 className="h-3 w-3" />
									{supportedCount} / {totalCount} supported
								</Badge>
							)}
						</div>
						<p className="text-[11px] text-muted-foreground">
							AMQP 0-9-1 extensions negotiated by this client during handshake
						</p>
					</div>
				</div>

				{totalCount > 0 && (
					<div className="flex items-center gap-2">
						{/* View Mode Toggle */}
						<div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
							<button
								type="button"
								onClick={() => setViewMode("grid")}
								className={cn(
									"p-1.5 rounded-md text-xs transition-colors cursor-pointer",
									viewMode === "grid"
										? "bg-background text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground",
								)}
								title="Grid View"
							>
								<LayoutGrid className="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								onClick={() => setViewMode("table")}
								className={cn(
									"p-1.5 rounded-md text-xs transition-colors cursor-pointer",
									viewMode === "table"
										? "bg-background text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground",
								)}
								title="Table View"
							>
								<List className="h-3.5 w-3.5" />
							</button>
						</div>

						{/* Copy JSON Button */}
						<Button
							variant="outline"
							size="sm"
							onClick={handleCopyJson}
							className="h-7 px-2.5 text-xs gap-1.5"
						>
							{copied ? (
								<>
									<Check className="h-3 w-3 text-emerald-500" />
									<span className="text-[11px] text-emerald-500">Copied</span>
								</>
							) : (
								<>
									<Copy className="h-3 w-3" />
									<span className="text-[11px]">Copy JSON</span>
								</>
							)}
						</Button>
					</div>
				)}
			</div>

			{/* Search & Filter Bar (only if capabilities exist) */}
			{totalCount > 0 && (
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
					{/* Search */}
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Filter capabilities..."
							className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
							>
								<X className="h-3 w-3" />
							</button>
						)}
					</div>

					{/* Status Filters */}
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => setStatusFilter("all")}
							className={cn(
								"px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
								statusFilter === "all"
									? "bg-primary/10 text-primary border border-primary/20"
									: "text-muted-foreground hover:bg-muted/60",
							)}
						>
							All ({totalCount})
						</button>
						<button
							type="button"
							onClick={() => setStatusFilter("supported")}
							className={cn(
								"px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
								statusFilter === "supported"
									? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
									: "text-muted-foreground hover:bg-muted/60",
							)}
						>
							Supported ({supportedCount})
						</button>
						{unsupportedCount > 0 && (
							<button
								type="button"
								onClick={() => setStatusFilter("unsupported")}
								className={cn(
									"px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
									statusFilter === "unsupported"
										? "bg-destructive/15 text-destructive border border-destructive/20"
										: "text-muted-foreground hover:bg-muted/60",
								)}
							>
								Unsupported ({unsupportedCount})
							</button>
						)}
					</div>
				</div>
			)}

			{/* Capabilities Display */}
			{totalCount === 0 ? (
				<div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-2 bg-muted/5">
					<Cpu className="h-8 w-8 mx-auto text-muted-foreground/50" />
					<div className="text-sm font-medium text-foreground">No capabilities reported</div>
					<p className="text-xs text-muted-foreground max-w-sm mx-auto">
						This AMQP client library did not advertise any protocol capabilities during the connection handshake.
					</p>
				</div>
			) : filteredEntries.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border/80 p-6 text-center space-y-2 bg-muted/5">
					<Info className="h-6 w-6 mx-auto text-muted-foreground/50" />
					<div className="text-xs font-medium text-foreground">
						No capabilities match "{searchQuery}"
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setSearchQuery("");
							setStatusFilter("all");
						}}
						className="h-7 text-xs"
					>
						Clear Filters
					</Button>
				</div>
			) : viewMode === "grid" ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{filteredEntries.map(([key, value]) => {
						const isSupported = Boolean(value);
						const meta = KNOWN_CAPABILITIES[key];
						const displayName = meta?.name || formatCapabilityName(key);
						const description =
							meta?.description ||
							"Custom client extension negotiated during the AMQP connection handshake.";
						const category = meta?.category || "Extension";
						const IconComponent = meta?.icon || Cpu;

						return (
							<div
								key={key}
								className={cn(
									"group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all",
									isSupported
										? "border-border/70 bg-card/60 hover:bg-card hover:border-emerald-500/30 hover:shadow-xs"
										: "border-border/40 bg-muted/10 opacity-70 hover:opacity-100",
								)}
							>
								<div className="space-y-2.5">
									{/* Top: Icon + Status */}
									<div className="flex items-center justify-between gap-2">
										<div
											className={cn(
												"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
												isSupported
													? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
													: "border-border bg-muted text-muted-foreground",
											)}
										>
											<IconComponent className="h-4 w-4" />
										</div>

										<Badge
											variant={isSupported ? "success" : "outline"}
											className="text-[10px] py-0.5 px-2 font-medium shrink-0"
										>
											{typeof value === "boolean" ? (
												isSupported ? (
													<span className="flex items-center gap-1">
														<Check className="h-3 w-3" />
														Supported
													</span>
												) : (
													<span className="flex items-center gap-1 text-muted-foreground">
														<X className="h-3 w-3" />
														Unsupported
													</span>
												)
											) : (
												<span>{String(value)}</span>
											)}
										</Badge>
									</div>

									{/* Name & Key */}
									<div className="space-y-1">
										<div className="flex items-baseline justify-between gap-2">
											<span className="text-xs font-semibold text-foreground tracking-tight">
												{displayName}
											</span>
											<span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
												{category}
											</span>
										</div>
										<div>
											<code className="inline-block font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
												{key}
											</code>
										</div>
									</div>

									{/* Description */}
									<p className="text-[11px] text-muted-foreground leading-relaxed">
										{description}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				/* Table View */
				<div className="rounded-xl border border-border/70 overflow-hidden bg-card/40">
					<table className="w-full text-xs text-left">
						<thead className="bg-muted/40 border-b border-border/50 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
							<tr>
								<th className="py-2.5 px-3.5">Capability</th>
								<th className="py-2.5 px-3.5">Protocol Key</th>
								<th className="py-2.5 px-3.5">Category</th>
								<th className="py-2.5 px-3.5">Description</th>
								<th className="py-2.5 px-3.5 text-right">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border/40">
							{filteredEntries.map(([key, value]) => {
								const isSupported = Boolean(value);
								const meta = KNOWN_CAPABILITIES[key];
								const displayName = meta?.name || formatCapabilityName(key);
								const description =
									meta?.description ||
									"Custom client extension negotiated during handshake.";
								const category = meta?.category || "Extension";
								const IconComponent = meta?.icon || Cpu;

								return (
									<tr
										key={key}
										className={cn(
											"hover:bg-muted/30 transition-colors",
											!isSupported && "opacity-60 hover:opacity-100",
										)}
									>
										<td className="py-2.5 px-3.5 font-medium text-foreground">
											<div className="flex items-center gap-2">
												<div
													className={cn(
														"flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
														isSupported
															? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
															: "border-border bg-muted text-muted-foreground",
													)}
												>
													<IconComponent className="h-3 w-3" />
												</div>
												<span>{displayName}</span>
											</div>
										</td>
										<td className="py-2.5 px-3.5">
											<code className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
												{key}
											</code>
										</td>
										<td className="py-2.5 px-3.5">
											<Badge
												variant="secondary"
												className="text-[9px] font-normal"
											>
												{category}
											</Badge>
										</td>
										<td className="py-2.5 px-3.5 text-muted-foreground text-[11px] max-w-md">
											{description}
										</td>
										<td className="py-2.5 px-3.5 text-right">
											<Badge
												variant={isSupported ? "success" : "outline"}
												className="text-[10px] py-0.5 font-medium"
											>
												{typeof value === "boolean" ? (
													isSupported ? (
														<span className="inline-flex items-center gap-1">
															<Check className="h-2.5 w-2.5" />
															Supported
														</span>
													) : (
														<span className="inline-flex items-center gap-1 text-muted-foreground">
															<X className="h-2.5 w-2.5" />
															Unsupported
														</span>
													)
												) : (
													String(value)
												)}
											</Badge>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{/* Collapsible Raw JSON Inspector */}
			{totalCount > 0 && (
				<div className="rounded-lg border border-border/50 bg-muted/10 overflow-hidden">
					<button
						type="button"
						onClick={() => setShowRawJson(!showRawJson)}
						className="flex w-full items-center justify-between px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
					>
						<span className="flex items-center gap-1.5">
							<Terminal className="h-3.5 w-3.5" />
							Raw Capabilities (JSON)
						</span>
						{showRawJson ? (
							<ChevronUp className="h-3.5 w-3.5" />
						) : (
							<ChevronDown className="h-3.5 w-3.5" />
						)}
					</button>
					{showRawJson && (
						<div className="p-3 border-t border-border/40 bg-muted/20">
							<JsonHighlighter
								content={JSON.stringify(capabilities, null, 2)}
								language="json"
								showLineNumbers
								showToggle
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export function ClientPropertiesOverview({
	clientProperties,
}: {
	clientProperties?: Record<string, any>;
}) {
	if (!clientProperties || Object.keys(clientProperties).length === 0) {
		return (
			<div className="text-xs text-muted-foreground italic py-3 text-center">
				No client properties metadata reported for this connection.
			</div>
		);
	}

	const standardKeys = new Set([
		"product",
		"version",
		"platform",
		"capabilities",
		"information",
		"connection_name",
	]);

	const customEntries = Object.entries(clientProperties).filter(
		([key]) => !standardKeys.has(key),
	);

	return (
		<div className="space-y-4">
			{/* Client Identity Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
					<div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold">
						<Package className="h-3 w-3 text-primary" />
						Product / Library
					</div>
					<div className="font-mono text-xs font-semibold text-foreground truncate">
						{clientProperties.product || "Unknown"}
					</div>
				</div>

				<div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
					<div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold">
						<Tag className="h-3 w-3 text-primary" />
						Version
					</div>
					<div className="font-mono text-xs font-semibold text-foreground truncate">
						{clientProperties.version ? `v${clientProperties.version}` : "Unknown"}
					</div>
				</div>

				<div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
					<div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold">
						<Terminal className="h-3 w-3 text-primary" />
						Platform / Runtime
					</div>
					<div className="font-mono text-xs font-semibold text-foreground truncate">
						{clientProperties.platform || "Unknown"}
					</div>
				</div>

				<div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-1">
					<div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold">
						<Info className="h-3 w-3 text-primary" />
						Connection Name
					</div>
					<div className="font-mono text-xs font-semibold text-foreground truncate">
						{clientProperties.connection_name || "—"}
					</div>
				</div>
			</div>

			{/* Optional Information or URL */}
			{clientProperties.information && (
				<div className="rounded-lg border border-border/50 bg-muted/20 px-3.5 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
					<Info className="h-4 w-4 text-primary shrink-0" />
					<span className="font-mono text-[11px] text-foreground">
						{clientProperties.information}
					</span>
				</div>
			)}

			{/* Custom / Non-standard Properties if any */}
			{customEntries.length > 0 && (
				<div className="space-y-1.5">
					<div className="text-[10px] uppercase font-semibold text-muted-foreground">
						Additional Client Properties
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
						{customEntries.map(([k, v]) => (
							<div
								key={k}
								className="rounded-lg border border-border/50 bg-muted/10 p-2 text-xs"
							>
								<div className="text-[10px] text-muted-foreground font-mono truncate">
									{k}
								</div>
								<div className="font-mono text-foreground truncate">
									{typeof v === "object" ? JSON.stringify(v) : String(v)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
