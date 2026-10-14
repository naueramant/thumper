import { useAuth } from "@/hooks/useAuth/index.ts";
import {
	useRabbitOverview,
	useRabbitShovelPlugin,
} from "@/hooks/useRabbitMQ/index.ts";
import { cn } from "@/utilities/cn/index.ts";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	Activity,
	ArrowLeftRight,
	HelpCircle,
	Layers,
	LayoutDashboard,
	PanelLeftClose,
	PanelLeftOpen,
	Radio,
	Server,
	Share2,
	ShieldCheck,
	Shovel,
} from "lucide-react";
import * as React from "react";

const ADMIN_TAGS = ["administrator", "policymaker"];

interface SidebarProps {
	isCollapsed: boolean;
	toggleSidebar: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
	// Selecting just the pathname string keeps the sidebar out of the re-render
	// path for search-param/router-status updates; an unselected useRouterState()
	// re-renders on every store notification.
	const currentPath = useRouterState({
		select: (s) => s.location.pathname,
	});
	const { data: overview } = useRabbitOverview();
	const { data: isShovelEnabled = false } = useRabbitShovelPlugin();
	const { user } = useAuth();

	// Undefined until the overview has actually loaded — avoid showing a guessed
	// cluster name/version before we know the real value.
	const clusterName = overview?.cluster_name;
	const rabbitmqVersion = overview?.rabbitmq_version;

	const isAdmin = user?.tags?.some((tag) => ADMIN_TAGS.includes(tag)) ?? false;

	const effectiveNavGroups = React.useMemo(() => {
		return [
			{
				items: [{ label: "Overview", to: "/overview", icon: LayoutDashboard }],
			},
			{
				items: [
					{ label: "Exchanges", to: "/exchanges", icon: Share2 },
					{ label: "Queues & Streams", to: "/queues", icon: Layers },
				],
			},
			{
				items: [
					{ label: "Connections", to: "/connections", icon: ArrowLeftRight },
					{ label: "Channels", to: "/channels", icon: Radio },
				],
			},
			{
				adminOnly: true,
				items: [
					...(isShovelEnabled
						? [{ label: "Shovels", to: "/shovels", icon: Shovel }]
						: []),
					{ label: "Administration", to: "/admin", icon: ShieldCheck },
				],
			},
		];
	}, [isShovelEnabled]);

