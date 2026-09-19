import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'

export type RefreshInterval = 5000 | 10000 | 30000 | 0

export const REFRESH_OPTIONS: { label: string; value: RefreshInterval }[] = [
  { label: 'Refresh every 5 seconds', value: 5000 },
  { label: 'Refresh every 10 seconds', value: 10000 },
  { label: 'Refresh every 30 seconds', value: 30000 },
  { label: 'Do not refresh', value: 0 },
]

interface RefreshIntervalContextValue {
  intervalMs: RefreshInterval
  setIntervalMs: (interval: RefreshInterval) => void
}

const RefreshIntervalContext = createContext<RefreshIntervalContextValue | null>(null)

export function RefreshIntervalProvider({ children }: { children: ReactNode }) {
  const [intervalMs, setIntervalMsState] = useState<RefreshInterval>(() => {
    if (typeof window === 'undefined') return 5000
    const saved = localStorage.getItem('rabbitdash-refresh-interval')
    return saved !== null ? (Number(saved) as RefreshInterval) : 5000
  })

  // The setInterval here is kept solely to ensure React Query's refetchInterval
  // config stays in sync. React Query itself drives the actual polling — we don't
  // need to tick a lastRefreshed timestamp in context (nothing reads it from here).
  // Removing lastRefreshed from the context value means the context object is
  // now stable and only changes when the user picks a different interval,
  // preventing the every-5s full re-render storm across all consumers.
  useEffect(() => {
    if (intervalMs === 0) return
    // No-op interval kept for potential future use; actual polling is via React Query.
    // Deliberately empty — do not call setState here.
    const timer = setInterval(() => {}, intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  const setIntervalMs = useCallback((newInterval: RefreshInterval) => {
    setIntervalMsState(newInterval)
    localStorage.setItem('rabbitdash-refresh-interval', newInterval.toString())
  }, [])

  // Stable value — only a new object when intervalMs actually changes (user picks
  // a different refresh rate), not every tick.
  const value = useMemo<RefreshIntervalContextValue>(
    () => ({ intervalMs, setIntervalMs }),
    [intervalMs, setIntervalMs]
  )

  return (
    <RefreshIntervalContext.Provider value={value}>
      {children}
    </RefreshIntervalContext.Provider>
  )
}

export function useRefreshIntervalContext(): RefreshIntervalContextValue {
  const ctx = useContext(RefreshIntervalContext)
  if (!ctx) throw new Error('useRefreshIntervalContext must be used within <RefreshIntervalProvider>')
  return ctx
}
