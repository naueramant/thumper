import { useConfirm } from "@/components/ConfirmDialog/index.tsx";
import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import { Dropdown } from "@/components/ui/dropdown/index.tsx";
import { toast } from "@/components/ui/toast/index.tsx";
import {
	useRabbitExchanges,
	useRabbitMutations,
} from "@/hooks/useRabbitMQ/index.ts";
import type {
	Permission,
	TopicPermission,
} from "@/services/rabbitmq/types/permissions.ts";
import type { User } from "@/services/rabbitmq/types/user.ts";
import {
	Check,
	Eye,
	EyeOff,
	Hash,
	Info,
	KeyRound,
	Lock,
	Plus,
	Shield,
	ShieldCheck,
	Trash2,
	UserCog,
	X,
	Zap,
} from "lucide-react";
import * as React from "react";

const STANDARD_ROLES = [
	{
		id: "administrator",
		label: "Administrator",
		description: "Full cluster management and user administration",
	},
	{
		id: "policymaker",
		label: "Policymaker",
		description: "Manage virtual hosts policies and parameters",
	},
	{
		id: "monitoring",
		label: "Monitoring",
		description: "View node metrics, cluster statistics, and events",
	},
	{
		id: "management",
		label: "Management",
		description: "Standard web console access",
	},
] as const;

interface ManageUserModalProps {
	user: User;
	onClose: () => void;
	vhosts: Array<{ name: string }>;
	permissions: Permission[];
	topicPermissions: TopicPermission[];
	onDeleteUser?: (username: string) => void;
}

