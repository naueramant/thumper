import { getRabbitMQClient, useAuth } from "@/hooks/useAuth/index.ts";
import { useRefreshInterval } from "@/hooks/useRefreshInterval/index.ts";
import type { Permission } from "@/services/rabbitmq/types/permissions.ts";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

function testRegex(pattern: string | undefined, target?: string): boolean {
	if (!pattern) return false;
	if (pattern === "^$") return false;
	if (!target) return pattern.length > 0;
	try {
		return new RegExp(pattern).test(target);
	} catch {
		return false;
	}
}

/**
 * Fetches permissions granted to the currently logged in user across all virtual hosts.
 */
export function useCurrentUserPermissions() {
	const { user } = useAuth();
	const { intervalMs } = useRefreshInterval();

	return useQuery<Permission[]>({
		queryKey: ["rabbit", "current-user-permissions", user?.username],
		queryFn: async () => {
			if (!user?.username) return [];
			const client = getRabbitMQClient();

			// In RabbitMQ, any authenticated user can view their own permissions via /api/users/{name}/permissions
			try {
				const perms = await client.users.getUserPermissions(user.username);
				if (Array.isArray(perms)) {
					return perms;
				}
			} catch {
				// Fallback to cluster-wide permissions if user is an administrator
				try {
					const allPerms = await client.permissions.getPermissions();
					if (Array.isArray(allPerms)) {
						return allPerms.filter((p) => p.user === user.username);
					}
				} catch {
					// Ignored
				}
			}
			return [];
		},
		enabled: Boolean(user?.username),
		refetchInterval: intervalMs === 0 ? false : intervalMs,
	});
}

export interface ResourcePermissionsOptions {
	vhost?: string;
	queueName?: string;
	exchangeName?: string;
}

export interface ResourcePermissionsResult {
	hasVHostAccess: boolean;
	canConfigure: boolean;
	canWrite: boolean;
	canRead: boolean;
	isAdmin: boolean;
	isAdminWithoutVHostPerms: boolean;
	permission?: Permission;
	isLoading: boolean;
}

/**
 * Evaluates whether the current user has configure, write, or read permissions
 * on a given vhost and specific queue or exchange.
 */
export function useResourcePermissions({
	vhost,
	queueName,
	exchangeName,
}: ResourcePermissionsOptions): ResourcePermissionsResult {
	const { user } = useAuth();
	const { data: userPermissions = [], isLoading } = useCurrentUserPermissions();

	const isAdmin = useMemo(
		() => user?.tags?.includes("administrator") ?? false,
		[user?.tags],
	);

	return useMemo(() => {
		// When no vhost specified or cluster-wide "all"
		if (!vhost || vhost === "all") {
			return {
				hasVHostAccess: true,
				canConfigure: true,
				canWrite: true,
				canRead: true,
				isAdmin,
				isAdminWithoutVHostPerms: false,
				isLoading,
			};
		}

		// Find explicit permission entry for this user and this vhost
		const perm = userPermissions.find((p) => p.vhost === vhost);
		const targetName = queueName ?? exchangeName;

		// In RabbitMQ, users (even administrators) only have AMQP permissions if an
		// entry exists for them on that vhost. Without an entry, RabbitMQ returns 401.
		if (!perm) {
			return {
				hasVHostAccess: false,
				canConfigure: false,
				canWrite: false,
				canRead: false,
				isAdmin,
				isAdminWithoutVHostPerms: isAdmin,
				isLoading,
			};
		}

		return {
			hasVHostAccess: true,
			canConfigure: testRegex(perm.configure, targetName),
			canWrite: testRegex(perm.write, targetName),
			canRead: testRegex(perm.read, targetName),
			isAdmin,
			isAdminWithoutVHostPerms: false,
			permission: perm,
			isLoading,
		};
	}, [vhost, queueName, exchangeName, userPermissions, isAdmin, isLoading]);
}
