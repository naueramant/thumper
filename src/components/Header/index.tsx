import * as React from 'react'
import { Search } from 'lucide-react'
import { VHostSelector } from '@/components/VHostSelector/index.tsx'
import { RefreshSelector } from '@/components/RefreshSelector/index.tsx'
import { UserMenu } from '@/components/UserMenu/index.tsx'
import { CommandPalette } from '@/components/CommandPalette/index.tsx'

export function Header() {
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur-xs">
        {/* Left: Command Search Button / Trigger */}
        <div className="flex items-center flex-1 max-w-xs sm:max-w-sm">
          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="relative flex items-center w-full h-8 rounded-md border border-border/70 bg-muted/20 pl-8 pr-14 text-xs text-muted-foreground hover:border-primary/50 focus:outline-none transition-colors text-left"
          >
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <span>Search resources...</span>
            <kbd className="absolute right-2 hidden sm:inline-flex h-4 items-center rounded border border-border/60 bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Clean Toolbar (VHost + Refresh Interval + User Profile) */}
        <div className="flex items-center gap-2">
          <VHostSelector />
          <RefreshSelector />
          <UserMenu />
        </div>
      </header>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  )
}

