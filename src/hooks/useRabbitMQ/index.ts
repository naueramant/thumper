import { getRabbitMQClient } from "@/hooks/useAuth/index.ts";
import { useRefreshInterval } from "@/hooks/useRefreshInterval/index.ts";
import type {
	Binding,
	CreateBindingRequest,
} from "@/services/rabbitmq/types/binding.ts";
import type { Channel } from "@/services/rabbitmq/types/channel.ts";
import type { Connection } from "@/services/rabbitmq/types/connection.ts";
import type { Consumer } from "@/services/rabbitmq/types/consumer.ts";
import type {
	CreateExchangeRequest,
	Exchange,
	PublishMessageRequest,
	PublishMessageResponse,
} from "@/services/rabbitmq/types/exchange.ts";
import type { Node as RabbitNode } from "@/services/rabbitmq/types/node.ts";
import type { RabbitMQOverview } from "@/services/rabbitmq/types/overview.ts";
import type {
	Permission,
	TopicPermission,
} from "@/services/rabbitmq/types/permissions.ts";
import type {
	CreatePolicyRequest,
	OperatorPolicy,
	Policy,
} from "@/services/rabbitmq/types/policy.ts";
import type {
	CreateQueueRequest,
	GetMessagesRequest,
	Queue,
	QueueMessage,
} from "@/services/rabbitmq/types/queue.ts";
import type {
	CreateUserRequest,
	User,
} from "@/services/rabbitmq/types/user.ts";
import type {
	CreateVhostRequest,
	VirtualHost,
} from "@/services/rabbitmq/types/vhost.ts";
import type {
	DynamicShovel,
	DynamicShovelDefinition,
	ShovelStatus,
} from "@/services/rabbitmq/types/shovel.ts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface FeatureFlag {
	name: string;
	state: "enabled" | "disabled" | "unsupported";
	desc?: string;
	doc_url?: string;
}

export interface VHostLimit {
	vhost: string;
	value: {
		"max-connections"?: number;
		"max-queues"?: number;
	};
}

export interface UserLimit {
	user: string;
	value: {
		"max-connections"?: number;
		"max-channels"?: number;
	};
}

export interface ShovelItem {
	vhost: string;
	name: string;
	component: string;
	value: {
		"src-uri": string;
		"src-queue"?: string;
		"src-exchange"?: string;
		"dest-uri": string;
		"dest-queue"?: string;
		"dest-exchange"?: string;
		"prefetch-count"?: number;
		"reconnect-delay"?: number;
		"ack-mode"?: string;
	};
}

// Fallback mock overview if RabbitMQ is offline
const fallbackOverview: RabbitMQOverview = {
	management_version: "4.3.6",
	rabbitmq_version: "4.3.6",
	rates_mode: "basic",
	cluster_name: "rabbit@local-cluster",
	erlang_version: "27.3.4.17",
	erlang_full_version: "Erlang/OTP 27 [erts-15.2.7.13]",
	node: "rabbit@local-cluster",
	message_stats: {
		publish: 248192,
		publish_details: { rate: 1240.5 },
		deliver_get: 245100,
		deliver_get_details: { rate: 1198.2 },
		ack: 243980,
		ack_details: { rate: 1185.0 },
	},
	queue_totals: {
		messages: 3092,
		messages_ready: 2840,
		messages_unacknowledged: 252,
	},
	object_totals: {
		connections: 4,
		channels: 12,
		exchanges: 8,
		queues: 6,
		consumers: 18,
	},
	listeners: [
		{
			node: "rabbit@local-cluster",
			protocol: "amqp",
			ip_address: "::",
			port: 5672,
		},
		{
			node: "rabbit@local-cluster",
			protocol: "http",
			ip_address: "::",
			port: 15672,
		},
		{
			node: "rabbit@local-cluster",
			protocol: "clustering",
			ip_address: "::",
			port: 25672,
		},
	],
	contexts: [
		{
			node: "rabbit@local-cluster",
			description: "RabbitMQ Management",
			path: "/",
			port: 15672,
		},
	],
};

