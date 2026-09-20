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
	useRabbitExchanges,
	useRabbitFeatureFlags,
	useRabbitLimits,
	useRabbitMutations,
	useRabbitOverview,
	useRabbitPermissions,
	useRabbitPolicies,
	useRabbitShovels,
	useRabbitTopicPermissions,
	useRabbitUsers,
	useRabbitVHosts,
} from "@/hooks/useRabbitMQ/index.ts";
import type { Policy } from "@/services/rabbitmq/types/policy.ts";
import type { User } from "@/services/rabbitmq/types/user.ts";
import type { VirtualHost } from "@/services/rabbitmq/types/vhost.ts";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
	ExternalLink,
	Eye,
	Flag,
	HardDrive,
	Hash,
	Lock,
	Network,
	Plus,
	Search,
	Server,
	ShieldCheck,
	Sliders,
	Trash2,
	UserCog,
	Users,
	X,
} from "lucide-react";
import * as React from "react";

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
	const { data: shovels = [] } = useRabbitShovels();

	const {
		createUser,
		deleteUser,
		updateUser,
		setUserPermissions,
		clearUserPermissions,
		setUserTopicPermission,
		clearUserTopicPermission,
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
	const [userModalTab, setUserModalTab] = React.useState<
		"permissions" | "topics" | "account"
	>("permissions");
	const [permVHost, setPermVHost] = React.useState("/");
	const [permConf, setPermConf] = React.useState(".*");
	const [permWrite, setPermWrite] = React.useState(".*");
	const [permRead, setPermRead] = React.useState(".*");
	const [isSettingPerm, setIsSettingPerm] = React.useState(false);

	// User topic-permissions form state (inside the user management modal)
	const [topicPermVHost, setTopicPermVHost] = React.useState("/");
	const [topicPermExchange, setTopicPermExchange] = React.useState("");
	const [topicPermWrite, setTopicPermWrite] = React.useState(".*");
	const [topicPermRead, setTopicPermRead] = React.useState(".*");
	const [isSettingTopicPerm, setIsSettingTopicPerm] = React.useState(false);

	// Update-user (tags/password) form state (inside the user management modal)
	const [updateUserTags, setUpdateUserTags] = React.useState("");
	const [updateUserPassword, setUpdateUserPassword] = React.useState("");
	const [isUpdatingUser, setIsUpdatingUser] = React.useState(false);

	// Virtual host detail modal state
	const [vhostDetail, setVHostDetail] = React.useState<VirtualHost | null>(
		null,
	);
	const [vhostPermUser, setVHostPermUser] = React.useState("");
	const [vhostPermConf, setVHostPermConf] = React.useState(".*");
	const [vhostPermWrite, setVHostPermWrite] = React.useState(".*");
	const [vhostPermRead, setVHostPermRead] = React.useState(".*");
	const [isSettingVHostPerm, setIsSettingVHostPerm] = React.useState(false);
	const [vhostTopicPermUser, setVHostTopicPermUser] = React.useState("");
	const [vhostTopicPermExchange, setVHostTopicPermExchange] =
		React.useState("");
	const [vhostTopicPermWrite, setVHostTopicPermWrite] = React.useState(".*");
	const [vhostTopicPermRead, setVHostTopicPermRead] = React.useState(".*");
	const [isSettingVHostTopicPerm, setIsSettingVHostTopicPerm] =
		React.useState(false);

	const permUserGrants = React.useMemo(
		() => permissions.filter((p) => p.user === permUser?.name),
		[permissions, permUser],
	);

	const permUserTopicGrants = React.useMemo(
		() => topicPermissions.filter((p) => p.user === permUser?.name),
		[topicPermissions, permUser],
	);

	const { data: topicPermVHostExchanges = [] } =
		useRabbitExchanges(topicPermVHost);

	const vhostDetailPermissions = React.useMemo(
		() => permissions.filter((p) => p.vhost === vhostDetail?.name),
		[permissions, vhostDetail],
	);

	const vhostDetailTopicPermissions = React.useMemo(
		() => topicPermissions.filter((p) => p.vhost === vhostDetail?.name),
		[topicPermissions, vhostDetail],
	);

	const { data: vhostDetailExchanges = [] } = useRabbitExchanges(
		vhostDetail?.name,
	);

	// Prefill the form with the existing grant for the selected vhost, if any
	React.useEffect(() => {
		const existing = permUserGrants.find((p) => p.vhost === permVHost);
		setPermConf(existing?.configure ?? ".*");
		setPermWrite(existing?.write ?? ".*");
		setPermRead(existing?.read ?? ".*");
	}, [permVHost, permUserGrants]);

	// Reset the user management modal's secondary forms whenever the target user changes
	React.useEffect(() => {
		if (permUser) {
			setUserModalTab("permissions");
			setUpdateUserTags(
				Array.isArray(permUser.tags)
					? permUser.tags.join(", ")
					: String(permUser.tags ?? ""),
			);
			setUpdateUserPassword("");
			setTopicPermVHost(permVHost);
			setTopicPermExchange("");
			setTopicPermWrite(".*");
			setTopicPermRead(".*");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [permUser]);

	// Reset the vhost management modal's forms whenever the target vhost changes
	React.useEffect(() => {
		if (vhostDetail) {
			setVHostPermUser(users[0]?.name ?? "");
			setVHostPermConf(".*");
			setVHostPermWrite(".*");
			setVHostPermRead(".*");
			setVHostTopicPermUser(users[0]?.name ?? "");
			setVHostTopicPermExchange("");
			setVHostTopicPermWrite(".*");
			setVHostTopicPermRead(".*");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [vhostDetail]);

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

	const handleSetPermissions = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!permUser) return;
		setIsSettingPerm(true);
		try {
			await setUserPermissions.mutateAsync({
				vhost: permVHost,
				user: permUser.name,
				permissions: {
					configure: permConf,
					write: permWrite,
					read: permRead,
				},
			});
			toast.success(`Updated permissions for ${permUser.name} on ${permVHost}`);
		} catch (err: any) {
			toast.error("Failed to set permissions", err.message || String(err));
		} finally {
			setIsSettingPerm(false);
		}
	};

	const handleClearPermission = async (vhost: string) => {
		if (!permUser) return;
		if (
			!(await confirm({
				title: "Revoke Access?",
				description: `Remove ${permUser.name}'s permissions on virtual host "${vhost}"?`,
				confirmLabel: "Revoke Access",
			}))
		)
			return;
		try {
			await clearUserPermissions.mutateAsync({ vhost, user: permUser.name });
			toast.success(`Revoked ${permUser.name}'s access to ${vhost}`);
		} catch (err: any) {
			toast.error("Failed to revoke permissions", err.message || String(err));
		}
	};

	const handleSetTopicPermission = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!permUser || !topicPermExchange.trim()) return;
		setIsSettingTopicPerm(true);
		try {
			await setUserTopicPermission.mutateAsync({
				vhost: topicPermVHost,
				user: permUser.name,
				exchange: topicPermExchange.trim(),
				write: topicPermWrite,
				read: topicPermRead,
			});
			toast.success(
				`Set topic permission for ${permUser.name} on ${topicPermExchange}`,
			);
		} catch (err: any) {
			toast.error("Failed to set topic permission", err.message || String(err));
		} finally {
			setIsSettingTopicPerm(false);
		}
	};

	const handleClearTopicPermission = async (vhost: string) => {
		if (!permUser) return;
		if (
			!(await confirm({
				title: "Revoke Topic Access?",
				description: `Remove ${permUser.name}'s topic permissions on virtual host "${vhost}"?`,
				confirmLabel: "Revoke Access",
			}))
		)
			return;
		try {
			await clearUserTopicPermission.mutateAsync({
				vhost,
				user: permUser.name,
			});
			toast.success(`Revoked ${permUser.name}'s topic access to ${vhost}`);
		} catch (err: any) {
			toast.error(
				"Failed to revoke topic permissions",
				err.message || String(err),
			);
		}
	};

	const handleUpdateUser = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!permUser) return;
		setIsUpdatingUser(true);
		try {
			const tags = updateUserTags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			await updateUser.mutateAsync({
				name: permUser.name,
				data: updateUserPassword.trim()
					? { password: updateUserPassword.trim(), tags }
					: { password_hash: permUser.password_hash, tags },
			});
			setPermUser((prev) => (prev ? { ...prev, tags } : prev));
			setUpdateUserPassword("");
			toast.success(`Updated user "${permUser.name}"`);
		} catch (err: any) {
			toast.error("Failed to update user", err.message || String(err));
		} finally {
			setIsUpdatingUser(false);
		}
	};

	const handleSetVHostPermission = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!vhostDetail || !vhostPermUser) return;
		setIsSettingVHostPerm(true);
		try {
			await setUserPermissions.mutateAsync({
				vhost: vhostDetail.name,
				user: vhostPermUser,
				permissions: {
					configure: vhostPermConf,
					write: vhostPermWrite,
					read: vhostPermRead,
				},
			});
			toast.success(
				`Updated permissions for ${vhostPermUser} on ${vhostDetail.name}`,
			);
		} catch (err: any) {
			toast.error("Failed to set permissions", err.message || String(err));
		} finally {
			setIsSettingVHostPerm(false);
		}
	};

	const handleClearVHostPermission = async (user: string) => {
		if (!vhostDetail) return;
		if (
			!(await confirm({
				title: "Revoke Access?",
				description: `Remove ${user}'s permissions on virtual host "${vhostDetail.name}"?`,
				confirmLabel: "Revoke Access",
			}))
		)
			return;
		try {
			await clearUserPermissions.mutateAsync({
				vhost: vhostDetail.name,
				user,
			});
			toast.success(`Revoked ${user}'s access to ${vhostDetail.name}`);
		} catch (err: any) {
			toast.error("Failed to revoke permissions", err.message || String(err));
		}
	};

	const handleSetVHostTopicPermission = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!vhostDetail || !vhostTopicPermUser || !vhostTopicPermExchange.trim())
			return;
		setIsSettingVHostTopicPerm(true);
		try {
			await setUserTopicPermission.mutateAsync({
				vhost: vhostDetail.name,
				user: vhostTopicPermUser,
				exchange: vhostTopicPermExchange.trim(),
				write: vhostTopicPermWrite,
				read: vhostTopicPermRead,
			});
			toast.success(
				`Set topic permission for ${vhostTopicPermUser} on ${vhostDetail.name}`,
			);
		} catch (err: any) {
			toast.error("Failed to set topic permission", err.message || String(err));
		} finally {
			setIsSettingVHostTopicPerm(false);
		}
	};

	const handleClearVHostTopicPermission = async (user: string) => {
		if (!vhostDetail) return;
		if (
			!(await confirm({
				title: "Revoke Topic Access?",
				description: `Remove ${user}'s topic permissions on virtual host "${vhostDetail.name}"?`,
				confirmLabel: "Revoke Access",
			}))
		)
			return;
		try {
			await clearUserTopicPermission.mutateAsync({
				vhost: vhostDetail.name,
				user,
			});
			toast.success(`Revoked ${user}'s topic access to ${vhostDetail.name}`);
		} catch (err: any) {
			toast.error(
				"Failed to revoke topic permissions",
				err.message || String(err),
			);
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
			setVHostDetail((prev) => (prev?.name === name ? null : prev));
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
									className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}
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
										<TableHead className="text-right">Actions</TableHead>
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
																setPermVHost("/");
															}}
															className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10"
														>
															<ShieldCheck className="h-3 w-3 mr-1" />
															Permissions
														</Button>
														{u.name !== "guest" && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() => handleDeleteUser(u.name)}
																className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
																title="Delete User"
															>
																<Trash2 className="h-3 w-3" />
															</Button>
														)}
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
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredVHosts.length ? (
										filteredVHosts.map((v) => (
											<TableRow key={v.name}>
												<TableCell className="font-mono text-xs font-bold text-foreground">
													{v.name}
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
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setVHostDetail(v)}
														className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10"
													>
														<Eye className="h-3 w-3 mr-1" />
														Manage
													</Button>
													{v.name !== "/" && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleDeleteVHost(v.name)}
															className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
															title="Delete Virtual Host"
														>
															<Trash2 className="h-3 w-3" />
														</Button>
													)}
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
										<TableHead className="text-right">Actions</TableHead>
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

			{/* TAB 5: LIMITS & SHOVELS */}
			{activeTab === "limits" && (
				<div className="space-y-5">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

						{/* Dynamic Shovels */}
						<Card>
							<CardHeader className="pb-3 flex flex-row items-center justify-between">
								<div>
									<CardTitle className="text-sm font-semibold">
										Dynamic Shovels
									</CardTitle>
									<CardDescription className="text-xs">
										Unidirectional cross-cluster message bridges
									</CardDescription>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="h-7 text-xs gap-1 font-mono"
									onClick={() => navigate({ to: "/shovels" })}
								>
									Manage Shovels
									<ExternalLink className="h-3 w-3" />
								</Button>
							</CardHeader>
							<CardContent className="p-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>VHost</TableHead>
											<TableHead>Source &bull; Destination</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{shovels.length > 0 ? (
											shovels.map((s) => (
												<TableRow key={`${s.vhost}:${s.name}`}>
													<TableCell className="font-mono text-xs font-semibold">
														{s.name}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{s.vhost}
													</TableCell>
													<TableCell className="font-mono text-[11px] truncate max-w-xs">
														{s.value["src-queue"] || s.value["src-exchange"]}{" "}
														&rarr;{" "}
														{s.value["dest-queue"] || s.value["dest-exchange"]}
													</TableCell>
												</TableRow>
											))
										) : (
											<TableRow>
												<TableCell
													colSpan={3}
													className="h-20 text-center text-muted-foreground text-xs"
												>
													No dynamic shovels configured.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>
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
									variant="outline"
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
									variant="outline"
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
									variant="outline"
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
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="flex w-full max-w-2xl max-h-[85vh] flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
						<div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
							<div className="flex items-center gap-2">
								<ShieldCheck className="h-4 w-4 text-primary" />
								<h3 className="text-sm font-bold text-foreground">
									Manage User: {permUser.name}
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setPermUser(null)}
								className="p-1 rounded text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<div className="flex items-center gap-1 px-6 pt-3 border-b border-border">
							{(
								[
									{
										id: "permissions",
										label: "VHost Permissions",
										icon: ShieldCheck,
									},
									{ id: "topics", label: "Topic Permissions", icon: Hash },
									{ id: "account", label: "Account", icon: UserCog },
								] as const
							).map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setUserModalTab(tab.id)}
									className={`flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
										userModalTab === tab.id
											? "border-primary text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground"
									}`}
								>
									<tab.icon className="h-3.5 w-3.5" />
									{tab.label}
								</button>
							))}
						</div>
						<div className="flex-1 min-h-0 overflow-y-auto p-6 text-sm">
							{/* Virtual Host Permissions */}
							{userModalTab === "permissions" && (
								<form
									id="permissions-form"
									onSubmit={handleSetPermissions}
									className="grid grid-cols-1 md:grid-cols-2 gap-6"
								>
									<div className="space-y-1.5 md:border-r md:border-border md:pr-6">
										<label className="font-medium text-muted-foreground">
											Existing Grants
										</label>
										{permUserGrants.length ? (
											<div className="max-h-72 overflow-y-auto space-y-1 rounded-md border border-border p-1.5">
												{permUserGrants.map((p) => (
													<div
														key={p.vhost}
														className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 ${
															p.vhost === permVHost
																? "bg-primary/10 text-primary"
																: "hover:bg-muted/40"
														}`}
														title={`configure: ${p.configure} · write: ${p.write} · read: ${p.read}`}
													>
														<button
															type="button"
															onClick={() => setPermVHost(p.vhost)}
															className="truncate text-left font-mono text-xs hover:underline"
														>
															{p.vhost}
														</button>
														<button
															type="button"
															onClick={() => handleClearPermission(p.vhost)}
															className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
															title={`Revoke access to ${p.vhost}`}
														>
															<Trash2 className="h-3 w-3" />
														</button>
													</div>
												))}
											</div>
										) : (
											<p className="text-xs text-muted-foreground italic">
												No virtual host access granted yet.
											</p>
										)}
									</div>

									<div className="space-y-4">
										<div className="space-y-1.5">
											<label className="font-medium text-muted-foreground">
												Virtual Host
											</label>
											<Dropdown
												value={permVHost}
												onChange={(v) => setPermVHost(v as string)}
												options={vhosts.map((v) => ({
													label: v.name,
													value: v.name,
												}))}
												className="w-full"
												buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
												contentClassName="w-full"
											/>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
											<div className="space-y-1.5">
												<label className="font-medium text-muted-foreground">
													Configure
												</label>
												<input
													type="text"
													value={permConf}
													onChange={(e) => setPermConf(e.target.value)}
													placeholder=".*"
													className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
												/>
											</div>

											<div className="space-y-1.5">
												<label className="font-medium text-muted-foreground">
													Write
												</label>
												<input
													type="text"
													value={permWrite}
													onChange={(e) => setPermWrite(e.target.value)}
													placeholder=".*"
													className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
												/>
											</div>

											<div className="space-y-1.5">
												<label className="font-medium text-muted-foreground">
													Read
												</label>
												<input
													type="text"
													value={permRead}
													onChange={(e) => setPermRead(e.target.value)}
													placeholder=".*"
													className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
												/>
											</div>
										</div>
										<div className="flex justify-end">
											<Button type="submit" size="sm" disabled={isSettingPerm}>
												{isSettingPerm
													? "Saving..."
													: permUserGrants.some((p) => p.vhost === permVHost)
														? "Update Permissions"
														: "Grant Permissions"}
											</Button>
										</div>
									</div>
								</form>
							)}

							{/* Topic Permissions */}
							{userModalTab === "topics" && (
								<form
									id="topic-permissions-form"
									onSubmit={handleSetTopicPermission}
									className="grid grid-cols-1 md:grid-cols-2 gap-6"
								>
									<div className="space-y-1.5 md:border-r md:border-border md:pr-6">
										<label className="font-medium text-muted-foreground">
											Existing Topic Grants
										</label>
										{permUserTopicGrants.length ? (
											<div className="max-h-72 overflow-y-auto space-y-1 rounded-md border border-border p-1.5">
												{permUserTopicGrants.map((p) => (
													<div
														key={`${p.vhost}:${p.exchange}`}
														className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/40"
														title={`write: ${p.write} · read: ${p.read}`}
													>
														<span className="truncate font-mono text-xs">
															{p.vhost} / {p.exchange || "(AMQP default)"}
														</span>
														<button
															type="button"
															onClick={() =>
																handleClearTopicPermission(p.vhost)
															}
															className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
															title={`Revoke topic access to ${p.vhost}`}
														>
															<Trash2 className="h-3 w-3" />
														</button>
													</div>
												))}
											</div>
										) : (
											<p className="text-xs text-muted-foreground italic">
												No topic permissions granted yet.
											</p>
										)}
									</div>

									<div className="space-y-4">
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div className="space-y-1.5">
												<label className="font-medium text-muted-foreground">
													Virtual Host
												</label>
												<Dropdown
													value={topicPermVHost}
													onChange={(v) => setTopicPermVHost(v as string)}
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
													buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
													contentClassName="w-full"
												/>
											</div>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div className="space-y-1.5">
												<label className="font-medium text-muted-foreground">
													Write regexp
												</label>
												<input
													type="text"
													value={topicPermWrite}
													onChange={(e) => setTopicPermWrite(e.target.value)}
													placeholder=".*"
													className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
												/>
											</div>
											<div className="space-y-1.5">
												<label className="font-medium text-muted-foreground">
													Read regexp
												</label>
												<input
													type="text"
													value={topicPermRead}
													onChange={(e) => setTopicPermRead(e.target.value)}
													placeholder=".*"
													className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
												/>
											</div>
										</div>
										<div className="flex justify-end">
											<Button
												type="submit"
												size="sm"
												disabled={isSettingTopicPerm}
											>
												{isSettingTopicPerm
													? "Saving..."
													: "Set Topic Permission"}
											</Button>
										</div>
									</div>
								</form>
							)}

							{/* Update User */}
							{userModalTab === "account" && (
								<form
									id="update-user-form"
									onSubmit={handleUpdateUser}
									className="max-w-md space-y-4"
								>
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											Tags (comma separated)
										</label>
										<input
											type="text"
											value={updateUserTags}
											onChange={(e) => setUpdateUserTags(e.target.value)}
											placeholder="administrator, policymaker, monitoring, management"
											className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											New Password (leave blank to keep current)
										</label>
										<input
											type="password"
											value={updateUserPassword}
											onChange={(e) => setUpdateUserPassword(e.target.value)}
											placeholder="••••••••"
											className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
										/>
									</div>
									<div className="flex justify-end">
										<Button type="submit" size="sm" disabled={isUpdatingUser}>
											{isUpdatingUser ? "Saving..." : "Update User"}
										</Button>
									</div>
								</form>
							)}
						</div>
						<div className="flex justify-between items-center gap-2 px-6 py-4 border-t border-border bg-muted/20">
							{permUser.name !== "guest" ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => handleDeleteUser(permUser.name)}
									className="text-destructive hover:bg-destructive/10"
								>
									<Trash2 className="h-3.5 w-3.5 mr-1" />
									Delete User
								</Button>
							) : (
								<span />
							)}
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setPermUser(null)}
							>
								Close
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Virtual Host Management Modal */}
			{vhostDetail && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
					<div className="flex w-full max-w-2xl max-h-[85vh] flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150">
						<div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
							<div className="flex items-center gap-2">
								<Network className="h-4 w-4 text-primary" />
								<h3 className="text-sm font-bold text-foreground">
									Virtual Host: {vhostDetail.name}
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setVHostDetail(null)}
								className="p-1 rounded text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 text-sm">
							{/* Overview */}
							<div className="space-y-3">
								<h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
									Overview
								</h4>
								<div className="grid grid-cols-2 gap-3 text-xs">
									<div className="space-y-1">
										<span className="text-muted-foreground">Description</span>
										<p className="font-mono text-foreground">
											{vhostDetail.description || "—"}
										</p>
									</div>
									<div className="space-y-1">
										<span className="text-muted-foreground">
											Default Queue Type
										</span>
										<p>
											<Badge
												variant="outline"
												className="font-mono text-[10px] uppercase"
											>
												{vhostDetail.default_queue_type || "classic"}
											</Badge>
										</p>
									</div>
									<div className="space-y-1">
										<span className="text-muted-foreground">Tracing</span>
										<p>
											<Badge
												variant={vhostDetail.tracing ? "success" : "outline"}
												className="text-[10px]"
											>
												{vhostDetail.tracing ? "Active" : "Off"}
											</Badge>
										</p>
									</div>
									<div className="space-y-1">
										<span className="text-muted-foreground">Messages</span>
										<p className="font-mono text-foreground">
											{(vhostDetail.messages ?? 0).toLocaleString()}
										</p>
									</div>
								</div>
							</div>

							{/* Permissions */}
							<form
								id="vhost-permissions-form"
								onSubmit={handleSetVHostPermission}
								className="space-y-4 border-t border-border pt-6"
							>
								<h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
									Permissions
								</h4>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>User</TableHead>
											<TableHead>Configure</TableHead>
											<TableHead>Write</TableHead>
											<TableHead>Read</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{vhostDetailPermissions.length ? (
											vhostDetailPermissions.map((p) => (
												<TableRow key={p.user}>
													<TableCell className="font-mono text-xs font-semibold">
														{p.user}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{p.configure}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{p.write}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{p.read}
													</TableCell>
													<TableCell className="text-right">
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => handleClearVHostPermission(p.user)}
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

								<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											User
										</label>
										<Dropdown
											value={vhostPermUser}
											onChange={(v) => setVHostPermUser(v as string)}
											options={users.map((u) => ({
												label: u.name,
												value: u.name,
											}))}
											className="w-full"
											buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
											contentClassName="w-full"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											Configure
										</label>
										<input
											type="text"
											value={vhostPermConf}
											onChange={(e) => setVHostPermConf(e.target.value)}
											placeholder=".*"
											className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											Write
										</label>
										<input
											type="text"
											value={vhostPermWrite}
											onChange={(e) => setVHostPermWrite(e.target.value)}
											placeholder=".*"
											className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											Read
										</label>
										<input
											type="text"
											value={vhostPermRead}
											onChange={(e) => setVHostPermRead(e.target.value)}
											placeholder=".*"
											className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
										/>
									</div>
								</div>
								<div className="flex justify-end">
									<Button
										type="submit"
										size="sm"
										disabled={isSettingVHostPerm || !vhostPermUser}
									>
										{isSettingVHostPerm ? "Saving..." : "Set Permission"}
									</Button>
								</div>
							</form>

							{/* Topic Permissions */}
							<form
								id="vhost-topic-permissions-form"
								onSubmit={handleSetVHostTopicPermission}
								className="space-y-4 border-t border-border pt-6"
							>
								<h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
									Topic Permissions
								</h4>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>User</TableHead>
											<TableHead>Exchange</TableHead>
											<TableHead>Write</TableHead>
											<TableHead>Read</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{vhostDetailTopicPermissions.length ? (
											vhostDetailTopicPermissions.map((p) => (
												<TableRow key={`${p.user}:${p.exchange}`}>
													<TableCell className="font-mono text-xs font-semibold">
														{p.user}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{p.exchange || "(AMQP default)"}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{p.write}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{p.read}
													</TableCell>
													<TableCell className="text-right">
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() =>
																handleClearVHostTopicPermission(p.user)
															}
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

								<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											User
										</label>
										<Dropdown
											value={vhostTopicPermUser}
											onChange={(v) => setVHostTopicPermUser(v as string)}
											options={users.map((u) => ({
												label: u.name,
												value: u.name,
											}))}
											className="w-full"
											buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
											contentClassName="w-full"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											Exchange
										</label>
										<Dropdown
											value={vhostTopicPermExchange}
											onChange={(v) => setVHostTopicPermExchange(v as string)}
											options={[
												{ label: "(AMQP default)", value: "" },
												...vhostDetailExchanges.map((ex) => ({
													label: ex.name,
													value: ex.name,
												})),
											]}
											className="w-full"
											buttonClassName="h-10 w-full justify-between px-3 text-sm font-mono"
											contentClassName="w-full"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											Write
										</label>
										<input
											type="text"
											value={vhostTopicPermWrite}
											onChange={(e) => setVHostTopicPermWrite(e.target.value)}
											placeholder=".*"
											className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
										/>
									</div>
									<div className="space-y-1.5">
										<label className="font-medium text-muted-foreground">
											Read
										</label>
										<input
											type="text"
											value={vhostTopicPermRead}
											onChange={(e) => setVHostTopicPermRead(e.target.value)}
											placeholder=".*"
											className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm font-mono"
										/>
									</div>
								</div>
								<div className="flex justify-end">
									<Button
										type="submit"
										size="sm"
										disabled={isSettingVHostTopicPerm || !vhostTopicPermUser}
									>
										{isSettingVHostTopicPerm
											? "Saving..."
											: "Set Topic Permission"}
									</Button>
								</div>
							</form>
						</div>
						<div className="flex justify-between items-center gap-2 px-6 py-4 border-t border-border bg-muted/20">
							{vhostDetail.name !== "/" ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => handleDeleteVHost(vhostDetail.name)}
									className="text-destructive hover:bg-destructive/10"
								>
									<Trash2 className="h-3.5 w-3.5 mr-1" />
									Delete Virtual Host
								</Button>
							) : (
								<span />
							)}
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setVHostDetail(null)}
							>
								Close
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
