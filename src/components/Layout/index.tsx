import { Outlet } from '@tanstack/react-router'
import { Sidebar } from '@/components/Sidebar/index.tsx'
import { Header } from '@/components/Header/index.tsx'
import { useSidebar } from '@/hooks/useSidebar/index.ts'
import { cn } from '@/utilities/cn/index.ts'

export function Layout() {
  const { isCollapsed, toggleSidebar } = useSidebar()

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex flex-1 flex-col min-w-0 transition-[padding] duration-200 ease-in-out',
          isCollapsed ? 'pl-16' : 'pl-64'
        )}
      >
        <Header />
        <main className="flex-1 p-5 md:p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
