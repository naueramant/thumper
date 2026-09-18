import * as React from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { Radio, ArrowUpDown, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card/index.tsx'
import { Badge } from '@/components/ui/badge/index.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table/index.tsx'

interface ChannelItem {
  name: string
  user: string
  vhost: string
  number: number
  state: 'running' | 'flow'
  mode: 'confirm' | 'standard'
  unconfirmed: number
  prefetch_count: number
  unacknowledged: number
  consumer_count: number
}

const mockChannels: ChannelItem[] = [
  {
    name: '127.0.0.1:54322 -> 127.0.0.1:5672 (1)',
    user: 'rabbit_prod',
    vhost: '/',
    number: 1,
    state: 'running',
    mode: 'confirm',
    unconfirmed: 0,
    prefetch_count: 50,
    unacknowledged: 14,
    consumer_count: 4,
  },
  {
    name: '127.0.0.1:54322 -> 127.0.0.1:5672 (2)',
    user: 'rabbit_prod',
    vhost: '/',
    number: 2,
    state: 'running',
    mode: 'confirm',
    unconfirmed: 2,
    prefetch_count: 100,
    unacknowledged: 26,
    consumer_count: 8,
  },
  {
    name: '10.0.4.12:48110 -> 127.0.0.1:5672 (1)',
    user: 'billing_app',
    vhost: '/',
    number: 1,
    state: 'running',
    mode: 'confirm',
    unconfirmed: 0,
    prefetch_count: 20,
    unacknowledged: 5,
    consumer_count: 2,
  },
  {
    name: '10.0.8.91:39012 -> 127.0.0.1:5672 (1)',
    user: 'audit_svc',
    vhost: '/',
    number: 1,
    state: 'flow',
    mode: 'standard',
    unconfirmed: 0,
    prefetch_count: 0,
    unacknowledged: 0,
    consumer_count: 1,
  },
]

const columnHelper = createColumnHelper<ChannelItem>()

export function ChannelsPage() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [search, setSearch] = React.useState('')

  const filteredChannels = React.useMemo(() => {
    return mockChannels.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.user.toLowerCase().includes(search.toLowerCase()) ||
      c.vhost.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Channel Name',
        cell: (info) => (
          <div className="flex flex-col max-w-sm">
            <span className="font-semibold text-foreground font-mono text-xs truncate">{info.getValue()}</span>
            <span className="text-[11px] text-muted-foreground">channel #{info.row.original.number}</span>
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
      columnHelper.accessor('mode', {
        header: 'Mode',
        cell: (info) => (
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor('prefetch_count', {
        header: 'Prefetch',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor('unacknowledged', {
        header: 'Unacked',
        cell: (info) => {
          const val = info.getValue()
          return (
            <span className={`font-mono text-xs ${val > 0 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
              {val}
            </span>
          )
        },
      }),
      columnHelper.accessor('unconfirmed', {
        header: 'Unconfirmed',
        cell: (info) => {
          const val = info.getValue()
          return (
            <span className={`font-mono text-xs ${val > 0 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
              {val}
            </span>
          )
        },
      }),
      columnHelper.accessor('consumer_count', {
        header: 'Consumers',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
    ],
    []
  )

  const table = useReactTable({
    data: filteredChannels,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Channels</h1>
          <p className="text-xs text-muted-foreground">
            Active multiplexed AMQP sessions, flow control, and prefetch limits
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 px-5 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Radio className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  All Channels
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                    {filteredChannels.length}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Channel status, consumer acknowledgments, and unconfirmed message trackers
                </CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Filter channels by name, user..."
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
                    No matching channels found.
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

export default ChannelsPage
