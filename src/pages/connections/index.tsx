import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowLeftRight, ArrowUpDown, ShieldCheck, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card/index.tsx'
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
import type { RabbitConnection } from '@/models/rabbitmq/index.ts'

const mockConnections: RabbitConnection[] = [
  {
    name: '127.0.0.1:54322 -> 127.0.0.1:5672 (checkout-worker)',
    node: 'rabbit@node-01',
    state: 'running',
    channels: 4,
    user: 'rabbit_prod',
    vhost: '/',
    timeout: 60,
    frame_max: 131072,
    client_properties: {
      platform: 'Node.js v22.2.0',
      product: 'amqplib',
      version: '0.10.4',
    },
    recv_oct: 1845920,
    send_oct: 2940210,
    recv_cnt: 14200,
    send_cnt: 14190,
    connected_at: Date.now() - 3600000 * 4,
  },
  {
    name: '10.0.4.12:48110 -> 127.0.0.1:5672 (billing-service)',
    node: 'rabbit@node-02',
    state: 'running',
    channels: 8,
    user: 'billing_app',
    vhost: '/',
    timeout: 60,
    frame_max: 131072,
    client_properties: {
      platform: 'Java 21 OpenJDK',
      product: 'RabbitMQ Java Client',
      version: '5.20.0',
    },
    recv_oct: 450920,
    send_oct: 120400,
    recv_cnt: 4200,
    send_cnt: 4150,
    connected_at: Date.now() - 3600000 * 12,
  },
  {
    name: '10.0.8.91:39012 -> 127.0.0.1:5672 (audit-logger)',
    node: 'rabbit@node-01',
    state: 'flow',
    channels: 2,
    user: 'audit_svc',
    vhost: '/',
    timeout: 60,
    frame_max: 131072,
    client_properties: {
      platform: 'Go 1.22.4',
      product: 'rabbitmq/amqp091-go',
      version: '1.9.0',
    },
    recv_oct: 984000,
    send_oct: 980200,
    recv_cnt: 8900,
    send_cnt: 8850,
    connected_at: Date.now() - 3600000 * 24,
  },
]

const columnHelper = createColumnHelper<RabbitConnection>()

export function ConnectionsPage() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [search, setSearch] = React.useState('')

  const filteredConnections = React.useMemo(() => {
    return mockConnections.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.user.toLowerCase().includes(search.toLowerCase()) ||
      c.vhost.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Client / Peer Address',
        cell: (info) => (
          <div className="flex flex-col max-w-sm">
            <span className="font-semibold text-foreground truncate font-mono text-xs">{info.getValue()}</span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {info.row.original.client_properties?.product} ({info.row.original.client_properties?.platform})
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('user', {
        header: 'User',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor('vhost', {
        header: 'VHost',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor('state', {
        header: 'State',
        cell: (info) => (
          <Badge variant={info.getValue() === 'running' ? 'success' : 'warning'}>
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('channels', {
        header: 'Channels',
        cell: (info) => <span className="font-mono text-xs font-semibold">{info.getValue()}</span>,
      }),
      columnHelper.accessor('recv_oct', {
        header: 'Network Recv',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {(info.getValue() / 1024 / 1024).toFixed(2)} MB
          </span>
        ),
      }),
      columnHelper.accessor('send_oct', {
        header: 'Network Sent',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {(info.getValue() / 1024 / 1024).toFixed(2)} MB
          </span>
        ),
      }),
      columnHelper.accessor('node', {
        header: 'Node',
        cell: (info) => <span className="font-mono text-[11px] text-muted-foreground">{info.getValue()}</span>,
      }),
    ],
    []
  )

  const table = useReactTable({
    data: filteredConnections,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Connections</h1>
          <p className="text-xs text-muted-foreground">
            Active TCP & AMQP 0-9-1 / AMQP 1.0 client connections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ShieldCheck className="h-4 w-4" /> TLS/SSL Only
          </Button>
          <Button size="sm">
            <ArrowLeftRight className="h-4 w-4" /> Close Stale
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 px-5 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  All Connections
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                    {filteredConnections.length}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Client telemetry, connection state, SSL/TLS security, and frame transmission
                </CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Filter connections by client, host, user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-md border border-border/70 bg-muted/20 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      <div
                        className={header.column.getCanSort() ? 'flex items-center gap-1 cursor-pointer select-none hover:text-foreground' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && <ArrowUpDown className="h-3 w-3 text-muted-foreground/70" />}
                      </div>
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
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-xs">
                    No matching connections found.
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

export default ConnectionsPage
