import { LogOut, User, Sun, Moon, Laptop } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth/index.ts'
import { useTheme } from '@/hooks/useTheme/index.ts'
import { DropdownMenu } from '@/components/ui/dropdown/index.tsx'
import { cn } from '@/utilities/cn/index.ts'

export function UserMenu() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => router.navigate({ to: '/login' })}
        className="flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-2.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Sign In</span>
      </button>
    )
  }

  const handleLogout = () => {
    logout()
    router.navigate({ to: '/login' })
  }

  return (
    <DropdownMenu
      align="right"
      contentClassName="w-56"
      trigger={
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{user.username}</span>
        </div>
      }
    >
      {/* Header Info */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground text-xs truncate">{user.username}</span>
            <span className="text-[11px] text-muted-foreground">RabbitMQ User</span>
          </div>
          <span className="shrink-0 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-medium capitalize">
            {user.tags[0] || 'admin'}
          </span>
        </div>
      </div>

      <div className="h-px bg-border/70 my-1" />

      {/* Theme Switcher Section */}
      <div className="px-2 py-1.5" data-keep-open>
        <div className="text-[11px] font-medium text-muted-foreground mb-1.5 px-0.5">
          Appearance
        </div>
        <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted/40 rounded border border-border/60">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={cn(
              'flex items-center justify-center gap-1 rounded py-1 text-[11px] font-medium transition-colors',
              theme === 'light'
                ? 'bg-background text-primary font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sun className="h-3 w-3" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={cn(
              'flex items-center justify-center gap-1 rounded py-1 text-[11px] font-medium transition-colors',
              theme === 'dark'
                ? 'bg-background text-primary font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Moon className="h-3 w-3" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={cn(
              'flex items-center justify-center gap-1 rounded py-1 text-[11px] font-medium transition-colors',
              theme === 'system'
                ? 'bg-background text-primary font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Laptop className="h-3 w-3" />
            <span>Auto</span>
          </button>
        </div>
      </div>

      <div className="h-px bg-border/70 my-1" />

      {/* Logout Action */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors font-medium"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>Sign out</span>
      </button>
    </DropdownMenu>
  )
}

export default UserMenu
