import { Layout } from "@/components/Layout/index.tsx";
import { getStoredAuth } from "@/hooks/useAuth/index.ts";
import { useSessionExpiredRedirect } from "@/hooks/useAuth/useSessionExpiredRedirect.ts";
import { AdminPage, DEFAULT_ADMIN_TAB } from "@/pages/admin/index.tsx";
import {
	ChannelDetailPage,
	DEFAULT_CHANNEL_TAB,
} from "@/pages/channels/detail.tsx";
import { ChannelsPage } from "@/pages/channels/index.tsx";
import {
	ConnectionDetailPage,
	DEFAULT_CONNECTION_TAB,
} from "@/pages/connections/detail.tsx";
import { ConnectionsPage } from "@/pages/connections/index.tsx";
import {
	DEFAULT_EXCHANGE_TAB,
	ExchangeDetailPage,
} from "@/pages/exchanges/detail.tsx";
import { ExchangesPage } from "@/pages/exchanges/index.tsx";
import { LoginPage } from "@/pages/login/index.tsx";
import { OverviewPage } from "@/pages/overview/index.tsx";
import { DEFAULT_QUEUE_TAB, QueueDetailPage } from "@/pages/queues/detail.tsx";
import { QueuesPage } from "@/pages/queues/index.tsx";
import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	redirect,
} from "@tanstack/react-router";

function RootLayout() {
	// Mounted for every route; watches for 401s from expired/invalid credentials
	// and bounces the user back to /login instead of leaving stale/broken pages up.
	useSessionExpiredRedirect();
	return <Outlet />;
}

// List-page search params (filters/sort/quick-filters) are plain optional
// strings so they round-trip cleanly through the URL query string; each page
// applies its own defaults via `useUrlState`.
function parseListSearch(
	search: Record<string, unknown>,
): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(search)) {
		if (typeof value === "string" && value !== "") {
			result[key] = value;
		}
	}
	return result;
}

const rootRoute = createRootRoute({
	component: RootLayout,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	validateSearch: (
		search: Record<string, unknown>,
	): { redirect?: string; expired?: boolean } => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
		expired:
			search.expired === true || search.expired === "true" ? true : undefined,
	}),
	beforeLoad: () => {
		// Already logged in: /login has nothing to offer, send them to the app.
		if (getStoredAuth()) {
			throw redirect({ to: "/overview" });
		}
	},
	component: LoginPage,
});

const appLayoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "_app",
	beforeLoad: ({ location }) => {
		// No session: bounce to /login and remember where they were headed.
		if (!getStoredAuth()) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}
	},
	component: Layout,
});

const indexRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/",
	beforeLoad: () => {
		throw redirect({ to: "/overview" });
	},
});

const overviewRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/overview",
	component: OverviewPage,
});

const connectionsRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/connections",
	validateSearch: parseListSearch,
	component: ConnectionsPage,
});

const connectionDetailRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/connections/$name",
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/connections/$name/$tab",
			params: { ...params, tab: DEFAULT_CONNECTION_TAB },
			replace: true,
		});
	},
});

const connectionDetailTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/connections/$name/$tab",
	component: ConnectionDetailPage,
});

const channelsRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/channels",
	validateSearch: parseListSearch,
	component: ChannelsPage,
});

const channelDetailRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/channels/$name",
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/channels/$name/$tab",
			params: { ...params, tab: DEFAULT_CHANNEL_TAB },
			replace: true,
		});
	},
});

const channelDetailTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/channels/$name/$tab",
	component: ChannelDetailPage,
});

const exchangesRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/exchanges",
	validateSearch: parseListSearch,
	component: ExchangesPage,
});

const exchangeDetailRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/exchanges/$vhost/$name",
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/exchanges/$vhost/$name/$tab",
			params: { ...params, tab: DEFAULT_EXCHANGE_TAB },
			replace: true,
		});
	},
});

const exchangeDetailTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/exchanges/$vhost/$name/$tab",
	component: ExchangeDetailPage,
});

const queuesRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/queues",
	validateSearch: parseListSearch,
	component: QueuesPage,
});

const queueDetailRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/queues/$vhost/$name",
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/queues/$vhost/$name/$tab",
			params: { ...params, tab: DEFAULT_QUEUE_TAB },
			replace: true,
		});
	},
});

const queueDetailTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/queues/$vhost/$name/$tab",
	component: QueueDetailPage,
});

const adminRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/admin",
	beforeLoad: () => {
		throw redirect({
			to: "/admin/$tab",
			params: { tab: DEFAULT_ADMIN_TAB },
			replace: true,
		});
	},
});

const adminTabRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/admin/$tab",
	component: AdminPage,
});

const routeTree = rootRoute.addChildren([
	loginRoute,
	appLayoutRoute.addChildren([
		indexRoute,
		overviewRoute,
		connectionsRoute,
		connectionDetailRoute,
		connectionDetailTabRoute,
		channelsRoute,
		channelDetailRoute,
		channelDetailTabRoute,
		exchangesRoute,
		exchangeDetailRoute,
		exchangeDetailTabRoute,
		queuesRoute,
		queueDetailRoute,
		queueDetailTabRoute,
		adminRoute,
		adminTabRoute,
	]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

