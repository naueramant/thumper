import { useAuth } from "@/hooks/useAuth/index.ts";
import { useRabbitOverview } from "@/hooks/useRabbitMQ/index.ts";
import { cn } from "@/utilities/cn/index.ts";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	Activity,
	ArrowLeftRight,
	Layers,
	LayoutDashboard,
	PanelLeftClose,
	PanelLeftOpen,
	Radio,
	Server,
	Share2,
	ShieldCheck,
} from "lucide-react";

const ADMIN_TAGS = ["administrator", "policymaker"];

const navGroups = [
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
		items: [{ label: "Administration", to: "/admin", icon: ShieldCheck }],
	},
];

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
	const { user } = useAuth();

	const clusterName = overview?.cluster_name || "rabbit@cluster";
	const rabbitmqVersion = overview?.rabbitmq_version || "4.3.6";

	const isAdmin = user?.tags?.some((tag) => ADMIN_TAGS.includes(tag)) ?? false;

	return (
		<aside
			className={cn(
				"fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out",
				isCollapsed ? "w-16" : "w-64",
			)}
		>
			{/* Brand Header & Toggle */}
			<div
				className={cn(
					"flex h-14 items-center border-b border-border px-3",
					isCollapsed ? "justify-center" : "justify-between",
				)}
			>
				{!isCollapsed && (
					<div className="flex items-center gap-2.5 overflow-hidden">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
							<Activity className="h-4 w-4 stroke-[2.5]" />
						</div>
						<div className="flex flex-col overflow-hidden">
							<span className="font-bold tracking-tight text-foreground text-sm truncate">
								Thumber
							</span>
							<span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
								RabbitMQ {rabbitmqVersion}
							</span>
						</div>
					</div>
				)}

				<button
					type="button"
					onClick={toggleSidebar}
					title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					className={cn(
						"flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 active:scale-90",
						isCollapsed ? "h-8 w-8" : "h-7 w-7",
					)}
				>
					{isCollapsed ? (
						<PanelLeftOpen className="h-4 w-4" />
					) : (
						<PanelLeftClose className="h-4 w-4" />
					)}
				</button>
			</div>

			{/* Navigation */}
			<nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden space-y-3">
				{navGroups.map((group, groupIdx) => {
					if (group.adminOnly && !isAdmin) return null;

					return (
						<div key={groupIdx}>
							{groupIdx > 0 && (
								<div
									className={cn(
										"border-t border-border/40 mb-3",
										isCollapsed ? "mx-2" : "mx-1",
									)}
								/>
							)}
							<div className="space-y-0.5">
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
												"flex items-center rounded-md text-sm font-medium transition-all duration-150",
												isCollapsed
													? "h-10 justify-center px-0"
													: "gap-3 px-3 py-2",
												isActive
													? "bg-primary/15 text-primary font-semibold"
													: "text-muted-foreground hover:bg-muted hover:text-foreground",
											)}
										>
											<Icon
												className={cn(
													"h-4.5 w-4.5 shrink-0 transition-colors duration-150",
													isActive ? "text-primary" : "text-muted-foreground",
												)}
											/>
											<span
												className={cn(
													"shrink-0 whitespace-nowrap transition-opacity duration-200 ease-in-out",
													isCollapsed
														? "w-0 opacity-0"
														: "w-auto opacity-100 delay-100",
												)}
											>
												{item.label}
											</span>
										</Link>
									);
								})}
							</div>
						</div>
					);
				})}
			</nav>

			{/* Cluster Footer */}
			<div className="p-2">
				{isCollapsed ? (
					<div className="group relative">
						<div className="relative flex h-9 w-full items-center justify-center rounded bg-muted/40 text-muted-foreground">
							<Server className="h-4 w-4" />
							<span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-card" />
						</div>

						{/* Hover flyout with full cluster info */}
						<div className="invisible absolute bottom-0 left-full z-50 ml-4 w-56 rounded-md border border-border bg-card p-2.5 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
							<div className="flex items-center justify-between text-xs">
								<div className="flex items-center gap-1.5 text-foreground font-medium truncate">
									<Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="truncate font-mono text-[11px]">
										{clusterName}
									</span>
								</div>
								<span
									className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500"
									title="Connected"
								/>
							</div>
							<div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
								<span>Erlang {overview?.erlang_version || "27"}</span>
								<span className="text-primary font-medium">
									{overview?.object_totals?.queues ?? 0} queues
								</span>
							</div>
						</div>
					</div>
				) : (
					<div className="rounded-md bg-muted/30 p-2.5 border border-border/60">
						<div className="flex items-center justify-between text-xs">
							<div className="flex items-center gap-1.5 text-foreground font-medium truncate">
								<Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
								<span
									className="truncate font-mono text-[11px]"
									title={clusterName}
								>
									{clusterName}
								</span>
							</div>
							<span
								className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500"
								title="Connected"
							/>
						</div>
						<div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
							<span>Erlang {overview?.erlang_version || "27"}</span>
							<span className="text-primary font-medium">
								{overview?.object_totals?.queues ?? 0} queues
							</span>
						</div>
					</div>
				)}
			</div>
		</aside>
	);
}
