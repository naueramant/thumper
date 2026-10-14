import { useConfirm } from "@/components/ConfirmDialog/index.tsx";
import { TableFilters } from "@/components/common/TableFilters/index.tsx";
import { Unauthorized } from "@/components/common/Unauthorized/index.tsx";
import { Badge } from "@/components/ui/badge/index.tsx";
import { Button } from "@/components/ui/button/index.tsx";
import {
	Card,
	CardContent,
	CardDescription,
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
	useRabbitFeatureFlags,
	useRabbitLimits,
	useRabbitMutations,
	useRabbitOverview,
	useRabbitPermissions,
	useRabbitPolicies,
	useRabbitTopicPermissions,
	useRabbitUsers,
	useRabbitVHosts,
} from "@/hooks/useRabbitMQ/index.ts";
import type { Policy } from "@/services/rabbitmq/types/policy.ts";
import type { User } from "@/services/rabbitmq/types/user.ts";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
	ChevronRight,
	Flag,
	HardDrive,
	Lock,
	Network,
	Plus,
	Search,
	Server,
	ShieldCheck,
	Sliders,
	Trash2,
	Users,
	X,
} from "lucide-react";
import * as React from "react";
import { ManageUserModal } from "./components/ManageUserModal.tsx";

const ADMIN_TAGS = ["administrator", "policymaker"];

type AdminTab =
	| "users"
	| "vhosts"
	| "policies"
	| "feature-flags"
	| "cluster"
	| "limits";

export const DEFAULT_ADMIN_TAB: AdminTab = "users";
const ADMIN_TAB_IDS: AdminTab[] = [
	"users",
	"vhosts",
	"policies",
	"feature-flags",
	"limits",
	"cluster",
];

