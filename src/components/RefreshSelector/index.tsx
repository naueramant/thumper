import { RefreshCw } from 'lucide-react'
import {
  useRefreshInterval,
  REFRESH_OPTIONS,
  type RefreshInterval,
} from '@/hooks/useRefreshInterval/index.ts'
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown/index.tsx'

export function RefreshSelector() {
  const { intervalMs, setIntervalMs } = useRefreshInterval()

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
          <RefreshCw className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{currentOption?.label || 'Refresh'}</span>
        </div>
      }
    />
  )
}

export default RefreshSelector
