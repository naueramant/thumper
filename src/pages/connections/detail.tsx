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
import { toast } from "@/components/ui/toast/index.tsx";
import {
	useRabbitConnectionChannels,
	useRabbitConnectionDetail,
	useRabbitMutations,
} from "@/hooks/useRabbitMQ/index.ts";
import { formatBytes, formatRate } from "@/services/rabbitmq/utils.ts";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
	AlertTriangle,
	ChevronRight,
	Info,
	Lock,
	Network,
	Radio,
	RefreshCw,
	Unlock,
	Zap,
} from "lucide-react";
import * as React from "react";

type ConnectionTab = "overview" | "channels" | "properties";

export const DEFAULT_CONNECTION_TAB: ConnectionTab = "overview";
const CONNECTION_TAB_IDS: ConnectionTab[] = [
	"overview",
	"channels",
	"properties",
];

export function ConnectionDetailPage() {
	const params = useParams({ strict: false }) as {
		name?: string;
		tab?: string;
	};
	const navigate = useNavigate();
	const name = params.name ? decodeURIComponent(params.name) : "";

	const {
		data: connection,
		isLoading,
		refetch: refetchConnection,
	} = useRabbitConnectionDetail(name);
	const { data: channels = [], refetch: refetchChannels } =
		useRabbitConnectionChannels(name);
	const { closeConnection } = useRabbitMutations();

	// Active tab, reflected in the URL as an optional trailing path segment
	const activeTab: ConnectionTab =
		params.tab && (CONNECTION_TAB_IDS as string[]).includes(params.tab)
			? (params.tab as ConnectionTab)
			: DEFAULT_CONNECTION_TAB;

	const setActiveTab = React.useCallback(
		(tab: ConnectionTab) => {
			navigate({
				to: "/connections/$name/$tab",
				params: { name: params.name ?? "", tab },
				replace: true,
			});
		},
		[navigate, params.name],
	);
	const [closeReason, setCloseReason] = React.useState("Closed via Thumber");
	const [isClosing, setIsClosing] = React.useState(false);
	const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);

	const handleForceClose = async () => {
		setIsClosing(true);
		try {
			await closeConnection.mutateAsync({ name, reason: closeReason });
			navigate({ to: "/connections" });
		} catch (err: any) {
			toast.error("Failed to close connection", err.message || String(err));
		} finally {
			setIsClosing(false);
			setShowCloseConfirm(false);
		}
	};

	if (isLoading && !connection) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
				<RefreshCw className="h-6 w-6 animate-spin text-primary" />
				<div className="text-xs text-muted-foreground font-mono">
					Loading connection {name}...
				</div>
			</div>
		);
	}

	const recvRate = connection?.recv_oct_details?.rate || 0;
	const sendRate = connection?.send_oct_details?.rate || 0;

	const tabs: { id: ConnectionTab; label: string; icon: React.ReactNode }[] = [
		{
			id: "overview",
			label: "Overview",
			icon: <Info className="h-3.5 w-3.5" />,
		},
		{
			id: "channels",
			label: "Channels",
			icon: <Radio className="h-3.5 w-3.5" />,
		},
		{
			id: "properties",
			label: "Client Properties",
			icon: <Network className="h-3.5 w-3.5" />,
		},
	];

	return (
		<div className="space-y-6 pb-16">
			<Breadcrumbs>
				<Link
					to="/connections"
					className="hover:text-foreground transition-colors"
				>
					Connections
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
							<Zap className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
									{name}
								</h1>
								<Badge
									variant={
										connection?.state === "running"
											? "success"
											: connection?.state === "blocked"
												? "destructive"
												: "warning"
									}
									className="text-[10px] uppercase font-mono"
								>
									{connection?.state || "unknown"}
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								VHost:{" "}
								<span className="font-mono text-foreground/80">
									{connection?.vhost}
								</span>
								{" • "}
								Node:{" "}
								<span className="font-mono text-foreground/80">
									{connection?.node || "unknown"}
								</span>
							</p>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							refetchConnection();
							refetchChannels();
						}}
						className="h-8 text-xs font-mono"
					>
						<RefreshCw className="h-3.5 w-3.5 mr-1.5" />
						Refresh
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowCloseConfirm(true)}
						className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
					>
						<AlertTriangle className="h-3.5 w-3.5 mr-1" />
						Force Close
					</Button>
				</div>
			</div>

			{/* Top Metric Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Protocol
						</span>
						<div className="text-xl font-bold font-mono text-foreground">
							{connection?.protocol || "AMQP 0-9-1"}
						</div>
						<div className="text-[11px] text-muted-foreground flex items-center gap-1">
							{connection?.ssl ? (
								<>
									<Lock className="h-3 w-3 text-emerald-400" /> TLS Secured
								</>
							) : (
								<>
									<Unlock className="h-3 w-3" /> Plaintext
								</>
							)}
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							Multiplexed Channels
						</span>
						<div className="text-2xl font-bold font-mono text-primary">
							{connection?.channels ?? 0}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							{channels.length} reported
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							From Client
						</span>
						<div className="text-2xl font-bold font-mono text-foreground">
							{formatRate(recvRate)}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							Total: {formatBytes(connection?.recv_oct ?? 0)}
						</div>
					</CardContent>
				</Card>

				<Card className="border border-border/80 bg-card/60">
					<CardContent className="p-4 space-y-1">
						<span className="text-[11px] font-medium text-muted-foreground">
							To Client
						</span>
						<div className="text-2xl font-bold font-mono text-foreground">
							{formatRate(sendRate)}
						</div>
						<div className="text-[11px] text-muted-foreground font-mono">
							Total: {formatBytes(connection?.send_oct ?? 0)}
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
							{tab.id === "channels" && channels.length > 0 && (
								<span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-mono">
									{channels.length}
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
							<CardTitle className="text-base">Connection Details</CardTitle>
							<CardDescription className="text-xs">
								Socket, authentication, and frame negotiation parameters.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-4">
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Username
									</div>
									<div className="font-mono text-foreground">
										{connection?.user}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Connected At
									</div>
									<div className="font-mono text-foreground">
										{connection?.connected_at
											? new Date(connection.connected_at).toLocaleString()
											: "—"}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Type
									</div>
									<div className="font-mono text-foreground">
										{connection?.type || "network"}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Timeout
									</div>
									<div className="font-mono text-foreground">
										{connection?.timeout ?? "—"}s
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Frame Max
									</div>
									<div className="font-mono text-foreground">
										{connection?.frame_max?.toLocaleString() ?? "—"} bytes
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Peer Address
									</div>
									<div className="font-mono text-foreground">
										{connection?.peer_host}:{connection?.peer_port}
									</div>
								</div>
							</div>

							<div className="mt-5 p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2.5">
								<div className="flex items-center gap-2 text-destructive font-semibold text-xs">
									<AlertTriangle className="h-4 w-4 shrink-0" />
									<span>Force Close Client Connection</span>
								</div>
								<p className="text-[11px] text-muted-foreground">
									Terminates the AMQP TCP socket immediately and closes all{" "}
									{connection?.channels ?? 0} multiplexed channels.
								</p>
								<div className="flex gap-2">
									<input
										type="text"
										value={closeReason}
										onChange={(e) => setCloseReason(e.target.value)}
										placeholder="Reason for closing connection"
										className="h-8 flex-1 rounded border border-border bg-background px-2.5 text-xs text-foreground font-mono"
									/>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => setShowCloseConfirm(true)}
										className="h-8 text-xs"
									>
										Force Close
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{activeTab === "channels" && (
					<Card className="border border-border/80">
						<CardHeader className="pb-3 border-b border-border/50">
							<CardTitle className="text-base">
								Associated Channels ({channels.length})
							</CardTitle>
							<CardDescription className="text-xs">
								All AMQP channels currently multiplexed over this connection.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Channel</TableHead>
										<TableHead>State</TableHead>
										<TableHead>Mode</TableHead>
										<TableHead>Prefetch</TableHead>
										<TableHead>Unacked</TableHead>
										<TableHead>Consumers</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{channels.length ? (
										channels.map((ch) => (
											<TableRow key={ch.name}>
												<TableCell>
													<Link
														to="/channels/$name"
														params={{ name: encodeURIComponent(ch.name) }}
														className="font-mono text-xs text-primary hover:underline"
													>
														{ch.name}
													</Link>
												</TableCell>
												<TableCell>
													<Badge
														variant={
															ch.state === "running" ? "success" : "outline"
														}
														className="text-[10px] uppercase font-mono"
													>
														{ch.state || "idle"}
													</Badge>
												</TableCell>
												<TableCell className="font-mono text-xs">
													{ch.confirm
														? "Confirm"
														: ch.transactional
															? "Tx"
															: "Standard"}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{ch.prefetch_count ?? 0}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{ch.messages_unacknowledged ?? 0}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{ch.consumer_count ?? 0}
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell
												colSpan={6}
												className="h-24 text-center text-muted-foreground text-xs"
											>
												No active channels currently open on this connection.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				)}

				{activeTab === "properties" && (
					<Card className="border border-border/80">
						<CardHeader className="pb-3 border-b border-border/50">
							<CardTitle className="text-base">
								Client Properties & Capabilities
							</CardTitle>
							<CardDescription className="text-xs">
								Metadata sent by the client library during the AMQP handshake.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-4 space-y-4">
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Product
									</div>
									<div className="font-mono text-foreground">
										{connection?.client_properties?.product || "Unknown"}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Version
									</div>
									<div className="font-mono text-foreground">
										{connection?.client_properties?.version || "Unknown"}
									</div>
								</div>
								<div>
									<div className="text-[10px] text-muted-foreground uppercase font-semibold">
										Platform
									</div>
									<div className="font-mono text-foreground">
										{connection?.client_properties?.platform || "Unknown"}
									</div>
								</div>
							</div>

							<div className="space-y-1.5">
								<h4 className="text-xs font-semibold text-foreground">
									Capabilities
								</h4>
								<div className="p-3 rounded-lg border border-border bg-muted/10 font-mono text-[11px] space-y-1">
									{connection?.client_properties?.capabilities ? (
										Object.entries(
											connection.client_properties.capabilities,
										).map(([key, value]) => (
											<div
												key={key}
												className="flex items-center justify-between"
											>
												<span className="text-muted-foreground">{key}</span>
												<Badge
													variant={value ? "success" : "outline"}
													className="text-[9px] py-0"
												>
													{String(value)}
												</Badge>
											</div>
										))
									) : (
										<span className="text-muted-foreground">
											No capabilities reported.
										</span>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Force Close Confirmation Modal */}
			{showCloseConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-5 space-y-4 animate-in zoom-in-95 fade-in duration-150">
						<div className="flex items-center gap-2 text-destructive font-semibold">
							<AlertTriangle className="h-5 w-5" />
							<span>Force Close Connection?</span>
						</div>
						<p className="text-xs text-muted-foreground">
							This will immediately terminate the socket for{" "}
							<strong className="font-mono text-foreground">{name}</strong> and
							close all its channels. Reason:{" "}
							<span className="font-mono text-foreground">{closeReason}</span>
						</p>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowCloseConfirm(false)}
							>
								Cancel
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={handleForceClose}
								disabled={isClosing}
							>
								{isClosing ? "Closing..." : "Force Close"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
