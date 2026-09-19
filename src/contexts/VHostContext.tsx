import { getRabbitMQClient } from "@/hooks/useAuth/index.ts";
import type { Exchange } from "@/services/rabbitmq/types/exchange.ts";
import type { Queue } from "@/services/rabbitmq/types/queue.ts";
import type { VirtualHost } from "@/services/rabbitmq/types/vhost.ts";
import { useQuery } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	startTransition,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

export interface VHostSummary {
	name: string;
	messages: number;
	tracing: boolean;
	description?: string;
	tags?: string[];
	queues: number;
	exchanges: number;
}

interface VHostContextValue {
	selectedVHost: string;
	setSelectedVHost: (vhost: string) => void;
	availableVHosts: VHostSummary[];
}

const VHostContext = createContext<VHostContextValue | null>(null);

// Module-level so React Query can memoize the select result. Reducing the full
// queue/exchange payloads down to per-vhost counts here (instead of in a useMemo
// over the raw arrays) means this provider's context value only changes when a
// count actually changes — not on every poll, where live message rates make the
// raw arrays differ every single time and re-rendered every useVHost consumer.
function countByVhost(items: { vhost: string }[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const item of items) counts[item.vhost] = (counts[item.vhost] ?? 0) + 1;
	return counts;
}

export function VHostProvider({ children }: { children: ReactNode }) {
	const [selectedVHost, setSelectedVHostState] = useState<string>(() => {
		if (typeof window === "undefined") return "/";
		return localStorage.getItem("rabbitdash-vhost") || "/";
	});

	const { data: vhostsData = [] } = useQuery<VirtualHost[]>({
		queryKey: ["rabbit", "vhosts"],
		queryFn: async () => {
			const client = getRabbitMQClient();
			const list = await client.vhosts.getVhosts();
			return Array.isArray(list) ? list : [];
		},
		refetchInterval: 10000,
	});

	// Fetched cluster-wide (no vhost filter) purely to derive per-vhost queue/exchange
	// counts for the vhost selector — cheap since these lists are already cached
	// elsewhere in the app under the same query keys.
	const { data: queueCounts = {} } = useQuery<
		Queue[],
		Error,
		Record<string, number>
	>({
		queryKey: ["rabbit", "queues", undefined],
		queryFn: async () => {
			const client = getRabbitMQClient();
			const res = await client.queues.getQueues();
			return Array.isArray(res) ? res : res.items || [];
		},
		select: countByVhost,
		refetchInterval: 10000,
	});

	const { data: exchangeCounts = {} } = useQuery<
		Exchange[],
		Error,
		Record<string, number>
	>({
		queryKey: ["rabbit", "exchanges", undefined],
		queryFn: async () => {
			const client = getRabbitMQClient();
			const res = await client.exchanges.getExchanges();
			return Array.isArray(res) ? res : res.items || [];
		},
		select: countByVhost,
		refetchInterval: 10000,
	});

	// Stable array — only recomputed when the actual vhosts data changes.
	// Without useMemo this was a new array reference on every provider render,
	// causing all context consumers to re-render every 10 s for free.
	const availableVHosts: VHostSummary[] = useMemo(() => {
		return vhostsData.length > 0
			? vhostsData.map((v) => ({
					name: v.name,
					messages: v.messages ?? 0,
					tracing: v.tracing ?? false,
					description: v.description,
					tags: v.tags,
					queues: queueCounts[v.name] ?? 0,
					exchanges: exchangeCounts[v.name] ?? 0,
				}))
			: [{ name: "/", messages: 0, tracing: false, queues: 0, exchanges: 0 }];
	}, [vhostsData, queueCounts, exchangeCounts]);

	// Stable setter — persists to localStorage and wraps the state update in
	// startTransition so React treats the re-render cascade as non-urgent.
	// This prevents the UI from freezing when many heavy page components
	// (QueuesPage, ExchangesPage, etc.) all re-render simultaneously on vhost change.
	const setSelectedVHost = useCallback((vhost: string) => {
		localStorage.setItem("rabbitdash-vhost", vhost);
		startTransition(() => {
			setSelectedVHostState(vhost);
		});
	}, []);

	// Stable context value object — only a new reference when the actual values change.
	// Without useMemo every provider render pushed a new object, re-rendering all consumers.
	const value = useMemo<VHostContextValue>(
		() => ({ selectedVHost, setSelectedVHost, availableVHosts }),
		[selectedVHost, setSelectedVHost, availableVHosts],
	);

	return (
		<VHostContext.Provider value={value}>{children}</VHostContext.Provider>
	);
}

export function useVHostContext(): VHostContextValue {
	const ctx = useContext(VHostContext);
	if (!ctx)
		throw new Error("useVHostContext must be used within <VHostProvider>");
	return ctx;
}
