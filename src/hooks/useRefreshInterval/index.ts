// Re-exports the shared RefreshInterval context as a hook for backward-compatible usage.
// Previously each caller created its own setInterval — now there is only one global timer.
// lastRefreshed and triggerRefresh have been removed from the public API; React Query's
// own refetchInterval handles polling and does not need a separate timestamp counter.
export type { RefreshInterval } from '@/contexts/RefreshIntervalContext.tsx'
export { REFRESH_OPTIONS } from '@/contexts/RefreshIntervalContext.tsx'
export { useRefreshIntervalContext as useRefreshInterval } from '@/contexts/RefreshIntervalContext.tsx'
export default function noop() {}
