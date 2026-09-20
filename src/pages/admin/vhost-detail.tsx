import { Breadcrumbs } from "@/components/Breadcrumbs/index.tsx";
import { useConfirm } from "@/components/ConfirmDialog/index.tsx";
import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card/index.tsx";
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
import { useAuth } from "@/hooks/useAuth/index.ts";
import {
	useRabbitExchanges,
	useRabbitMutations,
	useRabbitPermissions,
	useRabbitTopicPermissions,
	useRabbitUsers,
	useRabbitVHostDetail,
} from "@/hooks/useRabbitMQ/index.ts";
import {
	formatBytes,
	formatRate,
} from "@/services/rabbitmq/utils.ts";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
	Activity,
	ArrowDownUp,
	ChevronRight,
	Cpu,
	Database,
	MessageSquare,
	Network,
	Server,
	Trash2,
	TrendingDown,
	TrendingUp,
	Zap,
} from "lucide-react";
import * as React from "react";

const ADMIN_TAGS = ["administrator", "policymaker"];

export function VHostDetailPage() {
	const { user } = useAuth();
	const params = useParams({ strict: false }) as { name?: string };
	const navigate = useNavigate();
	const confirm = useConfirm();

	const vhostName = params.name ? decodeURIComponent(params.name) : "";

	const isAuthorized =
		user?.tags?.some((tag) => ADMIN_TAGS.includes(tag)) ?? false;

	const { data: vhost, isLoading } = useRabbitVHostDetail(vhostName);
	const { data: allPermissions = [] } = useRabbitPermissions();
	const { data: allTopicPermissions = [] } = useRabbitTopicPermissions();
	const { data: users = [] } = useRabbitUsers();
	const { data: exchanges = [] } = useRabbitExchanges(vhostName);

	const {
		setUserPermissions,
		clearUserPermissions,
		setUserTopicPermission,
		clearUserTopicPermission,
		deleteVHost,
	} = useRabbitMutations();

	// Filter permissions for this vhost only
	const permissions = React.useMemo(
		() => allPermissions.filter((p) => p.vhost === vhostName),
		[allPermissions, vhostName],
	);
	const topicPermissions = React.useMemo(
		() => allTopicPermissions.filter((p) => p.vhost === vhostName),
		[allTopicPermissions, vhostName],
	);

	// Permission form state
	const [permUser, setPermUser] = React.useState("");
	const [permConf, setPermConf] = React.useState(".*");
	const [permWrite, setPermWrite] = React.useState(".*");
	const [permRead, setPermRead] = React.useState(".*");
	const [isSettingPerm, setIsSettingPerm] = React.useState(false);

	// Topic permission form state
	const [topicUser, setTopicUser] = React.useState("");
	const [topicExchange, setTopicExchange] = React.useState("");
	const [topicWrite, setTopicWrite] = React.useState(".*");
	const [topicRead, setTopicRead] = React.useState(".*");
	const [isSettingTopicPerm, setIsSettingTopicPerm] = React.useState(false);

	// Seed the user dropdowns when user list loads
	React.useEffect(() => {
		if (users.length > 0) {
			setPermUser((prev) => prev || users[0]?.name || "");
			setTopicUser((prev) => prev || users[0]?.name || "");
		}
	}, [users]);

	// Prefill permission form when selected user changes
	React.useEffect(() => {
		const existing = permissions.find((p) => p.user === permUser);
		if (existing) {
			setPermConf(existing.configure);
			setPermWrite(existing.write);
			setPermRead(existing.read);
		} else {
			setPermConf(".*");
			setPermWrite(".*");
			setPermRead(".*");
		}
	}, [permUser, permissions]);

	const handleSetPermission = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!permUser) return;
		setIsSettingPerm(true);
		try {
			await setUserPermissions.mutateAsync({
				vhost: vhostName,
				user: permUser,
				permissions: { configure: permConf, write: permWrite, read: permRead },
			});
			toast.success(`Updated permissions for ${permUser} on ${vhostName}`);
		} catch (err: any) {
			toast.error("Failed to update permissions", err.message || String(err));
		} finally {
			setIsSettingPerm(false);
		}
	};

	const handleClearPermission = async (u: string) => {
		if (
			!(await confirm({
				title: "Revoke Permissions?",
				description: `Remove ${u}'s permissions on virtual host "${vhostName}"?`,
				confirmLabel: "Revoke",
			}))
		)
			return;
		try {
			await clearUserPermissions.mutateAsync({ vhost: vhostName, user: u });
			toast.success(`Revoked ${u}'s access to ${vhostName}`);
		} catch (err: any) {
			toast.error("Failed to revoke permissions", err.message || String(err));
		}
	};

	const handleSetTopicPermission = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!topicUser || !topicExchange.trim()) return;
		setIsSettingTopicPerm(true);
		try {
			await setUserTopicPermission.mutateAsync({
				vhost: vhostName,
				user: topicUser,
				exchange: topicExchange,
				write: topicWrite,
				read: topicRead,
			});
			toast.success(`Set topic permission for ${topicUser} on ${vhostName}`);
		} catch (err: any) {
			toast.error(
				"Failed to set topic permission",
				err.message || String(err),
			);
		} finally {
			setIsSettingTopicPerm(false);
		}
	};

	const handleClearTopicPermission = async (u: string) => {
		if (
			!(await confirm({
				title: "Revoke Topic Permissions?",
				description: `Remove ${u}'s topic permissions on virtual host "${vhostName}"?`,
				confirmLabel: "Revoke",
			}))
		)
			return;
		try {
			await clearUserTopicPermission.mutateAsync({ vhost: vhostName, user: u });
			toast.success(`Revoked ${u}'s topic access to ${vhostName}`);
		} catch (err: any) {
			toast.error(
				"Failed to revoke topic permissions",
				err.message || String(err),
			);
		}
	};

	const handleDelete = async () => {
		if (vhostName === "/") {
			toast.error("Cannot delete the default root virtual host (/).");
			return;
		}
		if (
			!(await confirm({
				title: "Delete Virtual Host?",
				description: `Are you sure you want to permanently delete virtual host "${vhostName}"? All its queues, exchanges, and bindings will be removed!`,
				confirmLabel: "Delete Virtual Host",
			}))
		)
			return;
		try {
			await deleteVHost.mutateAsync(vhostName);
			navigate({ to: "/admin/$tab", params: { tab: "vhosts" }, replace: true });
		} catch (err: any) {
			toast.error("Failed to delete virtual host", err.message || String(err));
		}
	};

	if (!isAuthorized) {
		return (
			<div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
				You need administrator or policymaker rights to view this page.
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-48 text-muted-foreground text-sm animate-pulse">
				Loading virtual host…
			</div>
		);
	}

	if (!vhost) {
		return (
			<div className="space-y-4">
				<Breadcrumbs>
					<Link to="/admin/$tab" params={{ tab: "vhosts" }} className="hover:text-foreground transition-colors">
						Admin
					</Link>
					<ChevronRight className="h-3 w-3" />
					<Link to="/admin/$tab" params={{ tab: "vhosts" }} className="hover:text-foreground transition-colors">
						Virtual Hosts
					</Link>
					<ChevronRight className="h-3 w-3" />
					<span className="text-foreground font-medium">{vhostName}</span>
				</Breadcrumbs>
				<div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
					Virtual host &quot;{vhostName}&quot; not found.
				</div>
			</div>
		);
	}

	// Stats derived from the vhost object
	const msgReady = vhost.messages_ready ?? 0;
	const msgUnack = vhost.messages_unacknowledged ?? 0;
	const msgTotal = vhost.messages ?? msgReady + msgUnack;
	const publishRate = vhost.message_stats?.publish_details?.rate;
	const deliverRate = vhost.message_stats?.deliver_get_details?.rate;
	const ackRate = vhost.message_stats?.ack_details?.rate;
	const recvOct = vhost.recv_oct;
	const sendOct = vhost.send_oct;

	const clusterNodes = Object.entries(vhost.cluster_state ?? {});

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Breadcrumbs>
				<Link
					to="/admin/$tab"
					params={{ tab: "vhosts" }}
					className="hover:text-foreground transition-colors"
				>
					Admin
				</Link>
				<ChevronRight className="h-3 w-3" />
				<Link
					to="/admin/$tab"
					params={{ tab: "vhosts" }}
					className="hover:text-foreground transition-colors"
				>
					Virtual Hosts
				</Link>
				<ChevronRight className="h-3 w-3" />
				<span className="text-foreground font-medium font-mono">
					{vhostName}
				</span>
			</Breadcrumbs>

			{/* Page header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
						<Network className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h1 className="text-xl font-bold text-foreground font-mono">
							{vhostName}
						</h1>
						{vhost.description && (
							<p className="text-xs text-muted-foreground mt-0.5">
								{vhost.description}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Badge
						variant="outline"
						className="font-mono text-[10px] uppercase"
					>
						{vhost.default_queue_type ?? "classic"}
					</Badge>
					<Badge
						variant={vhost.tracing ? "success" : "outline"}
						className="text-[10px]"
					>
						{vhost.tracing ? "Tracing Active" : "Tracing Off"}
					</Badge>
				</div>
			</div>

			{/* Stats row */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
				{/* Messages */}
				<Card className="col-span-2 sm:col-span-1">
					<CardContent className="pt-4 pb-3 px-4">
						<div className="flex items-start justify-between gap-2">
							<div className="space-y-0.5">
								<p className="text-xs text-muted-foreground">Messages</p>
								<p className="text-2xl font-bold font-mono text-foreground">
									{msgTotal.toLocaleString()}
								</p>
							</div>
							<div className="p-1.5 rounded-md bg-blue-500/10 shrink-0">
								<MessageSquare className="h-4 w-4 text-blue-500" />
							</div>
						</div>
						<div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
							<span className="flex items-center gap-1">
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
								{msgReady.toLocaleString()} ready
							</span>
							<span className="flex items-center gap-1">
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
								{msgUnack.toLocaleString()} unacked
							</span>
						</div>
					</CardContent>
				</Card>

				{/* Publish rate */}
				<Card>
					<CardContent className="pt-4 pb-3 px-4">
						<div className="flex items-start justify-between gap-2">
							<div className="space-y-0.5">
								<p className="text-xs text-muted-foreground">Publish Rate</p>
								<p className="text-2xl font-bold font-mono text-foreground">
									{formatRate(publishRate)}
								</p>
							</div>
							<div className="p-1.5 rounded-md bg-emerald-500/10 shrink-0">
								<TrendingUp className="h-4 w-4 text-emerald-500" />
							</div>
						</div>
						<p className="mt-2 text-[11px] text-muted-foreground">
							msgs/sec into vhost
						</p>
					</CardContent>
				</Card>

				{/* Deliver rate */}
				<Card>
					<CardContent className="pt-4 pb-3 px-4">
						<div className="flex items-start justify-between gap-2">
							<div className="space-y-0.5">
								<p className="text-xs text-muted-foreground">Deliver Rate</p>
								<p className="text-2xl font-bold font-mono text-foreground">
									{formatRate(deliverRate)}
								</p>
							</div>
							<div className="p-1.5 rounded-md bg-violet-500/10 shrink-0">
								<TrendingDown className="h-4 w-4 text-violet-500" />
							</div>
						</div>
						<p className="mt-2 text-[11px] text-muted-foreground">
							msgs/sec to consumers
						</p>
					</CardContent>
				</Card>

				{/* Ack rate */}
				<Card>
					<CardContent className="pt-4 pb-3 px-4">
						<div className="flex items-start justify-between gap-2">
							<div className="space-y-0.5">
								<p className="text-xs text-muted-foreground">Ack Rate</p>
								<p className="text-2xl font-bold font-mono text-foreground">
									{formatRate(ackRate)}
								</p>
							</div>
							<div className="p-1.5 rounded-md bg-orange-500/10 shrink-0">
								<Zap className="h-4 w-4 text-orange-500" />
							</div>
						</div>
						<p className="mt-2 text-[11px] text-muted-foreground">
							acks/sec from consumers
						</p>
					</CardContent>
				</Card>

				{/* Network I/O */}
				<Card>
					<CardContent className="pt-4 pb-3 px-4">
						<div className="flex items-start justify-between gap-2">
							<div className="space-y-0.5">
								<p className="text-xs text-muted-foreground">Network I/O</p>
								<p className="text-lg font-bold font-mono text-foreground leading-tight">
									{recvOct !== undefined ? formatBytes(recvOct) : "—"}
								</p>
							</div>
							<div className="p-1.5 rounded-md bg-cyan-500/10 shrink-0">
								<ArrowDownUp className="h-4 w-4 text-cyan-500" />
							</div>
						</div>
						<p className="mt-2 text-[11px] text-muted-foreground">
							↑ {sendOct !== undefined ? formatBytes(sendOct) : "—"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Overview + cluster state */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Overview */}
				<Card className="lg:col-span-2">
					<CardHeader className="pb-3 pt-4 px-5 border-b border-border">
						<CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
							<Database className="h-3.5 w-3.5" />
							Overview
						</CardTitle>
					</CardHeader>
					<CardContent className="px-5 py-4">
						<dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
							<div>
								<dt className="text-xs text-muted-foreground mb-0.5">Description</dt>
								<dd className="font-mono text-foreground text-xs">
									{vhost.description || "—"}
								</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground mb-0.5">
									Default Queue Type
								</dt>
								<dd>
									<Badge variant="outline" className="font-mono text-[10px] uppercase">
										{vhost.default_queue_type ?? "classic"}
									</Badge>
								</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground mb-0.5">Tracing</dt>
								<dd>
									<Badge
										variant={vhost.tracing ? "success" : "outline"}
										className="text-[10px]"
									>
										{vhost.tracing ? "Active" : "Off"}
									</Badge>
								</dd>
							</div>
							<div>
								<dt className="text-xs text-muted-foreground mb-0.5">Tags</dt>
								<dd className="font-mono text-foreground text-xs">
									{vhost.tags?.length ? vhost.tags.join(", ") : "—"}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				{/* Cluster state */}
				<Card>
					<CardHeader className="pb-3 pt-4 px-5 border-b border-border">
						<CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
							<Server className="h-3.5 w-3.5" />
							Cluster Nodes
						</CardTitle>
					</CardHeader>
					<CardContent className="px-5 py-4">
						{clusterNodes.length ? (
							<ul className="space-y-1.5">
								{clusterNodes.map(([node, state]) => (
									<li
										key={node}
										className="flex items-center justify-between gap-2 text-xs"
									>
										<span className="font-mono text-foreground truncate">
											{node}
										</span>
										<Badge
											variant={state === "running" ? "success" : "destructive"}
											className="text-[10px] shrink-0"
										>
											{state}
										</Badge>
									</li>
								))}
							</ul>
						) : (
							<p className="text-xs text-muted-foreground">
								No cluster state available.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Permissions */}
			<Card>
				<CardHeader className="pb-3 pt-4 px-5 border-b border-border">
					<CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
						<Activity className="h-3.5 w-3.5" />
						Permissions
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Configure</TableHead>
								<TableHead>Write</TableHead>
								<TableHead>Read</TableHead>
								<TableHead className="text-right w-10" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{permissions.length ? (
								permissions.map((p) => (
									<TableRow key={p.user}>
										<TableCell className="font-mono text-xs font-semibold">
											{p.user}
										</TableCell>
										<TableCell className="font-mono text-xs">{p.configure}</TableCell>
										<TableCell className="font-mono text-xs">{p.write}</TableCell>
										<TableCell className="font-mono text-xs">{p.read}</TableCell>
										<TableCell className="text-right">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleClearPermission(p.user)}
												className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
												title={`Revoke ${p.user}'s access`}
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={5}
										className="h-16 text-center text-muted-foreground text-xs"
									>
										No permissions granted on this virtual host yet.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>

					{/* Add / Update permission form */}
					<form
						onSubmit={handleSetPermission}
						className="p-5 border-t border-border space-y-3"
					>
						<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Set Permission
						</p>
						<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									User
								</label>
								<Dropdown
									value={permUser}
									onChange={(v) => setPermUser(v as string)}
									options={users.map((u) => ({ label: u.name, value: u.name }))}
									className="w-full"
									buttonClassName="h-9 w-full justify-between px-3 text-sm font-mono"
									contentClassName="w-full"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									Configure
								</label>
								<input
									type="text"
									value={permConf}
									onChange={(e) => setPermConf(e.target.value)}
									placeholder=".*"
									className="h-9 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									Write
								</label>
								<input
									type="text"
									value={permWrite}
									onChange={(e) => setPermWrite(e.target.value)}
									placeholder=".*"
									className="h-9 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									Read
								</label>
								<input
									type="text"
									value={permRead}
									onChange={(e) => setPermRead(e.target.value)}
									placeholder=".*"
									className="h-9 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>
						</div>
						<div className="flex justify-end">
							<Button
								type="submit"
								size="sm"
								disabled={isSettingPerm || !permUser}
							>
								{isSettingPerm ? "Saving…" : "Set Permission"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{/* Topic Permissions */}
			<Card>
				<CardHeader className="pb-3 pt-4 px-5 border-b border-border">
					<CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
						<Cpu className="h-3.5 w-3.5" />
						Topic Permissions
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Exchange</TableHead>
								<TableHead>Write</TableHead>
								<TableHead>Read</TableHead>
								<TableHead className="text-right w-10" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{topicPermissions.length ? (
								topicPermissions.map((p) => (
									<TableRow key={`${p.user}:${p.exchange}`}>
										<TableCell className="font-mono text-xs font-semibold">
											{p.user}
										</TableCell>
										<TableCell className="font-mono text-xs">
											{p.exchange || "(AMQP default)"}
										</TableCell>
										<TableCell className="font-mono text-xs">{p.write}</TableCell>
										<TableCell className="font-mono text-xs">{p.read}</TableCell>
										<TableCell className="text-right">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleClearTopicPermission(p.user)}
												className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
												title={`Revoke ${p.user}'s topic access`}
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</TableCell>
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={5}
										className="h-16 text-center text-muted-foreground text-xs"
									>
										No topic permissions granted on this virtual host yet.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>

					{/* Add topic permission form */}
					<form
						onSubmit={handleSetTopicPermission}
						className="p-5 border-t border-border space-y-3"
					>
						<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
							Set Topic Permission
						</p>
						<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									User
								</label>
								<Dropdown
									value={topicUser}
									onChange={(v) => setTopicUser(v as string)}
									options={users.map((u) => ({ label: u.name, value: u.name }))}
									className="w-full"
									buttonClassName="h-9 w-full justify-between px-3 text-sm font-mono"
									contentClassName="w-full"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									Exchange
								</label>
								<Dropdown
									value={topicExchange}
									onChange={(v) => setTopicExchange(v as string)}
									options={[
										{ label: "(AMQP default)", value: "" },
										...exchanges.map((ex) => ({
											label: ex.name,
											value: ex.name,
										})),
									]}
									className="w-full"
									buttonClassName="h-9 w-full justify-between px-3 text-sm font-mono"
									contentClassName="w-full"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									Write
								</label>
								<input
									type="text"
									value={topicWrite}
									onChange={(e) => setTopicWrite(e.target.value)}
									placeholder=".*"
									className="h-9 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">
									Read
								</label>
								<input
									type="text"
									value={topicRead}
									onChange={(e) => setTopicRead(e.target.value)}
									placeholder=".*"
									className="h-9 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>
						</div>
						<div className="flex justify-end">
							<Button
								type="submit"
								size="sm"
								disabled={isSettingTopicPerm || !topicUser || !topicExchange.trim()}
							>
								{isSettingTopicPerm ? "Saving…" : "Set Topic Permission"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{/* Danger zone */}
			{vhostName !== "/" && (
				<Card className="border-destructive/30">
					<CardHeader className="pb-3 pt-4 px-5 border-b border-destructive/20">
						<CardTitle className="text-xs font-bold uppercase tracking-wide text-destructive/80 flex items-center gap-1.5">
							<Trash2 className="h-3.5 w-3.5" />
							Danger Zone
						</CardTitle>
					</CardHeader>
					<CardContent className="px-5 py-4">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-sm font-medium text-foreground">
									Delete this virtual host
								</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									Permanently removes all queues, exchanges, and bindings. This
									cannot be undone.
								</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleDelete}
								className="shrink-0 text-destructive hover:bg-destructive/10 border border-destructive/30"
							>
								<Trash2 className="h-3.5 w-3.5 mr-1.5" />
								Delete Virtual Host
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
