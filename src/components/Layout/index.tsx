import { ConnectionStatusBanner } from '@/components/ConnectionStatusBanner/index.tsx'
import { Header } from '@/components/Header/index.tsx'
import { Sidebar } from '@/components/Sidebar/index.tsx'
import { useSidebar } from '@/hooks/useSidebar/index.ts'
import { cn } from '@/utilities/cn/index.ts'
import { Outlet } from '@tanstack/react-router'

export function Layout() {
  const { isCollapsed, toggleSidebar } = useSidebar()

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex flex-1 flex-col min-w-0 transition-[padding] duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
          isCollapsed ? 'pl-16' : 'pl-56'
        )}
      >
        <Header />
        <ConnectionStatusBanner />
        <main className="flex-1 p-5 md:p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

