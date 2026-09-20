import { Dropdown, type DropdownOption } from '@/components/ui/dropdown/index.tsx'
import { useConnectionStatus } from '@/contexts/ConnectionStatusContext.tsx'
import {
  useRefreshInterval,
  REFRESH_OPTIONS,
  type RefreshInterval,
} from '@/hooks/useRefreshInterval/index.ts'
import { cn } from '@/utilities/cn/index.ts'
import { RefreshCw } from 'lucide-react'

export function RefreshSelector() {
  const { intervalMs, setIntervalMs } = useRefreshInterval()
  const { status } = useConnectionStatus()

  const isOffline = status !== 'connected'

  const options: DropdownOption<RefreshInterval>[] = REFRESH_OPTIONS.map((opt) => ({
    label: opt.label,
    value: opt.value,
  }))

  const currentOption = REFRESH_OPTIONS.find((opt) => opt.value === intervalMs)

  return (
    <Dropdown<RefreshInterval>
      value={intervalMs}
      options={options}
      onChange={setIntervalMs}
      align="right"
      trigger={
        <div className="flex items-center gap-1.5">
          <RefreshCw
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              isOffline ? 'text-amber-500 animate-pulse' : 'text-primary'
            )}
          />
          <span className={cn('truncate', isOffline && 'text-amber-600 dark:text-amber-400 font-medium')}>
            {isOffline ? 'Offline' : currentOption?.label || 'Refresh'}
          </span>
        </div>
      }
    />
  )
}

