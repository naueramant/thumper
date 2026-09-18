import { Search } from 'lucide-react'
import { VHostSelector } from '@/components/VHostSelector/index.tsx'
import { RefreshSelector } from '@/components/RefreshSelector/index.tsx'
import { UserMenu } from '@/components/UserMenu/index.tsx'

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur-xs">
      {/* Left: Command Search */}
      <div className="flex items-center flex-1 max-w-xs sm:max-w-sm">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search resources... (⌘K)"
            className="h-8 w-full rounded-md border border-border/70 bg-muted/20 pl-8 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
          <kbd className="absolute right-2 hidden sm:inline-flex h-4 items-center rounded border border-border/60 bg-muted/40 px-1 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Clean Toolbar (VHost + Refresh Interval + User Profile) */}
      <div className="flex items-center gap-2">
        <VHostSelector />
        <RefreshSelector />
        <UserMenu />
      </div>
    </header>
  )
}

export default Header
