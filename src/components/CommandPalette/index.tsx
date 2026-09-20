import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Search,
  LayoutDashboard,
  ArrowLeftRight,
  Radio,
  Share2,
  Layers,
  ShieldCheck,
  Server,
  Shovel,
  X,
} from 'lucide-react'
import { useRabbitQueues, useRabbitExchanges, useRabbitOverview, useRabbitShovelPlugin } from '@/hooks/useRabbitMQ/index.ts'
import { useVHost } from '@/hooks/useVHost/index.ts'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  const { data: queues = [] } = useRabbitQueues()
  const { data: exchanges = [] } = useRabbitExchanges()
  const { data: overview } = useRabbitOverview()
  const { data: isShovelEnabled = false } = useRabbitShovelPlugin()
  const { selectedVHost, setSelectedVHost, availableVHosts } = useVHost()

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setActiveIndex(0)
    }
  }, [isOpen])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        } else {
          // Open command palette handled by parent or state
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [query])

  React.useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!isOpen) return null

  const cleanQuery = query.trim().toLowerCase()

  const navItems = [
    { label: 'Overview', to: '/overview', icon: LayoutDashboard, category: 'Navigation' },
    { label: 'Connections', to: '/connections', icon: ArrowLeftRight, category: 'Navigation' },
    { label: 'Channels', to: '/channels', icon: Radio, category: 'Navigation' },
    { label: 'Exchanges', to: '/exchanges', icon: Share2, category: 'Navigation' },
    { label: 'Queues & Streams', to: '/queues', icon: Layers, category: 'Navigation' },
    ...(isShovelEnabled
      ? [{ label: 'Shovels', to: '/shovels', icon: Shovel, category: 'Navigation' }]
      : []),
    { label: 'Administration Hub', to: '/admin', icon: ShieldCheck, category: 'Navigation' },
  ]

  const filteredNav = navItems.filter((i) => i.label.toLowerCase().includes(cleanQuery))

  const filteredQueues = queues
    .filter((q) => q.name.toLowerCase().includes(cleanQuery))
    .slice(0, 5)

  const filteredExchanges = exchanges
    .filter((e) => e.name.toLowerCase().includes(cleanQuery))
    .slice(0, 5)

  const MAX_VHOSTS = 5
  const visibleVHosts = availableVHosts.slice(0, MAX_VHOSTS)
  const hiddenVHostCount = availableVHosts.length - visibleVHosts.length

  const handleSelect = (action: () => void) => {
    action()
    onClose()
  }

  type FlatItem = { key: string; action: () => void }

  const flatItems: FlatItem[] = [
    ...filteredNav.map((item) => ({
      key: `nav:${item.to}`,
      action: () => navigate({ to: item.to }),
    })),
    ...filteredQueues.map((q) => ({
      key: `queue:${q.vhost}:${q.name}`,
      action: () =>
        navigate({
          to: '/queues/$vhost/$name',
          params: { vhost: encodeURIComponent(q.vhost), name: encodeURIComponent(q.name) },
        }),
    })),
    ...filteredExchanges.map((ex) => ({
      key: `exchange:${ex.vhost}:${ex.name}`,
      action: () =>
        navigate({
          to: '/exchanges/$vhost/$name',
          params: { vhost: encodeURIComponent(ex.vhost), name: encodeURIComponent(ex.name || '(default)') },
        }),
    })),
    ...(availableVHosts.length > 0
      ? [
          { key: 'vhost:all', action: () => setSelectedVHost('all') },
          ...visibleVHosts.map((vh) => ({
            key: `vhost:${vh.name}`,
            action: () => setSelectedVHost(vh.name),
          })),
        ]
      : []),
  ]

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[activeIndex]
      if (item) handleSelect(item.action)
    }
  }

  let flatIndex = -1
  const nextIndex = () => {
    flatIndex += 1
    return flatIndex
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 bg-background/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-top-3 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3.5 py-3 border-b border-border bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, queue name, exchange, or search..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-3 text-xs scrollbar-thin">
          {/* Navigation */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Navigation
              </div>
              <div className="space-y-0.5">
                {filteredNav.map((item) => {
                  const Icon = item.icon
                  const idx = nextIndex()
                  const active = idx === activeIndex
                  return (
                    <button
                      key={item.to}
                      ref={(el) => { itemRefs.current[idx] = el }}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelect(() => navigate({ to: item.to }))}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md transition-colors text-left group ${
                        active ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                        <span className={`font-medium ${active ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">Jump &rarr;</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Queues */}
          {filteredQueues.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Queues ({filteredQueues.length})</span>
                <span className="text-[9px]">Scope: {selectedVHost}</span>
              </div>
              <div className="space-y-0.5">
                {filteredQueues.map((q) => {
                  const idx = nextIndex()
                  const active = idx === activeIndex
                  return (
                    <button
                      key={`${q.vhost}:${q.name}`}
                      ref={(el) => { itemRefs.current[idx] = el }}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() =>
                        handleSelect(() =>
                          navigate({
                            to: '/queues/$vhost/$name',
                            params: { vhost: encodeURIComponent(q.vhost), name: encodeURIComponent(q.name) },
                          })
                        )
                      }
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md transition-colors text-left ${
                        active ? 'bg-muted' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-mono font-medium text-foreground">{q.name}</span>
                        <span className="text-[10px] text-muted-foreground">({q.type})</span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {(q.messages ?? 0).toLocaleString()} msgs
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Exchanges */}
          {filteredExchanges.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Exchanges ({filteredExchanges.length})
              </div>
              <div className="space-y-0.5">
                {filteredExchanges.map((ex) => {
                  const rawName = ex.name || '(default)'
                  const idx = nextIndex()
                  const active = idx === activeIndex
                  return (
                    <button
                      key={`${ex.vhost}:${ex.name}`}
                      ref={(el) => { itemRefs.current[idx] = el }}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() =>
                        handleSelect(() =>
                          navigate({
                            to: '/exchanges/$vhost/$name',
                            params: { vhost: encodeURIComponent(ex.vhost), name: encodeURIComponent(rawName) },
                          })
                        )
                      }
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md transition-colors text-left ${
                        active ? 'bg-muted' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="font-mono font-medium text-foreground">{ex.name || '(AMQP default)'}</span>
                        <span className="text-[10px] text-muted-foreground">[{ex.type}]</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">vhost: {ex.vhost}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Virtual Hosts Quick Switch */}
          {availableVHosts.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Switch Virtual Host
              </div>
              <div className="grid grid-cols-2 gap-1 px-1">
                {(() => {
                  const idx = nextIndex()
                  const active = idx === activeIndex
                  return (
                    <button
                      ref={(el) => { itemRefs.current[idx] = el }}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelect(() => setSelectedVHost('all'))}
                      className={`px-2.5 py-1.5 rounded text-left font-mono text-xs border ${
                        selectedVHost === 'all'
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : active
                            ? 'border-border bg-muted'
                            : 'border-border/60 hover:bg-muted'
                      }`}
                    >
                      All VHosts
                    </button>
                  )
                })()}
                {visibleVHosts.map((vh) => {
                  const idx = nextIndex()
                  const active = idx === activeIndex
                  return (
                    <button
                      key={vh.name}
                      ref={(el) => { itemRefs.current[idx] = el }}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelect(() => setSelectedVHost(vh.name))}
                      className={`px-2.5 py-1.5 rounded text-left font-mono text-xs border truncate ${
                        selectedVHost === vh.name
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : active
                            ? 'border-border bg-muted'
                            : 'border-border/60 hover:bg-muted'
                      }`}
                    >
                      {vh.name}
                    </button>
                  )
                })}
              </div>
              {hiddenVHostCount > 0 && (
                <div className="px-2 pt-1 text-[10px] text-muted-foreground">
                  +{hiddenVHostCount} more, refine your search to find them
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-3.5 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px]">{overview?.cluster_name || 'RabbitMQ Cluster'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">ESC</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  )
}