export function useRabbitOverview() {
	const { intervalMs } = useRefreshInterval();

	return useQuery({
		queryKey: ["rabbit", "overview"],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				return await client.overview.getOverview();
			} catch (err) {
				console.warn("RabbitMQ API unavailable, using fallback overview:", err);
				return fallbackOverview;
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitNodes() {
	const { intervalMs } = useRefreshInterval();

	return useQuery<RabbitNode[]>({
		queryKey: ["rabbit", "nodes"],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const nodes = await client.nodes.getNodes();
				return Array.isArray(nodes) ? nodes : [];
			} catch {
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitQueues(vhost?: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Queue[]>({
		queryKey: ["rabbit", "queues", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				let res: Queue[] | { items: Queue[] };
				if (vhost && vhost !== "all") {
					res = await client.queues.getQueuesByVhost(vhost);
				} else {
					res = await client.queues.getQueues();
				}
				return Array.isArray(res) ? res : res.items || [];
			} catch (err) {
				console.warn("Failed to fetch queues:", err);
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitQueueDetail(vhost: string, name: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Queue | null>({
		queryKey: ["rabbit", "queue", vhost, name],
		queryFn: async () => {
			if (!vhost || !name) return null;
			const client = getRabbitMQClient();
			return await client.queues.getQueue(vhost, name);
		},
		enabled: Boolean(vhost && name),
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitQueueBindings(vhost: string, name: string) {
	return useQuery<Binding[]>({
		queryKey: ["rabbit", "queue-bindings", vhost, name],
		queryFn: async () => {
			if (!vhost || !name) return [];
			const client = getRabbitMQClient();
			return await client.queues.getBindings(vhost, name);
		},
		enabled: Boolean(vhost && name),
	});
}

export function useRabbitExchanges(vhost?: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Exchange[]>({
		queryKey: ["rabbit", "exchanges", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				let res: Exchange[] | { items: Exchange[] };
				if (vhost && vhost !== "all") {
					res = await client.exchanges.getExchangesByVhost(vhost);
				} else {
					res = await client.exchanges.getExchanges();
				}
				return Array.isArray(res) ? res : res.items || [];
			} catch (err) {
				console.warn("Failed to fetch exchanges:", err);
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitExchangeDetail(vhost: string, name: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Exchange | null>({
		queryKey: ["rabbit", "exchange", vhost, name],
		queryFn: async () => {
			if (!vhost || !name) return null;
			const client = getRabbitMQClient();
			return await client.exchanges.getExchange(vhost, name);
		},
		enabled: Boolean(vhost && name),
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitExchangeBindings(vhost: string, name: string) {
	return useQuery<{ inbound: Binding[]; outbound: Binding[] }>({
		queryKey: ["rabbit", "exchange-bindings", vhost, name],
		queryFn: async () => {
			if (!vhost || !name) return { inbound: [], outbound: [] };
			const client = getRabbitMQClient();
			const [inbound, outbound] = await Promise.all([
				client.exchanges.getBindingsAsDestination(vhost, name).catch(() => []),
				client.exchanges.getBindingsAsSource(vhost, name).catch(() => []),
			]);
			return { inbound, outbound };
		},
		enabled: Boolean(vhost && name),
	});
}

export function useRabbitBindings(vhost?: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Binding[]>({
		queryKey: ["rabbit", "all-bindings", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				if (vhost && vhost !== "all") {
					return await client.bindings.getBindingsByVhost(vhost);
				}
				return await client.bindings.getBindings();
			} catch (err) {
				console.warn("Failed to fetch bindings:", err);
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitConnections(vhost?: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Connection[]>({
		queryKey: ["rabbit", "connections", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				let res: Connection[] | { items: Connection[] };
				if (vhost && vhost !== "all") {
					res = await client.connections.getConnectionsByVhost(vhost);
				} else {
					res = await client.connections.getConnections();
				}
				return Array.isArray(res) ? res : res.items || [];
			} catch (err) {
				console.warn("Failed to fetch connections:", err);
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitChannels(vhost?: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Channel[]>({
		queryKey: ["rabbit", "channels", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				let res: Channel[] | { items: Channel[] };
				if (vhost && vhost !== "all") {
					res = await client.channels.getChannelsByVhost(vhost);
				} else {
					res = await client.channels.getChannels();
				}
				return Array.isArray(res) ? res : res.items || [];
			} catch (err) {
				console.warn("Failed to fetch channels:", err);
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitConnectionDetail(name: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Connection | null>({
		queryKey: ["rabbit", "connection", name],
		queryFn: async () => {
			if (!name) return null;
			const client = getRabbitMQClient();
			return await client.connections.getConnection(name);
		},
		enabled: Boolean(name),
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitConnectionChannels(name: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Channel[]>({
		queryKey: ["rabbit", "connection-channels", name],
		queryFn: async () => {
			if (!name) return [];
			try {
				const client = getRabbitMQClient();
				return await client.connections.getConnectionChannels(name);
			} catch (err) {
				console.warn("Failed to fetch connection channels:", err);
				return [];
			}
		},
		enabled: Boolean(name),
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitChannelDetail(nameOrId: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Channel | null>({
		queryKey: ["rabbit", "channel", nameOrId],
		queryFn: async () => {
			if (!nameOrId) return null;
			const client = getRabbitMQClient();
			return await client.channels.getChannel(nameOrId);
		},
		enabled: Boolean(nameOrId),
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitConsumers(vhost?: string) {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Consumer[]>({
		queryKey: ["rabbit", "consumers", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const list =
					vhost && vhost !== "all"
						? await client.consumers.getConsumersByVhost(vhost)
						: await client.consumers.getConsumers();
				return Array.isArray(list) ? list : [];
			} catch (err) {
				console.warn("Failed to fetch consumers:", err);
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitUsers() {
	const { intervalMs } = useRefreshInterval();

	return useQuery<User[]>({
		queryKey: ["rabbit", "users"],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const users = await client.users.getUsers();
				return Array.isArray(users) ? users : [];
			} catch {
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitPermissions() {
	const { intervalMs } = useRefreshInterval();

	return useQuery<Permission[]>({
		queryKey: ["rabbit", "permissions"],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const permissions = await client.permissions.getPermissions();
				return Array.isArray(permissions) ? permissions : [];
			} catch {
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitTopicPermissions() {
	const { intervalMs } = useRefreshInterval();

	return useQuery<TopicPermission[]>({
		queryKey: ["rabbit", "topic-permissions"],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const permissions = await client.permissions.getTopicPermissions();
				return Array.isArray(permissions) ? permissions : [];
			} catch {
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitVHosts() {
	const { intervalMs } = useRefreshInterval();

	return useQuery<VirtualHost[]>({
		queryKey: ["rabbit", "vhosts"],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const list = await client.vhosts.getVhosts();
				return Array.isArray(list) ? list : [];
			} catch {
				return [];
			}
		},
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export function useRabbitPolicies(vhost?: string) {
	return useQuery<Policy[]>({
		queryKey: ["rabbit", "policies", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const policies = await client.policies.getPolicies(
					vhost && vhost !== "all" ? vhost : undefined,
				);
				return Array.isArray(policies) ? policies : [];
			} catch {
				return [];
			}
		},
	});
}

export function useRabbitOperatorPolicies(vhost?: string) {
	return useQuery<OperatorPolicy[]>({
		queryKey: ["rabbit", "operator-policies", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const policies = await client.policies.getOperatorPolicies(
					vhost && vhost !== "all" ? vhost : undefined,
				);
				return Array.isArray(policies) ? policies : [];
			} catch {
				return [];
			}
		},
	});
}

export function useRabbitFeatureFlags() {
	return useQuery<FeatureFlag[]>({
		queryKey: ["rabbit", "feature-flags"],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const flags = await client.request<FeatureFlag[]>("/api/feature-flags");
				return Array.isArray(flags) ? flags : [];
			} catch {
				return [];
			}
		},
	});
}

export function useRabbitLimits() {
	return useQuery<{ vhostLimits: VHostLimit[]; userLimits: UserLimit[] }>({
		queryKey: ["rabbit", "limits"],
		queryFn: async () => {
			const client = getRabbitMQClient();
			const [vhostLimits, userLimits] = await Promise.all([
				client.request<VHostLimit[]>("/api/vhost-limits").catch(() => []),
				client.request<UserLimit[]>("/api/user-limits").catch(() => []),
			]);
			return {
				vhostLimits: Array.isArray(vhostLimits) ? vhostLimits : [],
				userLimits: Array.isArray(userLimits) ? userLimits : [],
			};
		},
	});
}

/**
 * Checks whether the RabbitMQ Shovel plugin is enabled on the cluster.
 * Probes the /api/extensions list (standard management plugin discovery)
 * and verifies the /api/shovels endpoint as fallback.
 */
export function useRabbitShovelPlugin() {
	return useQuery<boolean>({
		queryKey: ["rabbit", "shovel-plugin-enabled"],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				const extensions = await client.overview.getExtensions().catch(() => []);
				const hasShovelExtension = extensions.some((ext) => {
					const js = ext.javascript;
					if (typeof js === "string") {
						return js.includes("shovel");
					}
					if (Array.isArray(js)) {
						return js.some((item) => item.includes("shovel"));
					}
					return false;
				});

				if (hasShovelExtension) return true;

				// Fallback probe
				try {
					await client.shovels.getShovelStatuses();
					return true;
				} catch {
					return false;
				}
			} catch {
				return false;
			}
		},
		staleTime: 60_000,
	});
}

/**
 * Retrieves live runtime statuses for all shovels (dynamic and static).
 */
export function useRabbitShovelStatuses(vhost?: string) {
	const { intervalMs } = useRefreshInterval();
	return useQuery<ShovelStatus[]>({
		queryKey: ["rabbit", "shovel-statuses", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				return await client.shovels.getShovelStatuses(vhost);
			} catch {
				return [];
			}
		},
		refetchInterval: intervalMs > 0 ? intervalMs : false,
	});
}

/**
 * Retrieves configured dynamic shovels across all or a specific vhost.
 */
export function useRabbitDynamicShovels(vhost?: string) {
	const { intervalMs } = useRefreshInterval();
	return useQuery<DynamicShovel[]>({
		queryKey: ["rabbit", "dynamic-shovels", vhost],
		queryFn: async () => {
			try {
				const client = getRabbitMQClient();
				return await client.shovels.getDynamicShovels(vhost);
			} catch {
				return [];
			}
		},
		refetchInterval: intervalMs > 0 ? intervalMs : false,
	});
}

// Backward-compatible hook alias
export function useRabbitShovels(vhost?: string) {
	return useRabbitDynamicShovels(vhost);
}

// ---------------------- MUTATIONS ----------------------

export function useRabbitMutations() {
	const queryClient = useQueryClient();
	const client = getRabbitMQClient();

	// Queue mutations
	const createQueue = useMutation({
		mutationFn: ({
			vhost,
			name,
			data,
		}: {
			vhost: string;
			name: string;
			data: CreateQueueRequest;
		}) => client.queues.createQueue(vhost, name, data),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "queues"] }),
	});

	const deleteQueue = useMutation({
		mutationFn: ({ vhost, name }: { vhost: string; name: string }) =>
			client.queues.deleteQueue(vhost, name),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "queues"] }),
	});

	const purgeQueue = useMutation({
		mutationFn: ({ vhost, name }: { vhost: string; name: string }) =>
			client.queues.purgeQueue(vhost, name),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "queues"] }),
	});

	const getQueueMessages = useMutation({
		mutationFn: ({
			vhost,
			name,
			options,
		}: {
			vhost: string;
			name: string;
			options: GetMessagesRequest;
		}): Promise<QueueMessage[]> =>
			client.queues.getMessages(vhost, name, options),
	});

	// Exchange mutations
	const createExchange = useMutation({
		mutationFn: ({
			vhost,
			name,
			data,
		}: {
			vhost: string;
			name: string;
			data: CreateExchangeRequest;
		}) => client.exchanges.createExchange(vhost, name, data),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "exchanges"] }),
	});

	const deleteExchange = useMutation({
		mutationFn: ({ vhost, name }: { vhost: string; name: string }) =>
			client.exchanges.deleteExchange(vhost, name),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "exchanges"] }),
	});

	const publishMessage = useMutation({
		mutationFn: ({
			vhost,
			exchange,
			data,
		}: {
			vhost: string;
			exchange: string;
			data: PublishMessageRequest;
		}): Promise<PublishMessageResponse> =>
			client.exchanges.publish(vhost, exchange, data),
	});

	// Binding mutations
	const createBinding = useMutation({
		mutationFn: ({
			vhost,
			source,
			destination,
			destinationType,
			data,
		}: {
			vhost: string;
			source: string;
			destination: string;
			destinationType: "queue" | "exchange";
			data: CreateBindingRequest;
		}) => {
			if (destinationType === "queue") {
				return client.bindings.createQueueBinding(
					vhost,
					source,
					destination,
					data,
				);
			}
			return client.bindings.createExchangeBinding(
				vhost,
				source,
				destination,
				data,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rabbit", "queue-bindings"] });
			queryClient.invalidateQueries({
				queryKey: ["rabbit", "exchange-bindings"],
			});
		},
	});

	const deleteBinding = useMutation({
		mutationFn: ({
			vhost,
			source,
			destination,
			destinationType,
			propertiesKey,
		}: {
			vhost: string;
			source: string;
			destination: string;
			destinationType: "queue" | "exchange";
			propertiesKey: string;
		}) => {
			if (destinationType === "queue") {
				return client.bindings.deleteQueueBinding(
					vhost,
					source,
					destination,
					propertiesKey,
				);
			}
			return client.bindings.deleteExchangeBinding(
				vhost,
				source,
				destination,
				propertiesKey,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rabbit", "queue-bindings"] });
			queryClient.invalidateQueries({
				queryKey: ["rabbit", "exchange-bindings"],
			});
		},
	});

	// Connection mutations
	const closeConnection = useMutation({
		mutationFn: ({ name, reason }: { name: string; reason?: string }) =>
			client.connections.closeConnection(name, reason),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "connections"] }),
	});

	// User mutations
	const createUser = useMutation({
		mutationFn: ({ name, data }: { name: string; data: CreateUserRequest }) =>
			client.users.createUser(name, data),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "users"] }),
	});

	const deleteUser = useMutation({
		mutationFn: (name: string) => client.users.deleteUser(name),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "users"] }),
	});

	const setUserPermissions = useMutation({
		mutationFn: ({
			vhost,
			user,
			permissions,
		}: {
			vhost: string;
			user: string;
			permissions: { configure: string; write: string; read: string };
		}) => client.permissions.setPermission(vhost, user, permissions),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "permissions"] }),
	});

	const clearUserPermissions = useMutation({
		mutationFn: ({ vhost, user }: { vhost: string; user: string }) =>
			client.permissions.deletePermission(vhost, user),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "permissions"] }),
	});

	const setUserTopicPermission = useMutation({
		mutationFn: ({
			vhost,
			user,
			exchange,
			write,
			read,
		}: {
			vhost: string;
			user: string;
			exchange: string;
			write: string;
			read: string;
		}) =>
			client.permissions.setTopicPermission(vhost, user, {
				exchange,
				write,
				read,
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["rabbit", "topic-permissions"],
			}),
	});

	const clearUserTopicPermission = useMutation({
		mutationFn: ({ vhost, user }: { vhost: string; user: string }) =>
			client.permissions.deleteTopicPermission(vhost, user),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["rabbit", "topic-permissions"],
			}),
	});

	const updateUser = useMutation({
		mutationFn: ({ name, data }: { name: string; data: CreateUserRequest }) =>
			client.users.createUser(name, data),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "users"] }),
	});

	// VHost mutations
	const createVHost = useMutation({
		mutationFn: ({ name, data }: { name: string; data: CreateVhostRequest }) =>
			client.vhosts.createVhost(name, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rabbit", "vhosts"] });
		},
	});

	const deleteVHost = useMutation({
		mutationFn: (name: string) => client.vhosts.deleteVhost(name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rabbit", "vhosts"] });
		},
	});

	// Policy mutations
	const createPolicy = useMutation({
		mutationFn: ({
			vhost,
			name,
			data,
		}: {
			vhost: string;
			name: string;
			data: CreatePolicyRequest;
		}) => client.policies.setPolicy(vhost, name, data),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "policies"] }),
	});

	const deletePolicy = useMutation({
		mutationFn: ({ vhost, name }: { vhost: string; name: string }) =>
			client.policies.deletePolicy(vhost, name),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "policies"] }),
	});

	// Feature flag mutation
	const enableFeatureFlag = useMutation({
		mutationFn: (name: string) =>
			client.request<void>(
				`/api/feature-flags/${encodeURIComponent(name)}/enable`,
				{ method: "PUT" },
			),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "feature-flags"] }),
	});

	// Cluster rename
	const setClusterName = useMutation({
		mutationFn: (name: string) => client.overview.setClusterName(name),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["rabbit", "overview"] }),
	});

	// Shovel mutations
	const createShovel = useMutation({
		mutationFn: ({
			vhost,
			name,
			definition,
		}: {
			vhost: string;
			name: string;
			definition: DynamicShovelDefinition;
		}) => client.shovels.createDynamicShovel(vhost, name, definition),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rabbit", "shovel-statuses"] });
			queryClient.invalidateQueries({ queryKey: ["rabbit", "dynamic-shovels"] });
			queryClient.invalidateQueries({ queryKey: ["rabbit", "shovels"] });
		},
	});

	const deleteShovel = useMutation({
		mutationFn: ({ vhost, name }: { vhost: string; name: string }) =>
			client.shovels.deleteDynamicShovel(vhost, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rabbit", "shovel-statuses"] });
			queryClient.invalidateQueries({ queryKey: ["rabbit", "dynamic-shovels"] });
			queryClient.invalidateQueries({ queryKey: ["rabbit", "shovels"] });
		},
	});

	const restartShovel = useMutation({
		mutationFn: ({ vhost, name }: { vhost: string; name: string }) =>
			client.shovels.restartShovel(vhost, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rabbit", "shovel-statuses"] });
		},
	});

	return {
		createQueue,
		deleteQueue,
		purgeQueue,
		getQueueMessages,
		createExchange,
		deleteExchange,
		publishMessage,
		createBinding,
		deleteBinding,
		closeConnection,
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
		enableFeatureFlag,
		setClusterName,
		createShovel,
		deleteShovel,
		restartShovel,
	};
}
