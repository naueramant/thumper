import { useState, useEffect, useCallback } from 'react'

export type RefreshInterval = 5000 | 10000 | 30000 | 0

export const REFRESH_OPTIONS: { label: string; value: RefreshInterval }[] = [
  { label: 'Refresh every 5 seconds', value: 5000 },
  { label: 'Refresh every 10 seconds', value: 10000 },
  { label: 'Refresh every 30 seconds', value: 30000 },
  { label: 'Do not refresh', value: 0 },
]

function formatTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const mins = pad(d.getMinutes())
  const secs = pad(d.getSeconds())
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`
}

export function useRefreshInterval() {
  const [intervalMs, setIntervalMsState] = useState<RefreshInterval>(() => {
    if (typeof window === 'undefined') return 5000
    const saved = localStorage.getItem('rabbitdash-refresh-interval')
    return saved !== null ? (Number(saved) as RefreshInterval) : 5000
  })

  const [lastRefreshed, setLastRefreshed] = useState<string>(formatTimestamp())

  const triggerRefresh = useCallback(() => {
    setLastRefreshed(formatTimestamp())
  }, [])

  const setIntervalMs = (newInterval: RefreshInterval) => {
    setIntervalMsState(newInterval)
    localStorage.setItem('rabbitdash-refresh-interval', newInterval.toString())
    if (newInterval > 0) {
      triggerRefresh()
    }
  }

  useEffect(() => {
    if (intervalMs === 0) return

    const timer = setInterval(() => {
      triggerRefresh()
    }, intervalMs)

    return () => clearInterval(timer)
  }, [intervalMs, triggerRefresh])

  return {
    intervalMs,
    setIntervalMs,
    lastRefreshed,
    triggerRefresh,
  }
}

export default useRefreshInterval
