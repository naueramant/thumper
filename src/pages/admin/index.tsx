import { ShieldCheck, Users, Layers, Sliders, HardDrive, Flag } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card/index.tsx'
import { Badge } from '@/components/ui/badge/index.tsx'

const adminSections = [
  {
    title: 'Users & Permissions',
    desc: 'Manage internal broker users, password hashes, and vhost permissions',
    icon: Users,
    count: '3 active users',
  },
  {
    title: 'Virtual Hosts',
    desc: 'Multi-tenant broker sandboxes, default queue types, and tracing',
    icon: Layers,
    count: '1 vhost (/)',
  },
  {
    title: 'Policies & HA',
    desc: 'High availability rules, Dead Letter Exchanges, and TTL definitions',
    icon: Sliders,
    count: '2 active policies',
  },
  {
    title: 'Cluster Limits',
    desc: 'Connection quotas, queue count limits, and memory thresholds',
    icon: HardDrive,
    count: 'Standard limits',
  },
  {
    title: 'Feature Flags',
    desc: 'Manage cluster-wide feature flags for seamless node upgrades',
    icon: Flag,
    count: '12 enabled flags',
  },
]

export function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Administration Hub</h1>
        <p className="text-sm text-muted-foreground">
          Configure users, virtual hosts, cluster limits, and security policies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminSections.map((sec) => {
          const Icon = sec.icon
          return (
            <Card key={sec.title} className="hover:border-primary/40 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[11px] font-mono">{sec.count}</Badge>
                </div>
                <CardTitle className="text-base mt-2">{sec.title}</CardTitle>
                <CardDescription>{sec.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Configure settings &rarr;</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default AdminPage
