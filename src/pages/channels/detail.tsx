import { Breadcrumbs } from "@/components/Breadcrumbs/index.tsx";
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
import {
	useRabbitChannelDetail,
	useRabbitConsumers,
} from "@/hooks/useRabbitMQ/index.ts";
import { formatRate } from "@/services/rabbitmq/utils.ts";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight, Info, Radio, RefreshCw, Users } from "lucide-react";
import * as React from "react";

type ChannelTab = "overview" | "consumers";

export const DEFAULT_CHANNEL_TAB: ChannelTab = "overview";
const CHANNEL_TAB_IDS: ChannelTab[] = ["overview", "consumers"];

export function ChannelDetailPage() {
	const params = useParams({ strict: false }) as {
		name?: string;
		tab?: string;
	};
	const navigate = useNavigate();
	const name = params.name ? decodeURIComponent(params.name) : "";

	const {
		data: channel,
		isLoading,
		refetch: refetchChannel,
	} = useRabbitChannelDetail(name);
	const { data: allConsumers = [], refetch: refetchConsumers } =
		useRabbitConsumers(channel?.vhost);

	// Active tab, reflected in the URL as an optional trailing path segment
	const activeTab: ChannelTab =
		params.tab && (CHANNEL_TAB_IDS as string[]).includes(params.tab)
			? (params.tab as ChannelTab)
			: DEFAULT_CHANNEL_TAB;

	const setActiveTab = React.useCallback(
		(tab: ChannelTab) => {
			navigate({
				to: "/channels/$name/$tab",
				params: { name: params.name ?? "", tab },
				replace: true,
			});
		},
		[navigate, params.name],
	);

	const consumers = React.useMemo(
		() => allConsumers.filter((c) => c.channel_details?.name === name),
		[allConsumers, name],
	);

	if (isLoading && !channel) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
				<RefreshCw className="h-6 w-6 animate-spin text-primary" />
				<div className="text-xs text-muted-foreground font-mono">
					Loading channel {name}...
				</div>
			</div>
		);
	}

	const publishRate = channel?.message_stats?.publish_details?.rate || 0;
	const confirmRate = channel?.message_stats?.confirm_details?.rate || 0;
	const deliverRate = channel?.message_stats?.deliver_details?.rate || 0;
	const ackRate = channel?.message_stats?.ack_details?.rate || 0;

	const tabs: { id: ChannelTab; label: string; icon: React.ReactNode }[] = [
		{
			id: "overview",
			label: "Overview",
			icon: <Info className="h-3.5 w-3.5" />,
		},
		{
			id: "consumers",
			label: "Consumers",
			icon: <Users className="h-3.5 w-3.5" />,
		},
	];

	return (
		<div className="space-y-6 pb-16">
			<Breadcrumbs>
				<Link
					to="/channels"
					className="hover:text-foreground transition-colors"
				>
					Channels
				</Link>
				<ChevronRight className="h-3 w-3 text-muted-foreground/50" />
				<span className="text-foreground font-medium truncate max-w-xs">
					{name}
				</span>
			</Breadcrumbs>

			{/* Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
				<div>
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
							<Radio className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
									{name}
								</h1>
								<Badge
									variant={channel?.state === "running" ? "success" : "outline"}
									className="text-[10px] uppercase font-mono"
								>
									{channel?.state || "idle"}
								</Badge>
								<Badge
									variant="outline"
									className="text-[10px] uppercase font-mono"
								>
									{channel?.confirm
										? "Confirm"
										: channel?.transactional
											? "Tx"
											: "Standard"}
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								VHost:{" "}
								<span className="font-mono text-foreground/80">
									{channel?.vhost || "—"}
								</span>
								{" • "}
								Connection:{" "}
								<Link
									to="/connections/$name"
									params={{
										name: encodeURIComponent(
											channel?.connection_details?.name || "",
										),
									}}
									className="font-mono text-primary hover:underline"
								>
									{channel?.connection_details?.name || "unknown"}
								</Link>
								{" • "}
								Node:{" "}
								<span className="font-mono text-foreground/80">
									{channel?.node || "unknown"}
								</span>
							</p>
						</div>
					</div>
				</div>

				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						refetchChannel();
						refetchConsumers();
					}}
					className="h-8 text-xs font-mono"
				>
					<RefreshCw className="h-3.5 w-3.5 mr-1.5" />
					Refresh
				</Button>
			</div>

			{/* Top Metric Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Prefetch Count
						</span>
						<div className="text-2xl font-bold font-mono text-foreground">
							{channel?.prefetch_count ?? 0}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							Global: {channel?.global_prefetch_count ?? 0}
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Unacknowledged
						</span>
						<div
							className={`text-2xl font-bold font-mono ${
								(channel?.messages_unacknowledged ?? 0) > 0
									? "text-amber-500"
									: "text-foreground"
							}`}
						>
							{channel?.messages_unacknowledged ?? 0}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							Delivered awaiting ack
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Unconfirmed
						</span>
						<div
							className={`text-2xl font-bold font-mono ${
								(channel?.messages_unconfirmed ?? 0) > 0
									? "text-amber-500"
									: "text-foreground"
							}`}
						>
							{channel?.messages_unconfirmed ?? 0}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							Published awaiting confirm
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Active Consumers
						</span>
						<div className="text-2xl font-bold font-mono text-primary">
							{channel?.consumer_count ?? 0}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							{consumers.length} tracked
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Tab Bar */}
			<div className="border-b border-border/60">
				<div className="flex items-center gap-0.5">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all duration-150 border-b-2 -mb-px cursor-pointer ${
								activeTab === tab.id
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
							}`}
						>
							{tab.icon}
							{tab.label}
							{tab.id === "consumers" && consumers.length > 0 && (
								<span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-mono">
									{consumers.length}
								</span>
							)}
						</button>
					))}
				</div>
			</div>

			{/* Tab Content */}
			<div className="animate-in fade-in duration-150">
				{activeTab === "overview" && (
					<Card className="border border-border/80">
						<CardHeader className="pb-3 border-b border-border/50">
							<CardTitle className="text-base">Message Rates</CardTitle>
							<CardDescription className="text-xs">
								Throughput and transaction state for this channel.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-4 space-y-5">
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Publish
									</div>
									<div className="font-mono text-foreground text-sm">
										{formatRate(publishRate)}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Confirm
									</div>
									<div className="font-mono text-foreground text-sm">
										{formatRate(confirmRate)}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Deliver / Get
									</div>
									<div className="font-mono text-foreground text-sm">
										{formatRate(deliverRate)}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Ack
									</div>
									<div className="font-mono text-foreground text-sm">
										{formatRate(ackRate)}
									</div>
								</div>
							</div>

							<div className="border-t border-border/50 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Username
									</div>
									<div className="font-mono text-foreground text-sm truncate">
										{channel?.user || "—"}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										VHost
									</div>
									<div className="font-mono text-foreground text-sm truncate">
										{channel?.vhost || "—"}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Messages Uncommitted
									</div>
									<div className="font-mono text-foreground text-sm">
										{channel?.messages_uncommitted ?? 0}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Acks Uncommitted
									</div>
									<div className="font-mono text-foreground text-sm">
										{channel?.acks_uncommitted ?? 0}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{activeTab === "consumers" && (
					<Card className="border border-border/80">
						<CardHeader className="pb-3 border-b border-border/50">
							<CardTitle className="text-base">
								Registered Consumers ({consumers.length})
							</CardTitle>
							<CardDescription className="text-xs">
								Consumers subscribed to queues via this channel.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Consumer Tag</TableHead>
										<TableHead>Queue</TableHead>
										<TableHead>Ack Mode</TableHead>
										<TableHead>Exclusive</TableHead>
										<TableHead>Prefetch</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{consumers.length ? (
										consumers.map((c) => (
											<TableRow key={c.consumer_tag}>
												<TableCell className="font-mono text-xs">
													{c.consumer_tag}
												</TableCell>
												<TableCell>
													<Link
														to="/queues/$vhost/$name"
														params={{
															vhost: encodeURIComponent(c.queue.vhost),
															name: encodeURIComponent(c.queue.name),
														}}
														className="font-mono text-xs text-primary hover:underline"
													>
														{c.queue.name}
													</Link>
												</TableCell>
												<TableCell className="font-mono text-xs">
													{c.ack_required ? "ack" : "no_ack"}
												</TableCell>
												<TableCell>
													<Badge
														variant={c.exclusive ? "warning" : "outline"}
														className="text-[10px]"
													>
														{c.exclusive ? "Yes" : "No"}
													</Badge>
												</TableCell>
												<TableCell className="font-mono text-xs">
													{c.prefetch_count ?? 0}
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell
												colSpan={5}
												className="h-24 text-center text-muted-foreground text-xs"
											>
												No consumers registered on this channel.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