export function ManageUserModal({
	user,
	onClose,
	vhosts,
	permissions,
	topicPermissions,
	onDeleteUser,
}: ManageUserModalProps) {
	const confirm = useConfirm();
	const {
		setUserPermissions,
		clearUserPermissions,
		setUserTopicPermission,
		clearUserTopicPermission,
		updateUser,
	} = useRabbitMutations();

	const [activeTab, setActiveTab] = React.useState<
		"permissions" | "topics" | "account"
	>("permissions");

	// VHost Permissions form state
	const defaultVHost = vhosts[0]?.name ?? "/";
	const [permVHost, setPermVHost] = React.useState<string>(defaultVHost);
	const [permConf, setPermConf] = React.useState(".*");
	const [permWrite, setPermWrite] = React.useState(".*");
	const [permRead, setPermRead] = React.useState(".*");
	const [isSettingPerm, setIsSettingPerm] = React.useState(false);
	const [vhostSearch, setVhostSearch] = React.useState("");

	// Topic Permissions form state
	const [topicPermVHost, setTopicPermVHost] = React.useState<string>(defaultVHost);
	const [topicPermExchange, setTopicPermExchange] = React.useState("");
	const [topicPermWrite, setTopicPermWrite] = React.useState(".*");
	const [topicPermRead, setTopicPermRead] = React.useState(".*");
	const [isSettingTopicPerm, setIsSettingTopicPerm] = React.useState(false);
	const [topicSearch, setTopicSearch] = React.useState("");

	// Account form state
	const [userTags, setUserTags] = React.useState<string[]>([]);
	const [customTagInput, setCustomTagInput] = React.useState("");
	const [userPassword, setUserPassword] = React.useState("");
	const [showPassword, setShowPassword] = React.useState(false);
	const [isUpdatingUser, setIsUpdatingUser] = React.useState(false);

	// Filter grants for this user
	const userGrants = React.useMemo(
		() => permissions.filter((p) => p.user === user.name),
		[permissions, user.name],
	);

	const userTopicGrants = React.useMemo(
		() => topicPermissions.filter((p) => p.user === user.name),
		[topicPermissions, user.name],
	);

	const { data: topicPermVHostExchanges = [] } =
		useRabbitExchanges(topicPermVHost);

	// Initialize form on mount or when user changes
	React.useEffect(() => {
		const rawTags = Array.isArray(user.tags)
			? user.tags
			: typeof user.tags === "string"
				? (user.tags as string).split(",").map((t) => t.trim()).filter(Boolean)
				: [];
		setUserTags(rawTags);
		setUserPassword("");
		setShowPassword(false);

		// If user has existing grants, select first one by default, otherwise default vhost
		const firstGrant = permissions.find((p) => p.user === user.name);
		if (firstGrant) {
			setPermVHost(firstGrant.vhost);
			setTopicPermVHost(firstGrant.vhost);
		} else {
			setPermVHost(defaultVHost);
			setTopicPermVHost(defaultVHost);
		}
	}, [user, permissions, defaultVHost]);

	// Prefill VHost permissions form when selected vhost changes
	React.useEffect(() => {
		const existing = userGrants.find((p) => p.vhost === permVHost);
		if (existing) {
			setPermConf(existing.configure ?? ".*");
			setPermWrite(existing.write ?? ".*");
			setPermRead(existing.read ?? ".*");
		} else {
			setPermConf(".*");
			setPermWrite(".*");
			setPermRead(".*");
		}
	}, [permVHost, userGrants]);

	const selectedGrantExists = userGrants.some((p) => p.vhost === permVHost);

	// Handlers
	const handleSavePermissions = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSettingPerm(true);
		try {
			await setUserPermissions.mutateAsync({
				vhost: permVHost,
				user: user.name,
				permissions: {
					configure: permConf,
					write: permWrite,
					read: permRead,
				},
			});
			toast.success(`Updated permissions for ${user.name} on ${permVHost}`);
		} catch (err: any) {
			toast.error("Failed to set permissions", err.message || String(err));
		} finally {
			setIsSettingPerm(false);
		}
	};

	const handleClearPermission = async (vhost: string) => {
		if (
			!(await confirm({
				title: "Revoke VHost Access?",
				description: `Remove ${user.name}'s permissions on virtual host "${vhost}"?`,
				confirmLabel: "Revoke Access",
			}))
		)
			return;

		try {
			await clearUserPermissions.mutateAsync({ vhost, user: user.name });
			toast.success(`Revoked ${user.name}'s access to ${vhost}`);
		} catch (err: any) {
			toast.error("Failed to revoke permissions", err.message || String(err));
		}
	};

	const handleSaveTopicPermission = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!topicPermExchange.trim()) {
			toast.error("Exchange is required", "Please specify or select an exchange.");
			return;
		}
		setIsSettingTopicPerm(true);
		try {
			await setUserTopicPermission.mutateAsync({
				vhost: topicPermVHost,
				user: user.name,
				exchange: topicPermExchange.trim(),
				write: topicPermWrite,
				read: topicPermRead,
			});
			toast.success(
				`Set topic permission for ${user.name} on ${topicPermExchange}`,
			);
		} catch (err: any) {
			toast.error("Failed to set topic permission", err.message || String(err));
		} finally {
			setIsSettingTopicPerm(false);
		}
	};

	const handleClearTopicPermission = async (vhost: string) => {
		if (
			!(await confirm({
				title: "Revoke Topic Access?",
				description: `Remove ${user.name}'s topic permissions on virtual host "${vhost}"?`,
				confirmLabel: "Revoke Access",
			}))
		)
			return;

		try {
			await clearUserTopicPermission.mutateAsync({
				vhost,
				user: user.name,
			});
			toast.success(`Revoked ${user.name}'s topic access to ${vhost}`);
		} catch (err: any) {
			toast.error("Failed to revoke topic permissions", err.message || String(err));
		}
	};

	const handleToggleRoleTag = (roleId: string) => {
		setUserTags((prev) =>
			prev.includes(roleId) ? prev.filter((t) => t !== roleId) : [...prev, roleId],
		);
	};

	const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			const trimmed = customTagInput.trim().toLowerCase();
			if (trimmed && !userTags.includes(trimmed)) {
				setUserTags((prev) => [...prev, trimmed]);
			}
			setCustomTagInput("");
		}
	};

	const handleRemoveTag = (tag: string) => {
		setUserTags((prev) => prev.filter((t) => t !== tag));
	};

	const handleSaveAccount = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsUpdatingUser(true);
		try {
			const finalTags = [...userTags];
			if (customTagInput.trim() && !finalTags.includes(customTagInput.trim())) {
				finalTags.push(customTagInput.trim());
			}

			await updateUser.mutateAsync({
				name: user.name,
				data: userPassword.trim()
					? { password: userPassword.trim(), tags: finalTags }
					: { password_hash: user.password_hash, tags: finalTags },
			});
			setUserPassword("");
			setCustomTagInput("");
			toast.success(`Updated account settings for "${user.name}"`);
		} catch (err: any) {
			toast.error("Failed to update user", err.message || String(err));
		} finally {
			setIsUpdatingUser(false);
		}
	};

	// Presets helpers
	const applyVHostPreset = (conf: string, write: string, read: string) => {
		setPermConf(conf);
		setPermWrite(write);
		setPermRead(read);
	};

	const applyTopicPreset = (write: string, read: string) => {
		setTopicPermWrite(write);
		setTopicPermRead(read);
	};

	// Filtered lists
	const filteredUserGrants = userGrants.filter((p) =>
		p.vhost.toLowerCase().includes(vhostSearch.toLowerCase()),
	);

	const filteredTopicGrants = userTopicGrants.filter(
		(p) =>
			p.vhost.toLowerCase().includes(topicSearch.toLowerCase()) ||
			p.exchange.toLowerCase().includes(topicSearch.toLowerCase()),
	);

	const vhostOptions = React.useMemo(
		() =>
			vhosts.map((v) => ({
				label: v.name,
				value: v.name,
			})),
		[vhosts],
	);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
			<div className="flex w-full max-w-4xl max-h-[88vh] flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/25">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
							<ShieldCheck className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-bold text-foreground">
									Manage User
								</h2>
								<span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border">
									{user.name}
								</span>
								{user.name === "guest" && (
									<Badge variant="outline" className="text-[10px] text-muted-foreground">
										Default Guest
									</Badge>
								)}
								{Array.isArray(user.tags) && user.tags.length > 0 && (
									<div className="hidden sm:flex items-center gap-1">
										{user.tags.slice(0, 2).map((tag) => (
											<Badge
												key={tag}
												variant="secondary"
												className="text-[10px] px-1.5 font-mono capitalize"
											>
												{tag}
											</Badge>
										))}
										{user.tags.length > 2 && (
											<span className="text-[10px] text-muted-foreground font-mono">
												+{user.tags.length - 2}
											</span>
										)}
									</div>
								)}
							</div>
							<p className="text-xs text-muted-foreground">
								Configure virtual host access, topic-level permissions, and account settings.
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
						aria-label="Close modal"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Tabs Header */}
				<div className="flex items-center gap-2 px-6 pt-2 border-b border-border bg-card">
					<button
						type="button"
						onClick={() => setActiveTab("permissions")}
						className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors ${
							activeTab === "permissions"
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<Shield className="h-3.5 w-3.5" />
						<span>VHost Permissions</span>
						<span
							className={`inline-flex items-center rounded-full px-1.5 py-0.5 leading-none font-mono text-[10px] ${
								activeTab === "permissions"
									? "bg-primary/15 text-primary font-semibold"
									: "bg-muted text-muted-foreground"
							}`}
						>
							{userGrants.length}
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("topics")}
						className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors ${
							activeTab === "topics"
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<Hash className="h-3.5 w-3.5" />
						<span>Topic Permissions</span>
						<span
							className={`inline-flex items-center rounded-full px-1.5 py-0.5 leading-none font-mono text-[10px] ${
								activeTab === "topics"
									? "bg-primary/15 text-primary font-semibold"
									: "bg-muted text-muted-foreground"
							}`}
						>
							{userTopicGrants.length}
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("account")}
						className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors ${
							activeTab === "account"
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<UserCog className="h-3.5 w-3.5" />
						<span>Account & Roles</span>
					</button>
				</div>

				{/* Modal Body with Custom Scrollbar */}
				<div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-6">
					{/* TAB 1: VHOST PERMISSIONS */}
					{activeTab === "permissions" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
							{/* Left Column: Active Grants List */}
							<div className="lg:col-span-5 flex flex-col space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1.5">
										<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											Active Grants
										</h3>
										<span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
											{userGrants.length}
										</span>
									</div>
									{userGrants.length > 3 && (
										<input
											type="text"
											value={vhostSearch}
											onChange={(e) => setVhostSearch(e.target.value)}
											placeholder="Filter vhosts..."
											className="h-7 w-28 rounded border border-border bg-muted/30 px-2 text-xs placeholder:text-muted-foreground/60 focus:w-36 transition-all"
										/>
									)}
								</div>

								{userGrants.length === 0 ? (
									<div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 text-muted-foreground">
										<Shield className="h-8 w-8 mb-2 opacity-30" />
										<p className="text-xs font-medium text-foreground">
											No virtual host access
										</p>
										<p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
											Configure access on the right to grant permissions to a virtual host.
										</p>
									</div>
								) : (
									<div className="max-h-[380px] overflow-y-auto scrollbar-thin space-y-2 pr-1">
										{filteredUserGrants.map((grant) => {
											const isSelected = grant.vhost === permVHost;
											return (
												<div
													key={grant.vhost}
													onClick={() => setPermVHost(grant.vhost)}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															setPermVHost(grant.vhost);
														}
													}}
													role="button"
													tabIndex={0}
													className={`group flex flex-col gap-2 rounded-lg border p-3 text-left transition-all cursor-pointer ${
														isSelected
															? "border-primary/60 bg-primary/5 shadow-xs ring-1 ring-primary/20"
															: "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
													}`}
												>
													<div className="flex items-center justify-between gap-2">
														<div className="flex items-center gap-2 min-w-0">
															<span
																className={`font-mono text-xs font-semibold truncate ${
																	isSelected
																		? "text-primary"
																		: "text-foreground"
																}`}
															>
																{grant.vhost}
															</span>
															{isSelected && (
																<span className="inline-flex items-center text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 leading-none rounded">
																	Selected
																</span>
															)}
														</div>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																handleClearPermission(grant.vhost);
															}}
															className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-70 group-hover:opacity-100"
															title={`Revoke access to ${grant.vhost}`}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</button>
													</div>

													<div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-border/40 text-[10px]">
														<div className="min-w-0">
															<span className="text-muted-foreground block text-[9px] uppercase tracking-wider">
																Conf
															</span>
															<span className="font-mono text-foreground truncate block font-medium">
																{grant.configure}
															</span>
														</div>
														<div className="min-w-0">
															<span className="text-muted-foreground block text-[9px] uppercase tracking-wider">
																Write
															</span>
															<span className="font-mono text-foreground truncate block font-medium">
																{grant.write}
															</span>
														</div>
														<div className="min-w-0">
															<span className="text-muted-foreground block text-[9px] uppercase tracking-wider">
																Read
															</span>
															<span className="font-mono text-foreground truncate block font-medium">
																{grant.read}
															</span>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* Right Column: Permission Editor Card */}
							<div className="lg:col-span-7">
								<form
									onSubmit={handleSavePermissions}
									className="rounded-xl border border-border bg-muted/15 p-5 space-y-4"
								>
									<div className="flex items-center justify-between pb-3 border-b border-border">
										<div>
											<h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
												<KeyRound className="h-4 w-4 text-primary" />
												{selectedGrantExists
													? `Edit Permissions for "${permVHost}"`
													: "Grant New Permissions"}
											</h3>
											<p className="text-xs text-muted-foreground mt-0.5">
												Define regex patterns controlling which AMQP resources the user can access.
											</p>
										</div>
										{selectedGrantExists && (
											<button
												type="button"
												onClick={() => {
													const ungranted = vhosts.find(
														(v) => !userGrants.some((g) => g.vhost === v.name),
													);
													if (ungranted) {
														setPermVHost(ungranted.name);
													}
												}}
												className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
											>
												<Plus className="h-3 w-3" />
												New Grant
											</button>
										)}
									</div>

									{/* Virtual Host Dropdown */}
									<div className="space-y-1.5">
										<div className="flex items-center justify-between">
											<label className="text-xs font-medium text-foreground">
												Target Virtual Host
											</label>
											{selectedGrantExists && (
												<span className="text-[11px] text-amber-500 font-medium">
													Editing existing grant
												</span>
											)}
										</div>
										<Dropdown
											value={permVHost}
											onChange={(v) => setPermVHost(v as string)}
											options={vhostOptions}
											className="w-full"
											buttonClassName="h-9 w-full justify-between px-3 text-xs font-mono bg-card"
											contentClassName="w-full scrollbar-thin"
										/>
									</div>

									{/* Presets Bar */}
									<div className="space-y-1.5">
										<div className="flex items-center justify-between">
											<span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
												<Zap className="h-3 w-3 text-amber-500" />
												Quick Presets
											</span>
										</div>
										<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
											<button
												type="button"
												onClick={() => applyVHostPreset(".*", ".*", ".*")}
												className="rounded border border-border bg-card px-2 py-1.5 text-center text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
											>
												Full Access
											</button>
											<button
												type="button"
												onClick={() => applyVHostPreset("^$", ".*", ".*")}
												className="rounded border border-border bg-card px-2 py-1.5 text-center text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
											>
												Read & Write
											</button>
											<button
												type="button"
												onClick={() => applyVHostPreset("^$", "^$", ".*")}
												className="rounded border border-border bg-card px-2 py-1.5 text-center text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
											>
												Read Only
											</button>
											<button
												type="button"
												onClick={() => applyVHostPreset("^$", ".*", "^$")}
												className="rounded border border-border bg-card px-2 py-1.5 text-center text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
											>
												Write Only
											</button>
										</div>
									</div>

									{/* Regex Input Fields */}
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div className="space-y-1.5">
											<label className="text-xs font-medium text-foreground block">
												Configure Regex
											</label>
											<input
												type="text"
												value={permConf}
												onChange={(e) => setPermConf(e.target.value)}
												placeholder=".*"
												className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs font-mono focus:border-primary focus:outline-none"
											/>
											<span className="text-[10px] text-muted-foreground block">
												Create / Delete resources
											</span>
										</div>

										<div className="space-y-1.5">
											<label className="text-xs font-medium text-foreground block">
												Write Regex
											</label>
											<input
												type="text"
												value={permWrite}
												onChange={(e) => setPermWrite(e.target.value)}
												placeholder=".*"
												className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs font-mono focus:border-primary focus:outline-none"
											/>
											<span className="text-[10px] text-muted-foreground block">
												Publish messages
											</span>
										</div>

										<div className="space-y-1.5">
											<label className="text-xs font-medium text-foreground block">
												Read Regex
											</label>
											<input
												type="text"
												value={permRead}
												onChange={(e) => setPermRead(e.target.value)}
												placeholder=".*"
												className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs font-mono focus:border-primary focus:outline-none"
											/>
											<span className="text-[10px] text-muted-foreground block">
												Consume / Purge
											</span>
										</div>
									</div>

									{/* Helper Note */}
									<div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border/60 p-2.5 text-[11px] text-muted-foreground">
										<Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
										<span>
											Use <code className="font-mono text-foreground font-semibold">.*</code> to allow all names, or <code className="font-mono text-foreground font-semibold">^$</code> to deny all. You can use regex expressions such as <code className="font-mono text-foreground font-semibold">^amq\..*</code>.
										</span>
									</div>

									{/* Action Button */}
									<div className="flex justify-end pt-2">
										<Button type="submit" size="sm" disabled={isSettingPerm}>
											{isSettingPerm
												? "Saving..."
												: selectedGrantExists
													? "Update Permissions"
													: "Grant Permissions"}
										</Button>
									</div>
								</form>
							</div>
						</div>
					)}

					{/* TAB 2: TOPIC PERMISSIONS */}
					{activeTab === "topics" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
							{/* Left Column: Active Topic Grants */}
							<div className="lg:col-span-5 flex flex-col space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1.5">
										<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											Topic Grants
										</h3>
										<span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
											{userTopicGrants.length}
										</span>
									</div>
									{userTopicGrants.length > 3 && (
										<input
											type="text"
											value={topicSearch}
											onChange={(e) => setTopicSearch(e.target.value)}
											placeholder="Filter topic grants..."
											className="h-7 w-28 rounded border border-border bg-muted/30 px-2 text-xs placeholder:text-muted-foreground/60 focus:w-36 transition-all"
										/>
									)}
								</div>

								{userTopicGrants.length === 0 ? (
									<div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 text-muted-foreground">
										<Hash className="h-8 w-8 mb-2 opacity-30" />
										<p className="text-xs font-medium text-foreground">
											No topic permissions
										</p>
										<p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
											Topic authorization restricts routing keys published or consumed on topic exchanges.
										</p>
									</div>
								) : (
									<div className="max-h-[380px] overflow-y-auto scrollbar-thin space-y-2 pr-1">
										{filteredTopicGrants.map((grant) => (
											<div
												key={`${grant.vhost}:${grant.exchange}`}
												className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left hover:bg-muted/30 transition-all"
											>
												<div className="flex items-center justify-between gap-2">
													<div className="min-w-0">
														<span className="font-mono text-xs font-semibold text-foreground truncate block">
															{grant.vhost} / {grant.exchange || "(AMQP default)"}
														</span>
													</div>
													<button
														type="button"
														onClick={() => handleClearTopicPermission(grant.vhost)}
														className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
														title={`Revoke topic access on ${grant.vhost}`}
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												</div>

												<div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[10px]">
													<div>
														<span className="text-muted-foreground block text-[9px] uppercase tracking-wider">
															Write Regexp
														</span>
														<span className="font-mono text-foreground truncate block font-medium">
															{grant.write}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground block text-[9px] uppercase tracking-wider">
															Read Regexp
														</span>
														<span className="font-mono text-foreground truncate block font-medium">
															{grant.read}
														</span>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Right Column: Topic Form */}
							<div className="lg:col-span-7">
								<form
									onSubmit={handleSaveTopicPermission}
									className="rounded-xl border border-border bg-muted/15 p-5 space-y-4"
								>
									<div className="pb-3 border-b border-border">
										<h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
											<Hash className="h-4 w-4 text-primary" />
											Set Topic Permissions
										</h3>
										<p className="text-xs text-muted-foreground mt-0.5">
											Grant permissions to publish or consume specific routing keys on an exchange.
										</p>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div className="space-y-1.5">
											<label className="text-xs font-medium text-foreground">
												Virtual Host
											</label>
											<Dropdown
												value={topicPermVHost}
												onChange={(v) => setTopicPermVHost(v as string)}
												options={vhostOptions}
												className="w-full"
												buttonClassName="h-9 w-full justify-between px-3 text-xs font-mono bg-card"
												contentClassName="w-full scrollbar-thin"
											/>
										</div>

										<div className="space-y-1.5">
											<label className="text-xs font-medium text-foreground">
												Exchange
											</label>
											<Dropdown
												value={topicPermExchange}
												onChange={(v) => setTopicPermExchange(v as string)}
												options={[
													{ label: "(AMQP default)", value: "" },
													...topicPermVHostExchanges.map((ex) => ({
														label: ex.name,
														value: ex.name,
													})),
												]}
												className="w-full"
												buttonClassName="h-9 w-full justify-between px-3 text-xs font-mono bg-card"
												contentClassName="w-full scrollbar-thin"
											/>
										</div>
									</div>

									{/* Presets Bar */}
									<div className="space-y-1.5">
										<span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
											<Zap className="h-3 w-3 text-amber-500" />
											Quick Presets
										</span>
										<div className="grid grid-cols-3 gap-1.5">
											<button
												type="button"
												onClick={() => applyTopicPreset(".*", ".*")}
												className="rounded border border-border bg-card px-2 py-1.5 text-center text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
											>
												All Topics (.*)
											</button>
											<button
												type="button"
												onClick={() => applyTopicPreset("^$", ".*")}
												className="rounded border border-border bg-card px-2 py-1.5 text-center text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
											>
												Read Only
											</button>
											<button
												type="button"
												onClick={() => applyTopicPreset(".*", "^$")}
												className="rounded border border-border bg-card px-2 py-1.5 text-center text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
											>
												Write Only
											</button>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div className="space-y-1.5">
											<label className="text-xs font-medium text-foreground">
												Write Routing Key Regexp
											</label>
											<input
												type="text"
												value={topicPermWrite}
												onChange={(e) => setTopicPermWrite(e.target.value)}
												placeholder=".*"
												className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs font-mono focus:border-primary focus:outline-none"
											/>
										</div>

										<div className="space-y-1.5">
											<label className="text-xs font-medium text-foreground">
												Read Routing Key Regexp
											</label>
											<input
												type="text"
												value={topicPermRead}
												onChange={(e) => setTopicPermRead(e.target.value)}
												placeholder=".*"
												className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs font-mono focus:border-primary focus:outline-none"
											/>
										</div>
									</div>

									<div className="flex justify-end pt-2">
										<Button
											type="submit"
											size="sm"
											disabled={isSettingTopicPerm || !topicPermExchange.trim()}
										>
											{isSettingTopicPerm ? "Saving..." : "Set Topic Permission"}
										</Button>
									</div>
								</form>
							</div>
						</div>
					)}

					{/* TAB 3: ACCOUNT & ROLES */}
					{activeTab === "account" && (
						<form
							onSubmit={handleSaveAccount}
							className="max-w-2xl mx-auto space-y-4 pb-4"
						>
							{/* Roles and Tags Card */}
							<div className="rounded-xl border border-border bg-muted/15 p-5 space-y-4">
								<div>
									<h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
										<UserCog className="h-4 w-4 text-primary" />
										Roles & Authentication Tags
									</h3>
									<p className="text-xs text-muted-foreground mt-0.5">
										Tags determine the permissions and administrative capabilities of this user in RabbitMQ.
									</p>
								</div>

								{/* Standard Roles Selector */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
									{STANDARD_ROLES.map((role) => {
										const isChecked = userTags.includes(role.id);
										return (
											<button
												key={role.id}
												type="button"
												onClick={() => handleToggleRoleTag(role.id)}
												className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${
													isChecked
														? "border-primary/60 bg-primary/5 text-foreground shadow-xs ring-1 ring-primary/20"
														: "border-border bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground"
												}`}
											>
												<div
													className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
														isChecked
															? "bg-primary border-primary text-white"
															: "border-border bg-card"
													}`}
												>
													{isChecked && <Check className="h-3 w-3 stroke-[3]" />}
												</div>
												<div className="min-w-0">
													<div className="text-xs font-semibold text-foreground">
														{role.label}
													</div>
													<div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
														{role.description}
													</div>
												</div>
											</button>
										);
									})}
								</div>

								{/* Active Tags Chips & Custom Input */}
								<div className="space-y-1.5 pt-2 border-t border-border">
									<label className="text-xs font-medium text-foreground">
										Assigned Tags
									</label>
									<div className="flex flex-wrap items-center gap-1.5 min-h-[38px] p-2 rounded-lg border border-border bg-card">
										{userTags.length === 0 ? (
											<span className="text-xs text-muted-foreground italic">
												No tags assigned (ordinary user)
											</span>
										) : (
											userTags.map((tag) => (
												<span
													key={tag}
													className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border px-2 py-0.5 font-mono text-xs font-medium text-foreground"
												>
													{tag}
													<button
														type="button"
														onClick={() => handleRemoveTag(tag)}
														className="text-muted-foreground hover:text-destructive"
													>
														<X className="h-3 w-3" />
													</button>
												</span>
											))
										)}
									</div>
									<div className="flex items-center gap-2 pt-1">
										<input
											type="text"
											value={customTagInput}
											onChange={(e) => setCustomTagInput(e.target.value)}
											onKeyDown={handleAddCustomTag}
											placeholder="Add custom tag (press Enter)..."
											className="h-8 flex-1 rounded-md border border-border bg-card px-3 text-xs font-mono focus:border-primary focus:outline-none"
										/>
										<Button
											type="button"
											variant="secondary"
											size="sm"
											onClick={() => {
												const trimmed = customTagInput.trim().toLowerCase();
												if (trimmed && !userTags.includes(trimmed)) {
													setUserTags((prev) => [...prev, trimmed]);
												}
												setCustomTagInput("");
											}}
											disabled={!customTagInput.trim()}
											className="h-8 text-xs"
										>
											Add
										</Button>
									</div>
								</div>
							</div>

							{/* Password Reset Card */}
							<div className="rounded-xl border border-border bg-muted/15 p-5 space-y-4">
								<div>
									<h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
										<Lock className="h-4 w-4 text-primary" />
										Update Password
									</h3>
									<p className="text-xs text-muted-foreground mt-0.5">
										Leave blank if you do not want to change the user's current password.
									</p>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-medium text-foreground">
										New Password
									</label>
									<div className="relative">
										<input
											type={showPassword ? "text" : "password"}
											value={userPassword}
											onChange={(e) => setUserPassword(e.target.value)}
											placeholder="Enter new password to change..."
											className="h-9 w-full rounded-md border border-border bg-card pl-3 pr-10 text-xs font-mono focus:border-primary focus:outline-none"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
								</div>
							</div>

							{/* Save Action */}
							<div className="flex justify-end pt-2">
								<Button type="submit" size="sm" disabled={isUpdatingUser}>
									{isUpdatingUser ? "Saving..." : "Save Account Settings"}
								</Button>
							</div>
						</form>
					)}
				</div>

				{/* Modal Footer */}
				<div className="flex justify-between items-center px-6 py-3.5 border-t border-border bg-muted/25">
					<div>
						{user.name !== "guest" && onDeleteUser && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => onDeleteUser(user.name)}
								className="text-destructive hover:bg-destructive/10 text-xs h-8"
							>
								<Trash2 className="h-3.5 w-3.5 mr-1" />
								Delete User
							</Button>
						)}
					</div>

					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={onClose}
						className="text-xs h-8"
					>
						Close
					</Button>
				</div>
			</div>
		</div>
	);
}
