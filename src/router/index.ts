import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import { Layout } from '@/components/Layout/index.tsx'
import { LoginPage } from '@/pages/login/index.tsx'
import { OverviewPage } from '@/pages/overview/index.tsx'
import { ConnectionsPage } from '@/pages/connections/index.tsx'
import { ChannelsPage } from '@/pages/channels/index.tsx'
import { ExchangesPage } from '@/pages/exchanges/index.tsx'
import { QueuesPage } from '@/pages/queues/index.tsx'
import { AdminPage } from '@/pages/admin/index.tsx'

const rootRoute = createRootRoute({
  component: Outlet,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  component: Layout,
})

const indexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/overview' })
  },
})

const overviewRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/overview',
  component: OverviewPage,
})

const connectionsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/connections',
  component: ConnectionsPage,
})

const channelsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/channels',
  component: ChannelsPage,
})

const exchangesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/exchanges',
  component: ExchangesPage,
})

const queuesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/queues',
  component: QueuesPage,
})

const adminRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/admin',
  component: AdminPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  appLayoutRoute.addChildren([
    indexRoute,
    overviewRoute,
    connectionsRoute,
    channelsRoute,
    exchangesRoute,
    queuesRoute,
    adminRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default router
