import { useState, useEffect } from 'react'

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('rabbitdash-sidebar-collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('rabbitdash-sidebar-collapsed', isCollapsed ? 'true' : 'false')
  }, [isCollapsed])

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev)
  }

  return {
    isCollapsed,
    setIsCollapsed,
    toggleSidebar,
  }
}

