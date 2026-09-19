import { useNavigate } from '@tanstack/react-router'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth/index.ts'
import { Button } from '@/components/ui/button/index.tsx'

interface UnauthorizedProps {
  /** The role(s) required to access this page */
  requiredRoles?: string[]
}

export function Unauthorized({ requiredRoles = ['administrator', 'policymaker'] }: UnauthorizedProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
        <ShieldOff className="h-8 w-8 text-destructive" />
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          You don't have permission to access this section. This area requires one of the following roles:
        </p>
      </div>

      {/* Required roles */}
      <div className="flex items-center gap-2">
        {requiredRoles.map((role) => (
          <span
            key={role}
            className="px-2.5 py-1 rounded-md bg-muted border border-border text-xs font-mono font-semibold text-foreground"
          >
            {role}
          </span>
        ))}
      </div>

      {/* Current user tags */}
      {user?.tags && user.tags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground">
            Your current role{user.tags.length > 1 ? 's' : ''}:
          </p>
          <div className="flex items-center gap-2 justify-center flex-wrap">
            {user.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-xs font-mono text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Back button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate({ to: '/overview' })}
        className="h-8 text-xs gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Go to Overview
      </Button>
    </div>
  )
}

