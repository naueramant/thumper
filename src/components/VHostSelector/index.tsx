import { useVHost } from "@/hooks/useVHost/index.ts";
import { cn } from "@/utilities/cn/index.ts";
import {
	ArrowLeftRight,
	Check,
	ChevronDown,
	ListOrdered,
	Mail,
	Network,
	Radio,
	Search,
} from "lucide-react";
import * as React from "react";

export function VHostSelector() {
	const { selectedVHost, setSelectedVHost, availableVHosts } = useVHost();
	const [isOpen, setIsOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const containerRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}
		if (isOpen) {
			const timer = setTimeout(
				() => document.addEventListener("click", handleClickOutside),
				0,
			);
			return () => {
				clearTimeout(timer);
				document.removeEventListener("click", handleClickOutside);
			};
		}
	}, [isOpen]);

	const query = search.trim().toLowerCase();
	const filteredVHosts = query
		? availableVHosts.filter(
				(v) =>
					v.name.toLowerCase().includes(query) ||
					v.description?.toLowerCase().includes(query),
			)
		: availableVHosts;
	const showAll =
		!query ||
		"all virtual hosts".includes(query) ||
		"cluster-wide".includes(query);

	const displayLabel = selectedVHost === "all" ? "All" : selectedVHost;

	function select(name: string) {
		setSelectedVHost(name);
		setIsOpen(false);
		setSearch("");
	}

	return (
		<div className="relative inline-block" ref={containerRef}>
			<button
				type="button"
				onClick={() => setIsOpen((v) => !v)}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				className={cn(
					"flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-2.5 text-xs text-foreground font-mono transition-colors hover:bg-muted/50 hover:border-border focus:outline-none focus:ring-1 focus:ring-primary",
					isOpen && "border-primary bg-muted/50 ring-1 ring-primary",
				)}
			>
				<Network className="h-3.5 w-3.5 text-muted-foreground shrink-0 font-sans" />
				<span className="text-muted-foreground text-[11px] font-sans">
					vhost:
				</span>
				<span className="font-semibold text-primary">{displayLabel}</span>
				<ChevronDown
					className={cn(
						"h-3 w-3 text-muted-foreground ml-0.5 shrink-0 transition-transform duration-150",
						isOpen && "rotate-180",
					)}
				/>
			</button>

			{isOpen && (
				<div
					role="listbox"
					className="absolute top-9 right-0 z-50 w-72 rounded-md border border-border bg-card p-1.5 text-foreground shadow-lg animate-in fade-in-50 zoom-in-95"
				>
					<div className="relative mb-1.5">
						<Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
						<input
							type="text"
							placeholder="Search vhosts..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							autoFocus
							className="h-7 w-full rounded border border-border/80 bg-muted/30 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
						/>
					</div>

					<div className="max-h-72 overflow-y-auto space-y-0.5 scrollbar-thin">
						{showAll && (
							<button
								type="button"
								role="option"
								aria-selected={selectedVHost === "all"}
								onClick={() => select("all")}
								className={cn(
									"flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/80",
									selectedVHost === "all" ? "bg-primary/10" : "",
								)}
							>
								<div className="min-w-0">
									<div
										className={cn(
											"text-xs font-semibold truncate",
											selectedVHost === "all"
												? "text-primary"
												: "text-foreground",
										)}
									>
										All Virtual Hosts
									</div>
									<div className="text-[10px] text-muted-foreground truncate">
										Cluster-wide
									</div>
								</div>
								{selectedVHost === "all" && (
									<Check className="h-3.5 w-3.5 text-primary shrink-0" />
								)}
							</button>
						)}

						{filteredVHosts.length > 0
							? filteredVHosts.map((v) => {
									const isSelected = v.name === selectedVHost;
									return (
										<button
											key={v.name}
											type="button"
											role="option"
											aria-selected={isSelected}
											onClick={() => select(v.name)}
											className={cn(
												"flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/80",
												isSelected ? "bg-primary/10" : "",
											)}
										>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-1.5">
													<span
														className={cn(
															"text-xs font-semibold font-mono truncate",
															isSelected ? "text-primary" : "text-foreground",
														)}
													>
														{v.name}
													</span>
													{v.tracing && (
														<span className="flex items-center gap-0.5 shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-500">
															<Radio className="h-2.5 w-2.5" />
															tracing
														</span>
													)}
												</div>
												<div className="mt-1.5 flex items-center gap-1.5 font-mono">
													<span
														className="flex items-center gap-1 rounded-md border border-sky-500/20 dark:bg-sky-500/10 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold dark:text-sky-400 text-sky-700"
														title="Exchanges"
													>
														<ArrowLeftRight className="h-3 w-3" />
														{v.exchanges.toLocaleString()}
													</span>
													<span
														className="flex items-center gap-1 rounded-md border border-emerald-500/20 dark:bg-emerald-500/10 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold dark:text-emerald-400 text-emerald-700"
														title="Queues"
													>
														<ListOrdered className="h-3 w-3" />
														{v.queues.toLocaleString()}
													</span>
													<span
														className="flex items-center gap-1 rounded-md border border-amber-500/20 dark:bg-amber-500/10 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold dark:text-amber-400 text-amber-700"
														title="Messages"
													>
														<Mail className="h-3 w-3" />
														{v.messages.toLocaleString()}
													</span>
												</div>
												{v.tags && v.tags.length > 0 && (
													<div className="mt-1 flex flex-wrap gap-1">
														{v.tags.map((tag) => (
															<span
																key={tag}
																className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
															>
																{tag}
															</span>
														))}
													</div>
												)}
											</div>
											<div className="flex items-center gap-1.5 shrink-0">
												{isSelected && (
													<Check className="h-3.5 w-3.5 text-primary" />
												)}
											</div>
										</button>
									);
								})
							: !showAll && (
									<div className="p-3 text-center text-xs text-muted-foreground">
										No results found
									</div>
								)}
					</div>
				</div>
			)}
		</div>
	);
}
