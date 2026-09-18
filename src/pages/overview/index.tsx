import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Zap,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card/index.tsx'
import { MetricCard } from '@/components/MetricCard/index.tsx'
import { Badge } from '@/components/ui/badge/index.tsx'
import { Button } from '@/components/ui/button/index.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table/index.tsx'
import { useRabbitOverview, useRabbitQueues } from '@/hooks/useRabbitMQ/index.ts'
import type { RabbitQueue } from '@/models/rabbitmq/index.ts'

// Mock 12-point timeseries for ingress/egress chart
const telemetryChartData = [
  { time: '19:45', ingress: 820, egress: 790, depth: 1200 },
  { time: '19:46', ingress: 940, egress: 910, depth: 1230 },
  { time: '19:47', ingress: 1100, egress: 1050, depth: 1280 },
  { time: '19:48', ingress: 1350, egress: 1290, depth: 1340 },
  { time: '19:49', ingress: 1240, egress: 1200, depth: 1380 },
  { time: '19:50', ingress: 1420, egress: 1390, depth: 1410 },
  { time: '19:51', ingress: 1560, egress: 1490, depth: 1480 },
  { time: '19:52', ingress: 1380, egress: 1410, depth: 1450 },
  { time: '19:53', ingress: 1290, egress: 1300, depth: 1440 },
  { time: '19:54', ingress: 1450, egress: 1420, depth: 1470 },
  { time: '19:55', ingress: 1620, egress: 1580, depth: 1510 },
  { time: '19:56', ingress: 1540, egress: 1510, depth: 1540 },
]

const columnHelper = createColumnHelper<RabbitQueue>()

export function OverviewPage() {
  const { data: overview } = useRabbitOverview()
  const { data: queues = [] } = useRabbitQueues()
  const [sorting, setSorting] = React.useState<SortingState>([])

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Queue Name',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{info.getValue()}</span>
            <span className="text-[11px] text-muted-foreground">vhost: {info.row.original.vhost}</span>
          </div>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => {
          const type = info.getValue()
          return (
            <Badge variant="outline" className="font-mono text-[11px] uppercase">
              {type}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('state', {
        header: 'State',
        cell: (info) => {
          const state = info.getValue()
          return (
            <Badge
              variant={state === 'running' ? 'success' : 'warning'}
              className="text-[11px] capitalize"
            >
              {state}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('messages_ready', {
        header: 'Ready',
        cell: (info) => (
          <span className="font-mono font-medium">{info.getValue().toLocaleString()}</span>
        ),
      }),
      columnHelper.accessor('messages_unacknowledged', {
        header: 'Unacked',
        cell: (info) => {
          const val = info.getValue()
          return (
            <span className={`font-mono ${val > 0 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
              {val.toLocaleString()}
            </span>
          )
        },
      }),
      columnHelper.accessor('consumers', {
        header: 'Consumers',
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('message_stats.publish_details.rate', {
        id: 'publishRate',
        header: 'Pub Rate /s',
        cell: (info) => {
          const rate = info.getValue() ?? 0
          return <span className="font-mono text-xs text-primary">{rate.toFixed(1)}/s</span>
        },
      }),
      columnHelper.accessor('node', {
        header: 'Node',
        cell: (info) => (
          <span className="font-mono text-[11px] text-muted-foreground">{info.getValue()}</span>
        ),
      }),
    ],
    []
  )

  const table = useReactTable({
    data: queues,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cluster Overview</h1>
          <p className="text-sm text-muted-foreground">
            Real-time telemetry and throughput for <strong className="text-primary">{overview?.cluster_name}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Export Metrics</Button>
          <Button size="sm">Broker Definitions</Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Queued Messages"
          value={overview?.queue_totals?.messages?.toLocaleString() ?? '3,092'}
          subValue={`${overview?.queue_totals?.messages_ready ?? 2840} ready • ${overview?.queue_totals?.messages_unacknowledged ?? 252} unacked`}
          rate="+4.2%"
          trend="up"
          icon={<Layers className="h-5 w-5" />}
        />
        <MetricCard
          title="Publish Velocity"
          value={`${overview?.message_stats?.publish_details?.rate?.toFixed(1) ?? '1,240.5'} /s`}
          subValue="248,192 messages total"
          rate="High Throughput"
          trend="up"
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <MetricCard
          title="Delivery / Ack Rate"
          value={`${overview?.message_stats?.deliver_get_details?.rate?.toFixed(1) ?? '1,198.2'} /s`}
          subValue="Consuming in real-time"
          rate="Balanced"
          trend="neutral"
          icon={<ArrowDownRight className="h-5 w-5" />}
        />
        <MetricCard
          title="Active Topology"
          value={`${overview?.object_totals?.queues ?? 24} Queues`}
          subValue={`${overview?.object_totals?.connections ?? 48} Conns • ${overview?.object_totals?.channels ?? 112} Chans`}
          rate="Healthy"
          trend="neutral"
          icon={<Zap className="h-5 w-5" />}
        />
      </div>

      {/* Throughput Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Message Ingress & Egress Rates</CardTitle>
              <CardDescription>Published vs Delivered message rates (msg/sec)</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Publish Rate
              </span>
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/60" /> Deliver Rate
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ingressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary, #ea6a28)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-primary, #ea6a28)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="egressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={12} stroke="#888888" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#888888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card, #1c1d22)',
                    borderColor: 'var(--color-border, #2e3039)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-foreground, #ffffff)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ingress"
                  name="Publish Rate"
                  stroke="var(--color-primary, #ea6a28)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#ingressGradient)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="egress"
                  name="Deliver Rate"
                  stroke="#a1a1aa"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#egressGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* TanStack Table: Active Queues DataGrid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Monitored Queues (TanStack Table)</CardTitle>
              <CardDescription>Top active queues sorted by volume and consumer readiness</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All Queues</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'flex items-center gap-1 cursor-pointer select-none hover:text-foreground'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground/70" />
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No queues available in vhost.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default OverviewPage
