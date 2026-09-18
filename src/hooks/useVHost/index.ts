import { useState } from 'react'

export const DEFAULT_VHOSTS = [
  { name: '/', messages: 3092, tracing: false },
  { name: 'orders', messages: 420, tracing: false },
  { name: 'payments', messages: 85, tracing: true },
  { name: 'telemetry', messages: 12500, tracing: false },
  { name: 'notifications', messages: 12, tracing: false },
]

export function useVHost() {
  const [selectedVHost, setSelectedVHostState] = useState<string>(() => {
    if (typeof window === 'undefined') return '/'
    return localStorage.getItem('rabbitdash-vhost') || '/'
  })

  const [availableVHosts] = useState(DEFAULT_VHOSTS)

  const setSelectedVHost = (vhost: string) => {
    setSelectedVHostState(vhost)
    localStorage.setItem('rabbitdash-vhost', vhost)
  }

  return {
    selectedVHost,
    setSelectedVHost,
    availableVHosts,
  }
}

export default useVHost
