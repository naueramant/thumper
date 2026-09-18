import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { Share2, Plus, ArrowUpDown, Search } from 'lucide-react'
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

interface ExchangeItem {
  name: string
  vhost: string
  type: 'direct' | 'fanout' | 'topic' | 'headers'
  durable: boolean
  auto_delete: boolean
  internal: boolean
  bindings_count: number
  publish_in_rate: number
  publish_out_rate: number
}

const mockExchanges: ExchangeItem[] = [
  {
    name: '(AMQP default)',
    vhost: '/',
    type: 'direct',
    durable: true,
    auto_delete: false,
    internal: false,
    bindings_count: 24,
    publish_in_rate: 640.2,
    publish_out_rate: 640.2,
  },
  {
    name: 'amq.direct',
    vhost: '/',
    type: 'direct',
    durable: true,
    auto_delete: false,
    internal: false,
    bindings_count: 8,
    publish_in_rate: 120.0,
    publish_out_rate: 118.5,
  },
  {
    name: 'amq.fanout',
    vhost: '/',
    type: 'fanout',
    durable: true,
    auto_delete: false,
    internal: false,
    bindings_count: 3,
    publish_in_rate: 45.0,
    publish_out_rate: 135.0,
  },
  {
    name: 'amq.topic',
    vhost: '/',
    type: 'topic',
    durable: true,
    auto_delete: false,
    internal: false,
    bindings_count: 14,
    publish_in_rate: 410.5,
    publish_out_rate: 890.0,
  },
  {
    name: 'amq.headers',
    vhost: '/',
    type: 'headers',
    durable: true,
    auto_delete: false,
    internal: false,
    bindings_count: 1,
    publish_in_rate: 0.0,
    publish_out_rate: 0.0,
  },
  {
    name: 'orders.events',
    vhost: '/',
    type: 'topic',
    durable: true,
    auto_delete: false,
    internal: false,
    bindings_count: 6,
    publish_in_rate: 224.8,
    publish_out_rate: 449.6,
  },
]

const columnHelper = createColumnHelper<ExchangeItem>()

export function ExchangesPage() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [search, setSearch] = React.useState('')

  const filteredExchanges = React.useMemo(() => {
    return mockExchanges.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.type.toLowerCase().includes(search.toLowerCase()) ||
      e.vhost.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Exchange Name',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground font-mono text-xs">{info.getValue()}</span>
            <span className="text-[11px] text-muted-foreground">vhost: {info.row.original.vhost}</span>
          </div>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => (
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('durable', {
        header: 'Features',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                {row.durable ? 'D' : 'T'}
              </Badge>
              {row.internal && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                  I
                </Badge>
              )}
              {row.auto_delete && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0 font-mono">
                  AD
                </Badge>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor('bindings_count', {
        header: 'Bindings',
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('publish_in_rate', {
        header: 'Msg In /s',
        cell: (info) => (
          <span className="font-mono text-xs text-primary font-medium">
            {info.getValue().toFixed(1)}/s
          </span>
        ),
      }),
      columnHelper.accessor('publish_out_rate', {
        header: 'Msg Out /s',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue().toFixed(1)}/s
          </span>
        ),
      }),
    ],
    []
  )

  const table = useReactTable({
    data: filteredExchanges,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Exchanges</h1>
          <p className="text-xs text-muted-foreground">
            Message routing exchanges, topology mappings, and published rates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Exchange
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 px-5 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Share2 className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  All Exchanges
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                    {filteredExchanges.length}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Active routing exchanges, message distribution, and consumer bindings
                </CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Filter exchanges by name, type..."
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
                    No matching exchanges found.
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

export default ExchangesPage
