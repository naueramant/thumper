import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Radio,
  Share2,
  Layers,
  ArrowLeftRight,
  ShieldCheck,
  Server,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/utilities/cn/index.ts'

const navItems = [
  { label: 'Overview', to: '/overview', icon: LayoutDashboard },
  { label: 'Connections', to: '/connections', icon: ArrowLeftRight },
  { label: 'Channels', to: '/channels', icon: Radio },
  { label: 'Exchanges', to: '/exchanges', icon: Share2 },
  { label: 'Queues & Streams', to: '/queues', icon: Layers },
  { label: 'Administration', to: '/admin', icon: ShieldCheck },
]

interface SidebarProps {
  isCollapsed: boolean
  toggleSidebar: () => void
}

export function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header & Toggle */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-3',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold tracking-tight text-foreground text-sm truncate">
                RabbitDash
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                RabbitMQ 3.13
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
            isCollapsed ? 'h-8 w-8' : 'h-7 w-7'
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            currentPath === item.to ||
            (item.to !== '/overview' && currentPath.startsWith(item.to))

          return (
            <Link
              key={item.to}
              to={item.to}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-md text-sm font-medium transition-colors',
                isCollapsed
                  ? 'h-10 justify-center px-0'
                  : 'gap-3 px-3 py-2',
                isActive
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-4.5 w-4.5 shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Cluster Footer */}
      <div className="p-2">
        {isCollapsed ? (
          <div
            className="flex h-9 w-full items-center justify-center rounded bg-muted/40 text-muted-foreground"
            title="rabbit@cluster-alpha (3 nodes)"
          >
            <Server className="h-4 w-4" />
          </div>
        ) : (
          <div className="rounded-md bg-muted/30 p-2.5 border border-border/60">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-foreground font-medium truncate">
                <Server className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate font-mono text-[11px]">rabbit@cluster-alpha</span>
              </div>
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Up: 14d 6h</span>
              <span className="text-primary font-medium">3 nodes</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