	return (
		<aside
			className={cn(
				"fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
				isCollapsed ? "w-16" : "w-56",
			)}
		>
			{/* Brand Header & Toggle (height matches top bar h-14, full-width bottom border) */}
			<div className="relative flex h-14 items-center px-2 border-b border-border overflow-hidden">
				{/* Brand Logo (aligned with nav items icon rail: w-12, center at 32px) */}
				<div
					className={cn(
						"flex h-14 w-12 shrink-0 items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
						isCollapsed
							? "opacity-0 scale-75 pointer-events-none"
							: "opacity-100 scale-100",
					)}
				>
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25">
						<Activity className="h-4 w-4 stroke-[2.5]" />
					</div>
				</div>

				{/* Brand Title (smoothly expands without layout jumping) */}
				<div
					className={cn(
						"flex items-center min-w-0 overflow-hidden whitespace-nowrap pl-1 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
						isCollapsed
							? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
							: "max-w-[120px] opacity-100 translate-x-0",
					)}
				>
					<span className="font-extrabold tracking-tight text-foreground text-base leading-none select-none">
						thumper<span className="text-primary">.</span>
					</span>
				</div>

				{/* Toggle button (absolute positioning eliminates all flex layout jitter) */}
				<button
					type="button"
					onClick={toggleSidebar}
					title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					className={cn(
						"absolute top-3 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] active:scale-95 z-10",
						isCollapsed ? "right-4" : "right-2",
					)}
				>
					<div className="relative h-4 w-4">
						<PanelLeftOpen
							className={cn(
								"absolute inset-0 h-4 w-4 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
								isCollapsed
									? "opacity-100 rotate-0 scale-100"
									: "opacity-0 -rotate-90 scale-75 pointer-events-none",
							)}
						/>
						<PanelLeftClose
							className={cn(
								"absolute inset-0 h-4 w-4 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
								!isCollapsed
									? "opacity-100 rotate-0 scale-100"
									: "opacity-0 rotate-90 scale-75 pointer-events-none",
							)}
						/>
					</div>
				</button>
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-2 py-1 overflow-y-auto overflow-x-hidden space-y-2.5 scrollbar-thin">
				{effectiveNavGroups.map((group, groupIdx) => {
					if (group.adminOnly && !isAdmin) return null;

					return (
						<div key={groupIdx}>
							{groupIdx > 0 && (
								<div className="border-t border-border/40 my-2 mx-1.5" />
							)}
							<div className="space-y-1">
								{group.items.map((item) => {
									const Icon = item.icon;
									const isActive =
										currentPath === item.to ||
										(item.to !== "/overview" &&
											currentPath.startsWith(item.to));

									return (
										<Link
											key={item.to}
											to={item.to}
											title={isCollapsed ? item.label : undefined}
											className={cn(
												"group relative flex items-center h-9.5 rounded-lg text-sm font-medium transition-colors duration-200 overflow-hidden",
												isCollapsed ? "w-full justify-start" : "w-full",
												isActive
													? "bg-primary/10 text-primary font-semibold dark:bg-primary/15"
													: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
											)}
										>
											{/* Icon anchor (strictly fixed position, zero horizontal jump) */}
											<div className="flex h-9.5 w-12 shrink-0 items-center justify-center">
												<Icon
													className={cn(
														"h-4.5 w-4.5 shrink-0 transition-colors duration-200",
														isActive
															? "text-primary"
															: "text-muted-foreground group-hover:text-foreground",
													)}
												/>
											</div>

											{/* Label with auto-layout Smart Animate reveal */}
											<div
												className={cn(
													"flex items-center overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
													isCollapsed
														? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
														: "max-w-[140px] opacity-100 translate-x-0",
												)}
											>
												<span className="truncate">{item.label}</span>
											</div>
										</Link>
									);
								})}
							</div>
						</div>
					);
				})}
			</nav>

			{/* Help & About (pinned just above the cluster card) */}
			<div className="px-2">
				<Link
					to="/help"
					title={isCollapsed ? "Help & About" : undefined}
					className={cn(
						"group relative flex items-center h-9.5 rounded-lg text-sm font-medium transition-colors duration-200 overflow-hidden",
						isCollapsed ? "w-full justify-start" : "w-full",
						currentPath === "/help"
							? "bg-primary/10 text-primary font-semibold dark:bg-primary/15"
							: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
					)}
				>
					<div className="flex h-9.5 w-12 shrink-0 items-center justify-center">
						<HelpCircle
							className={cn(
								"h-4.5 w-4.5 shrink-0 transition-colors duration-200",
								currentPath === "/help"
									? "text-primary"
									: "text-muted-foreground group-hover:text-foreground",
							)}
						/>
					</div>
					<div
						className={cn(
							"flex items-center overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
							isCollapsed
								? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
								: "max-w-[140px] opacity-100 translate-x-0",
						)}
					>
						<span className="truncate">Help &amp; About</span>
					</div>
				</Link>
			</div>

			{/* Cluster Footer Status Bar */}
			<div className="p-2 border-t border-border/40">
				<div className="group relative">
					{/* Sleek single-line status row */}
					<div
						className={cn(
							"group/pill relative flex items-center h-9 rounded-lg border border-border/50 bg-muted/20 text-xs transition-colors duration-200 overflow-hidden",
							isCollapsed
								? "w-full justify-start cursor-pointer hover:bg-muted/60"
								: "w-full hover:bg-muted/40 cursor-default",
						)}
					>
						{/* Icon rail (centered at 32px to match nav item icons) */}
						<div className="flex h-9 w-12 shrink-0 items-center justify-center">
							<div className="relative inline-flex items-center justify-center">
								<Server className="h-4 w-4 text-muted-foreground group-hover/pill:text-foreground transition-colors" />
								<span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
								</span>
							</div>
						</div>

						{/* Cluster Name (smoothly animates on sidebar expand/collapse, right-aligned) */}
						<div
							className={cn(
								"flex items-center justify-end flex-1 min-w-0 pr-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
								isCollapsed
									? "max-w-0 opacity-0 -translate-x-2 pointer-events-none"
									: "max-w-[150px] opacity-100 translate-x-0",
							)}
						>
							<span
								className="truncate font-mono text-[11px] font-medium text-foreground text-right"
								title={clusterName ?? "—"}
							>
								{clusterName ?? "RabbitMQ"}
							</span>
						</div>
					</div>

					{/* Hover Details Popover (flyout to right when collapsed, drops up above when expanded) */}
					<div
						className={cn(
							"invisible absolute z-50 rounded-lg border border-border bg-popover text-popover-foreground p-3 shadow-xl opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
							isCollapsed
								? "bottom-0 left-full ml-3 w-56 -translate-x-1 group-hover:translate-x-0"
								: "bottom-full left-0 right-0 mb-2 translate-y-1 group-hover:translate-y-0",
						)}
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1.5 min-w-0">
								<Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
								<span className="truncate font-mono text-xs font-semibold text-foreground">
									{clusterName ?? "RabbitMQ Cluster"}
								</span>
							</div>
							<div className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium shrink-0 ml-2">
								<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
								<span>Connected</span>
							</div>
						</div>

						<div className="mt-2.5 space-y-1.5 border-t border-border/50 pt-2 text-[11px]">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">RabbitMQ</span>
								<span className="font-mono text-foreground">
									{rabbitmqVersion ?? "—"}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Erlang</span>
								<span className="font-mono text-foreground">
									{overview?.erlang_version ?? "—"}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
}
