import * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import { Activity, Lock, User, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth/index.ts'
import { Button } from '@/components/ui/button/index.tsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card/index.tsx'

export function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  const isFormValid = username.trim().length > 0 && password.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return
    setIsLoading(true)

    setTimeout(() => {
      login(username.trim(), password)
      setIsLoading(false)
      router.navigate({ to: '/overview' })
    }, 250)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">RabbitDash</h1>
          <p className="text-xs text-muted-foreground">
            Modern Management Dashboard for RabbitMQ
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter your RabbitMQ credentials to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="h-8 w-full rounded-md border border-border bg-muted/20 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="h-8 w-full rounded-md border border-border bg-muted/20 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full h-8 mt-2 text-xs font-semibold"
              >
                {isLoading ? 'Connecting...' : (
                  <>
                    Sign In <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