export function AdminPage() {
	const { user } = useAuth();
	const params = useParams({ strict: false }) as { tab?: string };
	const navigate = useNavigate();
	const confirm = useConfirm();

	// Active tab, reflected in the URL as an optional trailing path segment
	const activeTab: AdminTab =
		params.tab && (ADMIN_TAB_IDS as string[]).includes(params.tab)
			? (params.tab as AdminTab)
			: DEFAULT_ADMIN_TAB;

	const setActiveTab = React.useCallback(
		(tab: AdminTab) => {
			navigate({ to: "/admin/$tab", params: { tab }, replace: true });
		},
		[navigate],
	);

	const isAuthorized =
		user?.tags?.some((tag) => ADMIN_TAGS.includes(tag)) ?? false;

	const { data: users = [], isLoading: isUsersLoading } = useRabbitUsers();
	const { data: vhosts = [], isLoading: isVhostsLoading } = useRabbitVHosts();
	const { data: permissions = [] } = useRabbitPermissions();
	const { data: topicPermissions = [] } = useRabbitTopicPermissions();
	const { data: policies = [], isLoading: isPoliciesLoading } =
		useRabbitPolicies();
	const { data: featureFlags = [] } = useRabbitFeatureFlags();
	const { data: overview } = useRabbitOverview();
	const { data: limitsData } = useRabbitLimits();

	const {
		createUser,
		deleteUser,
		createVHost,
		deleteVHost,
		createPolicy,
		deletePolicy,
		setClusterName,
	} = useRabbitMutations();

	// User form state
	const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
	const [newUsername, setNewUsername] = React.useState("");
	const [newUserPassword, setNewUserPassword] = React.useState("");
	const [newUserTags, setNewUserTags] = React.useState("administrator");
	const [isCreatingUser, setIsCreatingUser] = React.useState(false);

	// VHost form state
	const [isAddVHostOpen, setIsAddVHostOpen] = React.useState(false);
	const [newVHostName, setNewVHostName] = React.useState("");
	const [newVHostDesc, setNewVHostDesc] = React.useState("");
	const [newVHostQueueType, setNewVHostQueueType] = React.useState<
		"classic" | "quorum" | "stream"
	>("classic");
	const [isCreatingVHost, setIsCreatingVHost] = React.useState(false);

	// Policy form state
	const [isAddPolicyOpen, setIsAddPolicyOpen] = React.useState(false);
	const [newPolicyVHost, setNewPolicyVHost] = React.useState("/");
	const [newPolicyName, setNewPolicyName] = React.useState("");
	const [newPolicyPattern, setNewPolicyPattern] = React.useState("^.*");
	const [newPolicyApplyTo, setNewPolicyApplyTo] = React.useState<
		"all" | "queues" | "exchanges"
	>("all");
	const [newPolicyPriority, setNewPolicyPriority] = React.useState(0);
	const [newPolicyDef, setNewPolicyDef] = React.useState(
		'{\n  "ha-mode": "all"\n}',
	);
	const [isCreatingPolicy, setIsCreatingPolicy] = React.useState(false);

	// Cluster rename state
	const [clusterNameInput, setClusterNameInput] = React.useState("");
	const [isRenamingCluster, setIsRenamingCluster] = React.useState(false);

	// Users search/filter state
	const [userSearch, setUserSearch] = React.useState("");
	const [userTagFilter, setUserTagFilter] = React.useState("all");

	// VHosts search/filter state
	const [vhostSearch, setVHostSearch] = React.useState("");
	const [vhostQueueTypeFilter, setVHostQueueTypeFilter] = React.useState("all");
	const [vhostTracingFilter, setVHostTracingFilter] = React.useState("all");

	// Policies search/filter state
	const [policySearch, setPolicySearch] = React.useState("");
	const [policyVHostFilter, setPolicyVHostFilter] = React.useState("all");
	const [policyApplyToFilter, setPolicyApplyToFilter] = React.useState("all");

	// Feature flags search/filter state
	const [flagSearch, setFlagSearch] = React.useState("");
	const [flagStatusFilter, setFlagStatusFilter] = React.useState("all");

	// User permissions modal state
	const [permUser, setPermUser] = React.useState<User | null>(null);


	React.useEffect(() => {
		if (overview?.cluster_name) {
			setClusterNameInput(overview.cluster_name);
		}
	}, [overview?.cluster_name]);

	// Handlers
	const handleCreateUser = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newUsername.trim()) return;
		setIsCreatingUser(true);
		try {
			const tags = newUserTags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			await createUser.mutateAsync({
				name: newUsername.trim(),
				data: {
					password: newUserPassword,
					tags,
				},
			});
			setIsAddUserOpen(false);
			setNewUsername("");
			setNewUserPassword("");
		} catch (err: any) {
			toast.error("Failed to create user", err.message || String(err));
		} finally {
			setIsCreatingUser(false);
		}
	};

	const handleDeleteUser = async (username: string) => {
		if (
			!(await confirm({
				title: "Delete User?",
				description: `Are you sure you want to delete user "${username}"?`,
				confirmLabel: "Delete User",
			}))
		)
			return;
		try {
			await deleteUser.mutateAsync(username);
			setPermUser((prev) => (prev?.name === username ? null : prev));
		} catch (err: any) {
			toast.error("Failed to delete user", err.message || String(err));
		}
	};

	const handleCreateVHost = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newVHostName.trim()) return;
		setIsCreatingVHost(true);
		try {
			await createVHost.mutateAsync({
				name: newVHostName.trim(),
				data: {
					description: newVHostDesc.trim(),
					default_queue_type: newVHostQueueType,
				},
			});
			setIsAddVHostOpen(false);
			setNewVHostName("");
			setNewVHostDesc("");
		} catch (err: any) {
			toast.error("Failed to create virtual host", err.message || String(err));
		} finally {
			setIsCreatingVHost(false);
		}
	};

	const handleDeleteVHost = async (name: string) => {
		if (name === "/") {
			toast.error("Cannot delete the default root virtual host (/).");
			return;
		}
		if (
			!(await confirm({
				title: "Delete Virtual Host?",
				description: `Are you sure you want to permanently delete virtual host "${name}"? All its queues, exchanges, and bindings will be removed!`,
				confirmLabel: "Delete Virtual Host",
			}))
		)
			return;
		try {
			await deleteVHost.mutateAsync(name);
		} catch (err: any) {
			toast.error("Failed to delete virtual host", err.message || String(err));
		}
	};

	const handleCreatePolicy = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newPolicyName.trim()) return;
		setIsCreatingPolicy(true);
		try {
			let definitionObj: Record<string, unknown> = {};
			try {
				definitionObj = JSON.parse(newPolicyDef);
			} catch {
				toast.error("Invalid JSON in policy definition.");
				setIsCreatingPolicy(false);
				return;
			}

			await createPolicy.mutateAsync({
				vhost: newPolicyVHost,
				name: newPolicyName.trim(),
				data: {
					pattern: newPolicyPattern.trim(),
					"apply-to": newPolicyApplyTo,
					priority: Number(newPolicyPriority),
					definition: definitionObj,
				},
			});
			setIsAddPolicyOpen(false);
			setNewPolicyName("");
		} catch (err: any) {
			toast.error("Failed to save policy", err.message || String(err));
		} finally {
			setIsCreatingPolicy(false);
		}
	};

	const handleDeletePolicy = async (policy: Policy) => {
		if (
			!(await confirm({
				title: "Delete Policy?",
				description: `Are you sure you want to delete policy "${policy.name}"?`,
				confirmLabel: "Delete Policy",
			}))
		)
			return;
		try {
			await deletePolicy.mutateAsync({
				vhost: policy.vhost,
				name: policy.name,
			});
		} catch (err: any) {
			toast.error("Failed to delete policy", err.message || String(err));
		}
	};

	const handleRenameCluster = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!clusterNameInput.trim()) return;
		setIsRenamingCluster(true);
		try {
			await setClusterName.mutateAsync(clusterNameInput.trim());
			toast.success("Cluster name updated!");
		} catch (err: any) {
			toast.error("Failed to rename cluster", err.message || String(err));
		} finally {
			setIsRenamingCluster(false);
		}
	};

	// Users filter options + filtered rows
	const userTagOptions = React.useMemo(() => {
		const tags = new Set<string>();
		for (const u of users) {
			const t = Array.isArray(u.tags)
				? u.tags
				: typeof u.tags === "string"
					? (u.tags as string).split(",").filter(Boolean)
					: [];
			t.forEach((tag) => {
				tags.add(tag);
			});
		}
		return [
			{ label: "All Tags", value: "all" },
			...Array.from(tags)
				.sort()
				.map((t) => ({ label: t, value: t })),
		];
	}, [users]);

	const clearUserFilters = () => {
		setUserTagFilter("all");
	};

	const filteredUsers = React.useMemo(() => {
		const q = userSearch.toLowerCase();
		return users.filter((u) => {
			const tags = Array.isArray(u.tags)
				? u.tags
				: typeof u.tags === "string"
					? (u.tags as string).split(",").filter(Boolean)
					: [];
			const matchesSearch =
				!q ||
				u.name.toLowerCase().includes(q) ||
				tags.some((t) => t.toLowerCase().includes(q));
			const matchesTag =
				userTagFilter === "all" || tags.includes(userTagFilter);
			return matchesSearch && matchesTag;
		});
	}, [users, userSearch, userTagFilter]);

	// VHosts filter options + filtered rows
	const vhostQueueTypeOptions = React.useMemo(() => {
		const types = Array.from(
			new Set(vhosts.map((v) => v.default_queue_type || "classic")),
		).sort();
		return [
			{ label: "All Types", value: "all" },
			...types.map((t) => ({ label: t, value: t })),
		];
	}, [vhosts]);

	const vhostTracingOptions = [
		{ label: "All", value: "all" },
		{ label: "Active", value: "on" },
		{ label: "Off", value: "off" },
	];

	const clearVHostFilters = () => {
		setVHostQueueTypeFilter("all");
		setVHostTracingFilter("all");
	};

	const filteredVHosts = React.useMemo(() => {
		const q = vhostSearch.toLowerCase();
		return vhosts.filter((v) => {
			const matchesSearch =
				!q ||
				v.name.toLowerCase().includes(q) ||
				(v.description ?? "").toLowerCase().includes(q);
			const matchesType =
				vhostQueueTypeFilter === "all" ||
				(v.default_queue_type || "classic") === vhostQueueTypeFilter;
			const matchesTracing =
				vhostTracingFilter === "all" ||
				(vhostTracingFilter === "on" ? !!v.tracing : !v.tracing);
			return matchesSearch && matchesType && matchesTracing;
		});
	}, [vhosts, vhostSearch, vhostQueueTypeFilter, vhostTracingFilter]);

	// Policies filter options + filtered rows
	const policyVHostOptions = React.useMemo(() => {
		const names = Array.from(new Set(policies.map((p) => p.vhost))).sort();
		return [
			{ label: "All VHosts", value: "all" },
			...names.map((n) => ({ label: n, value: n })),
		];
	}, [policies]);

	const policyApplyToOptions = React.useMemo(() => {
		const values = Array.from(
			new Set(policies.map((p) => p.apply_to || "all")),
		).sort();
		return [
			{ label: "All", value: "all" },
			...values.map((v) => ({ label: v, value: v })),
		];
	}, [policies]);

	const clearPolicyFilters = () => {
		setPolicyVHostFilter("all");
		setPolicyApplyToFilter("all");
	};

	const filteredPolicies = React.useMemo(() => {
		const q = policySearch.toLowerCase();
		return policies.filter((p) => {
			const matchesSearch =
				!q ||
				p.name.toLowerCase().includes(q) ||
				p.pattern.toLowerCase().includes(q) ||
				p.vhost.toLowerCase().includes(q);
			const matchesVHost =
				policyVHostFilter === "all" || p.vhost === policyVHostFilter;
			const matchesApplyTo =
				policyApplyToFilter === "all" ||
				(p.apply_to || "all") === policyApplyToFilter;
			return matchesSearch && matchesVHost && matchesApplyTo;
		});
	}, [policies, policySearch, policyVHostFilter, policyApplyToFilter]);

	// Feature flags filter options + filtered rows
	const flagStatusOptions = [
		{ label: "All", value: "all" },
		{ label: "Enabled", value: "enabled" },
		{ label: "Disabled", value: "disabled" },
	];

	const clearFlagFilters = () => {
		setFlagStatusFilter("all");
	};

	const filteredFeatureFlags = React.useMemo(() => {
		const q = flagSearch.toLowerCase();
		return featureFlags.filter((flag) => {
			const matchesSearch =
				!q ||
				flag.name.toLowerCase().includes(q) ||
				(flag.desc ?? "").toLowerCase().includes(q);
			const matchesStatus =
				flagStatusFilter === "all" || flag.state === flagStatusFilter;
			return matchesSearch && matchesStatus;
		});
	}, [featureFlags, flagSearch, flagStatusFilter]);

	const tabs: { id: AdminTab; label: string; icon: any; count?: number }[] = [
		{ id: "users", label: "Users & Roles", icon: Users, count: users.length },
		{
			id: "vhosts",
			label: "Virtual Hosts",
			icon: Network,
			count: vhosts.length,
		},
		{
			id: "policies",
			label: "Policies",
			icon: Sliders,
			count: policies.length,
		},
		{
			id: "feature-flags",
			label: "Feature Flags",
			icon: Flag,
			count: featureFlags.length,
		},
		{ id: "limits", label: "Limits & Quotas", icon: HardDrive },
		{ id: "cluster", label: "Cluster Config", icon: Server },
	];

	if (!isAuthorized) {
		return <Unauthorized requiredRoles={ADMIN_TAGS} />;
	}

	return (
		<div className="space-y-5">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					Administration Hub
				</h1>
				<p className="text-xs text-muted-foreground mt-0.5">
					Configure users, virtual hosts, replication policies, limits, and
					cluster feature flags
				</p>
			</div>

			{/* Tabs Navigation */}
			<div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
				{tabs.map((t) => {
					const Icon = t.icon;
					const isActive = activeTab === t.id;
					return (
						<button
							key={t.id}
							type="button"
							onClick={() => setActiveTab(t.id)}
							className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
								isActive
									? "bg-primary text-primary-foreground shadow-xs font-semibold"
									: "text-muted-foreground hover:bg-muted hover:text-foreground"
							}`}
						>
							<Icon className="h-3.5 w-3.5" />
							<span>{t.label}</span>
							{t.count !== undefined && (
								<span
									className={`inline-flex items-center text-[10px] px-1.5 py-0.5 leading-none rounded-full ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}
								>
									{t.count}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* TAB 1: USERS & PERMISSIONS */}
			{activeTab === "users" && (
				<div className="space-y-4">
					<div className="flex justify-between items-center">
						<div>
							<h2 className="text-sm font-semibold text-foreground">
								Broker Users
							</h2>
							<p className="text-xs text-muted-foreground">
								Internal accounts, authentication tags, and access boundaries
							</p>
						</div>
						<Button
							size="sm"
							onClick={() => setIsAddUserOpen(true)}
							className="text-xs"
						>
							<Plus className="h-4 w-4 mr-1" /> Add User
						</Button>
					</div>

					<Card>
						<CardHeader className="py-3 px-5 border-b border-border">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
								<span className="text-xs text-muted-foreground">
									{filteredUsers.length} of {users.length} users
								</span>
								<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
									<TableFilters
										filters={[
											{
												id: "tag",
												label: "Tag",
												value: userTagFilter,
												onChange: setUserTagFilter,
												options: userTagOptions,
											},
										]}
										onClearAll={clearUserFilters}
									/>
									<div className="relative w-full sm:w-64 shrink-0">
										<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
										<input
											type="text"
											placeholder="Filter users by name, tag..."
											value={userSearch}
											onChange={(e) => setUserSearch(e.target.value)}
											className="h-8 w-full rounded-md border border-border/70 bg-muted/20 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
										/>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>User Name</TableHead>
										<TableHead>Tags & Roles</TableHead>
										<TableHead>Password Status</TableHead>
										<TableHead className="text-right" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredUsers.length ? (
										filteredUsers.map((u) => {
											const tags = Array.isArray(u.tags)
												? u.tags
												: typeof u.tags === "string"
													? (u.tags as string).split(",").filter(Boolean)
													: [];
											return (
												<TableRow key={u.name}>
													<TableCell className="font-mono text-xs font-semibold text-foreground">
														{u.name}
													</TableCell>
													<TableCell>
														<div className="flex flex-wrap gap-1">
															{tags.length > 0 ? (
																tags.map((t) => (
																	<Badge
																		key={t}
																		variant={
																			t === "administrator"
																				? "default"
																				: "outline"
																		}
																		className="text-[10px] font-mono capitalize"
																	>
																		{t}
																	</Badge>
																))
															) : (
																<span className="text-xs text-muted-foreground">
																	None
																</span>
															)}
														</div>
													</TableCell>
													<TableCell>
														<span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
															<Lock className="h-3 w-3 text-emerald-500" />
															{u.password_hash ? "Configured" : "None"}
														</span>
													</TableCell>
													<TableCell className="text-right space-x-1">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => {
																setPermUser(u);
															}}
															className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10"
														>
															<ShieldCheck className="h-3 w-3 mr-1" />
															Permissions
														</Button>
														<span
															title={
																u.name === "guest"
																	? "Default guest user cannot be deleted"
																	: "Delete User"
															}
															className="inline-flex"
														>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => handleDeleteUser(u.name)}
																disabled={u.name === "guest"}
																className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
															>
																<Trash2 className="h-3 w-3" />
															</Button>
														</span>
													</TableCell>
												</TableRow>
											);
										})
									) : (
										<TableRow>
											<TableCell
												colSpan={4}
												className="h-24 text-center text-muted-foreground text-xs"
											>
												{isUsersLoading
													? "Loading users..."
													: users.length
														? "No users match the current search/filters."
														: "No users found."}
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			)}

			{/* TAB 2: VIRTUAL HOSTS */}
			{activeTab === "vhosts" && (
				<div className="space-y-4">
					<div className="flex justify-between items-center">
						<div>
							<h2 className="text-sm font-semibold text-foreground">
								Virtual Hosts
							</h2>
							<p className="text-xs text-muted-foreground">
								Multi-tenant isolation environments for queues, exchanges, and
								permissions
							</p>
						</div>
						<Button
							size="sm"
							onClick={() => setIsAddVHostOpen(true)}
							className="text-xs"
						>
							<Plus className="h-4 w-4 mr-1" /> Add Virtual Host
						</Button>
					</div>

					<Card>
						<CardHeader className="py-3 px-5 border-b border-border">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
								<span className="text-xs text-muted-foreground">
									{filteredVHosts.length} of {vhosts.length} virtual hosts
								</span>
								<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
									<TableFilters
										filters={[
											{
												id: "queueType",
												label: "Default Queue Type",
												value: vhostQueueTypeFilter,
												onChange: setVHostQueueTypeFilter,
												options: vhostQueueTypeOptions,
											},
											{
												id: "tracing",
												label: "Tracing",
												value: vhostTracingFilter,
												onChange: setVHostTracingFilter,
												options: vhostTracingOptions,
											},
										]}
										onClearAll={clearVHostFilters}
									/>
									<div className="relative w-full sm:w-64 shrink-0">
										<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
										<input
											type="text"
											placeholder="Filter virtual hosts by name, description..."
											value={vhostSearch}
											onChange={(e) => setVHostSearch(e.target.value)}
											className="h-8 w-full rounded-md border border-border/70 bg-muted/20 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
										/>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Virtual Host</TableHead>
										<TableHead>Description</TableHead>
										<TableHead>Default Queue Type</TableHead>
										<TableHead>Messages</TableHead>
										<TableHead>Tracing</TableHead>
										<TableHead className="text-right" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredVHosts.length ? (
										filteredVHosts.map((v) => (
											<TableRow key={v.name}>
												<TableCell className="font-mono text-xs font-bold">
													<Link
														to="/admin/vhosts/$name"
														params={{ name: encodeURIComponent(v.name) }}
														className="text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group cursor-pointer"
													>
														{v.name}
														<ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
													</Link>
												</TableCell>
												<TableCell className="text-xs text-muted-foreground">
													{v.description || "—"}
												</TableCell>
												<TableCell>
													<Badge
														variant="outline"
														className="font-mono text-[10px] uppercase"
													>
														{v.default_queue_type || "classic"}
													</Badge>
												</TableCell>
												<TableCell className="font-mono text-xs">
													{(v.messages ?? 0).toLocaleString()}
												</TableCell>
												<TableCell>
													<Badge
														variant={v.tracing ? "success" : "outline"}
														className="text-[10px]"
													>
														{v.tracing ? "Active" : "Off"}
													</Badge>
												</TableCell>
												<TableCell className="text-right space-x-1">
													<span
														title={
															v.name === "/"
																? "Default virtual host cannot be deleted"
																: "Delete Virtual Host"
														}
														className="inline-flex"
													>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleDeleteVHost(v.name)}
															disabled={v.name === "/"}
															className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
														>
															<Trash2 className="h-3 w-3" />
														</Button>
													</span>
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell
												colSpan={6}
												className="h-24 text-center text-muted-foreground text-xs"
											>
												{isVhostsLoading
													? "Loading virtual hosts..."
													: vhosts.length
														? "No virtual hosts match the current search/filters."
														: "No virtual hosts found."}
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			)}

			{/* TAB 3: POLICIES */}
			{activeTab === "policies" && (
				<div className="space-y-4">
					<div className="flex justify-between items-center">
						<div>
							<h2 className="text-sm font-semibold text-foreground">
								User Policies
							</h2>
							<p className="text-xs text-muted-foreground">
								Dynamic configuration rules applied to queues and exchanges via
								regex pattern matching
							</p>
						</div>
						<Button
							size="sm"
							onClick={() => setIsAddPolicyOpen(true)}
							className="text-xs"
						>
							<Plus className="h-4 w-4 mr-1" /> Add Policy
						</Button>
					</div>

					<Card>
						<CardHeader className="py-3 px-5 border-b border-border">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
								<span className="text-xs text-muted-foreground">
									{filteredPolicies.length} of {policies.length} policies
								</span>
								<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
									<TableFilters
										filters={[
											{
												id: "vhost",
												label: "VHost",
												value: policyVHostFilter,
												onChange: setPolicyVHostFilter,
												options: policyVHostOptions,
											},
											{
												id: "applyTo",
												label: "Apply To",
												value: policyApplyToFilter,
												onChange: setPolicyApplyToFilter,
												options: policyApplyToOptions,
											},
										]}
										onClearAll={clearPolicyFilters}
									/>
									<div className="relative w-full sm:w-64 shrink-0">
										<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
										<input
											type="text"
											placeholder="Filter policies by name, pattern, vhost..."
											value={policySearch}
											onChange={(e) => setPolicySearch(e.target.value)}
											className="h-8 w-full rounded-md border border-border/70 bg-muted/20 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
										/>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>VHost</TableHead>
										<TableHead>Name</TableHead>
										<TableHead>Pattern</TableHead>
										<TableHead>Apply To</TableHead>
										<TableHead>Priority</TableHead>
										<TableHead>Definition</TableHead>
										<TableHead className="text-right" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredPolicies.length ? (
										filteredPolicies.map((p) => (
											<TableRow key={`${p.vhost}:${p.name}`}>
												<TableCell className="font-mono text-xs">
													{p.vhost}
												</TableCell>
												<TableCell className="font-mono text-xs font-semibold text-foreground">
													{p.name}
												</TableCell>
												<TableCell className="font-mono text-xs text-primary">
													{p.pattern}
												</TableCell>
												<TableCell>
													<Badge
														variant="outline"
														className="text-[10px] uppercase font-mono"
													>
														{p.apply_to}
													</Badge>
												</TableCell>
												<TableCell className="font-mono text-xs">
													{p.priority}
												</TableCell>
												<TableCell className="font-mono text-[11px] max-w-sm">
													<div className="flex flex-wrap gap-1">
														{p.definition &&
														Object.keys(p.definition).length > 0 ? (
															Object.entries(p.definition).map(([k, v]) => (
																<span
																	key={k}
																	className="inline-flex items-center gap-1 bg-muted/60 border border-border/80 px-1.5 py-0.5 rounded text-[10px]"
																>
																	<span className="text-sky-400 font-semibold">
																		{k}:
																	</span>
																	<span className="text-emerald-400">
																		{String(v)}
																	</span>
																</span>
															))
														) : (
															<span className="text-muted-foreground italic">
																empty
															</span>
														)}
													</div>
												</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleDeletePolicy(p)}
														className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
														title="Delete Policy"
													>
														<Trash2 className="h-3 w-3" />
													</Button>
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell
												colSpan={7}
												className="h-24 text-center text-muted-foreground text-xs"
											>
												{isPoliciesLoading
													? "Loading policies..."
													: policies.length
														? "No policies match the current search/filters."
														: "No policies configured in this broker."}
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			)}

			{/* TAB 4: FEATURE FLAGS */}
			{activeTab === "feature-flags" && (
				<div className="space-y-4">
					<div>
						<h2 className="text-sm font-semibold text-foreground">
							Cluster Feature Flags
						</h2>
						<p className="text-xs text-muted-foreground">
							Manage cluster-wide compatibility flags for zero-downtime rolling
							upgrades
						</p>
					</div>

					<Card>
						<CardHeader className="py-3 px-5 border-b border-border">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
								<span className="text-xs text-muted-foreground">
									{filteredFeatureFlags.length} of {featureFlags.length} feature
									flags
								</span>
								<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
									<TableFilters
										filters={[
											{
												id: "status",
												label: "Status",
												value: flagStatusFilter,
												onChange: setFlagStatusFilter,
												options: flagStatusOptions,
											},
										]}
										onClearAll={clearFlagFilters}
									/>
									<div className="relative w-full sm:w-64 shrink-0">
										<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
										<input
											type="text"
											placeholder="Filter feature flags by name, description..."
											value={flagSearch}
											onChange={(e) => setFlagSearch(e.target.value)}
											className="h-8 w-full rounded-md border border-border/70 bg-muted/20 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
										/>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Feature Flag</TableHead>
										<TableHead>Description</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredFeatureFlags.length ? (
										filteredFeatureFlags.map((flag) => {
											const isEnabled = flag.state === "enabled";
											return (
												<TableRow key={flag.name}>
													<TableCell className="font-mono text-xs font-semibold text-foreground">
														{flag.name}
													</TableCell>
													<TableCell className="text-xs text-muted-foreground max-w-md">
														{flag.desc || "Cluster capability enhancement."}
													</TableCell>
													<TableCell>
														<Badge
															variant={isEnabled ? "success" : "warning"}
															className="text-[10px] capitalize"
														>
															{flag.state}
														</Badge>
													</TableCell>
												</TableRow>
											);
										})
									) : (
										<TableRow>
											<TableCell
												colSpan={3}
												className="h-24 text-center text-muted-foreground text-xs"
											>
												{featureFlags.length
													? "No feature flags match the current search/filters."
													: "No feature flags found."}
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			)}

			{/* TAB 5: LIMITS */}
			{activeTab === "limits" && (
				<div className="space-y-5">
					{/* VHost Limits */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold">
								Virtual Host Limits
							</CardTitle>
							<CardDescription className="text-xs">
								Max connections and queue quotas per virtual host
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>VHost</TableHead>
										<TableHead>Max Connections</TableHead>
										<TableHead>Max Queues</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{limitsData?.vhostLimits &&
									limitsData.vhostLimits.length > 0 ? (
										limitsData.vhostLimits.map((l) => (
											<TableRow key={l.vhost}>
												<TableCell className="font-mono text-xs font-semibold">
													{l.vhost}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{l.value["max-connections"] ?? "Unlimited"}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{l.value["max-queues"] ?? "Unlimited"}
												</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell
												colSpan={3}
												className="h-20 text-center text-muted-foreground text-xs"
											>
												No virtual host quotas set (unlimited).
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			)}

			{/* TAB 6: CLUSTER CONFIG */}
			{activeTab === "cluster" && (
				<div className="space-y-4 max-w-xl">
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold">
								Cluster Identification
							</CardTitle>
							<CardDescription className="text-xs">
								The cluster name is advertised to clients and used for
								cross-broker federation and shoveling.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleRenameCluster} className="space-y-3">
								<div className="space-y-1">
									<label className="text-xs font-medium text-muted-foreground">
										Cluster Name
									</label>
									<input
										type="text"
										required
										value={clusterNameInput}
										onChange={(e) => setClusterNameInput(e.target.value)}
										className="h-8 w-full rounded border border-border bg-background px-2.5 text-xs text-foreground font-mono"
									/>
								</div>
								<Button
									type="submit"
									size="sm"
									disabled={isRenamingCluster}
									className="text-xs"
								>
									{isRenamingCluster ? "Saving..." : "Rename Cluster"}
								</Button>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold">
								Runtime Environment
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-xs font-mono">
							<div className="flex justify-between p-2 rounded bg-muted/20">
								<span className="text-muted-foreground font-sans">
									RabbitMQ Version:
								</span>
								<span className="font-bold text-foreground">
									{overview?.rabbitmq_version || "4.3.6"}
								</span>
							</div>
							<div className="flex justify-between p-2 rounded bg-muted/20">
								<span className="text-muted-foreground font-sans">
									Erlang Release:
								</span>
								<span className="font-bold text-foreground">
									{overview?.erlang_version || "27"}
								</span>
							</div>
							<div className="flex justify-between p-2 rounded bg-muted/20">
								<span className="text-muted-foreground font-sans">
									Full Erlang VM:
								</span>
								<span className="font-bold text-foreground text-[11px] truncate max-w-xs">
									{overview?.erlang_full_version}
								</span>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Add User Modal */}
			{isAddUserOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
						<div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
							<div className="flex items-center gap-2">
								<Users className="h-4 w-4 text-primary" />
								<h3 className="text-sm font-bold text-foreground">
									Add New User
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsAddUserOpen(false)}
								className="p-1 rounded text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<form onSubmit={handleCreateUser} className="p-6 space-y-4 text-sm">
							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Username
								</label>
								<input
									type="text"
									required
									value={newUsername}
									onChange={(e) => setNewUsername(e.target.value)}
									placeholder="e.g. app_worker"
									className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Password
								</label>
								<input
									type="password"
									value={newUserPassword}
									onChange={(e) => setNewUserPassword(e.target.value)}
									placeholder="Password"
									className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Tags (comma separated)
								</label>
								<input
									type="text"
									value={newUserTags}
									onChange={(e) => setNewUserTags(e.target.value)}
									placeholder="administrator, policymaker, monitoring, management"
									className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-border">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => setIsAddUserOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									size="sm"
									disabled={isCreatingUser || !newUsername.trim()}
								>
									{isCreatingUser ? "Creating..." : "Add User"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Add VHost Modal */}
			{isAddVHostOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
						<div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
							<div className="flex items-center gap-2">
								<Network className="h-4 w-4 text-primary" />
								<h3 className="text-sm font-bold text-foreground">
									Add Virtual Host
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsAddVHostOpen(false)}
								className="p-1 rounded text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<form
							onSubmit={handleCreateVHost}
							className="p-6 space-y-4 text-sm"
						>
							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Virtual Host Name
								</label>
								<input
									type="text"
									required
									value={newVHostName}
									onChange={(e) => setNewVHostName(e.target.value)}
									placeholder="e.g. staging or tenant_acme"
									className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Description (optional)
								</label>
								<input
									type="text"
									value={newVHostDesc}
									onChange={(e) => setNewVHostDesc(e.target.value)}
									placeholder="e.g. Staging sandbox"
									className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Default Queue Type
								</label>
								<Dropdown
									value={newVHostQueueType}
									onChange={(v) =>
										setNewVHostQueueType(v as typeof newVHostQueueType)
									}
									options={[
										{ label: "Classic", value: "classic" },
										{ label: "Quorum", value: "quorum" },
										{ label: "Stream", value: "stream" },
									]}
									className="w-full"
									buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
									contentClassName="w-full"
								/>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-border">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => setIsAddVHostOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									size="sm"
									disabled={isCreatingVHost || !newVHostName.trim()}
								>
									{isCreatingVHost ? "Creating..." : "Add VHost"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Add Policy Modal */}
			{isAddPolicyOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
						<div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
							<div className="flex items-center gap-2">
								<Sliders className="h-4 w-4 text-primary" />
								<h3 className="text-sm font-bold text-foreground">
									Add / Update Policy
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setIsAddPolicyOpen(false)}
								className="p-1 rounded text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<form
							onSubmit={handleCreatePolicy}
							className="p-6 space-y-4 text-sm"
						>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<label className="font-medium text-muted-foreground">
										VHost
									</label>
									<Dropdown
										value={newPolicyVHost}
										onChange={(v) => setNewPolicyVHost(v as string)}
										options={vhosts.map((v) => ({
											label: v.name,
											value: v.name,
										}))}
										className="w-full"
										buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
										contentClassName="w-full"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="font-medium text-muted-foreground">
										Policy Name
									</label>
									<input
										type="text"
										required
										value={newPolicyName}
										onChange={(e) => setNewPolicyName(e.target.value)}
										placeholder="e.g. ha-all"
										className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
									/>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div className="col-span-2 space-y-1.5">
									<label className="font-medium text-muted-foreground">
										Pattern (Regex)
									</label>
									<input
										type="text"
										required
										value={newPolicyPattern}
										onChange={(e) => setNewPolicyPattern(e.target.value)}
										placeholder="^orders\."
										className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
									/>
								</div>
								<div className="space-y-1.5">
									<label className="font-medium text-muted-foreground">
										Priority
									</label>
									<input
										type="number"
										value={newPolicyPriority}
										onChange={(e) =>
											setNewPolicyPriority(Number(e.target.value))
										}
										className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Apply To
								</label>
								<Dropdown
									value={newPolicyApplyTo}
									onChange={(v) =>
										setNewPolicyApplyTo(v as typeof newPolicyApplyTo)
									}
									options={[
										{ label: "All (Queues & Exchanges)", value: "all" },
										{ label: "Queues Only", value: "queues" },
										{ label: "Exchanges Only", value: "exchanges" },
									]}
									className="w-full"
									buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
									contentClassName="w-full"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="font-medium text-muted-foreground">
									Definition (JSON)
								</label>
								<textarea
									rows={3}
									value={newPolicyDef}
									onChange={(e) => setNewPolicyDef(e.target.value)}
									className="w-full rounded-md border border-border bg-muted/20 p-3 text-sm font-mono"
								/>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-border">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => setIsAddPolicyOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									size="sm"
									disabled={isCreatingPolicy || !newPolicyName.trim()}
								>
									{isCreatingPolicy ? "Saving..." : "Save Policy"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* User Management Modal */}
			{permUser && (
				<ManageUserModal
					user={permUser}
					onClose={() => setPermUser(null)}
					vhosts={vhosts}
					permissions={permissions}
					topicPermissions={topicPermissions}
					onDeleteUser={handleDeleteUser}
				/>
			)}
		</div>
	);
}
