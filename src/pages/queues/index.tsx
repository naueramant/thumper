import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { Layers, Plus, ArrowUpDown, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card/index.tsx'
import { Button } from '@/components/ui/button/index.tsx'
import { Badge } from '@/components/ui/badge/index.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table/index.tsx'
import { useRabbitQueues } from '@/hooks/useRabbitMQ/index.ts'
import type { RabbitQueue } from '@/models/rabbitmq/index.ts'

const columnHelper = createColumnHelper<RabbitQueue>()

export function QueuesPage() {
  const { data: queues = [] } = useRabbitQueues()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [search, setSearch] = React.useState('')

  const filteredQueues = React.useMemo(() => {
    return queues.filter((q) =>
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.vhost.toLowerCase().includes(search.toLowerCase()) ||
      q.type.toLowerCase().includes(search.toLowerCase())
    )
  }, [queues, search])

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Queue Name',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground font-mono text-xs">{info.getValue()}</span>
            <span className="text-[11px] text-muted-foreground">vhost: {info.row.original.vhost}</span>
          </div>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => {
          const type = info.getValue()
          return (
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {type}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('state', {
        header: 'State',
        cell: (info) => (
          <Badge
            variant={info.getValue() === 'running' ? 'success' : 'warning'}
            className="text-[11px] capitalize"
          >
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('messages_ready', {
        header: 'Ready',
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {info.getValue().toLocaleString()}
          </span>
        ),
      }),
      columnHelper.accessor('messages_unacknowledged', {
        header: 'Unacked',
        cell: (info) => {
          const val = info.getValue()
          return (
            <span className={`font-mono text-xs ${val > 0 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
              {val.toLocaleString()}
            </span>
          )
        },
      }),
      columnHelper.accessor('messages', {
        header: 'Total',
        cell: (info) => (
          <span className="font-mono text-xs font-medium">{info.getValue().toLocaleString()}</span>
        ),
      }),
      columnHelper.accessor('consumers', {
        header: 'Consumers',
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('message_stats.publish_details.rate', {
        id: 'pubRate',
        header: 'Pub Rate',
        cell: (info) => (
          <span className="font-mono text-xs text-primary">
            {(info.getValue() ?? 0).toFixed(1)}/s
          </span>
        ),
      }),
      columnHelper.accessor('message_stats.deliver_get_details.rate', {
        id: 'deliverRate',
        header: 'Deliver Rate',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {(info.getValue() ?? 0).toFixed(1)}/s
          </span>
        ),
      }),
      columnHelper.accessor('memory', {
        header: 'Memory',
        cell: (info) => (
          <span className="font-mono text-[11px] text-muted-foreground">
            {(info.getValue() / 1024 / 1024).toFixed(1)} MB
          </span>
        ),
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
    data: filteredQueues,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Queues & Streams</h1>
          <p className="text-xs text-muted-foreground">
            Classic queues, Quorum replicated sets, and RabbitMQ Streams in active virtual host
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Queue
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 px-5 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  All Queues
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                    {filteredQueues.length}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Queue depth, message rates, consumer status and replication health
                </CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Filter queues by name, vhost, type..."
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
                    No matching queues found.
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

export default QueuesPage
