// Re-exports the shared VHost context as a hook for backward-compatible usage.
// All callers get the same selectedVHost state, fixed from the previous per-component useState pattern.
export type { VHostSummary } from '@/contexts/VHostContext.tsx'
export { useVHostContext as useVHost } from '@/contexts/VHostContext.tsx'
export default function noop() {}
