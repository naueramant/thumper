import { Layers } from 'lucide-react'
import { useVHost } from '@/hooks/useVHost/index.ts'
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown/index.tsx'

export function VHostSelector() {
  const { selectedVHost, setSelectedVHost, availableVHosts } = useVHost()

  const options: DropdownOption<string>[] = availableVHosts.map((v) => ({
    label: v.name,
    value: v.name,
    subLabel: `${v.messages.toLocaleString()} msgs`,
  }))

  return (
    <Dropdown<string>
      value={selectedVHost}
      options={options}
      onChange={setSelectedVHost}
      searchable
      searchPlaceholder="Search vhosts..."
      align="right"
      trigger={
        <div className="flex items-center gap-1.5 font-mono">
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0 font-sans" />
          <span className="text-muted-foreground text-[11px] font-sans">vhost:</span>
          <span className="font-semibold text-primary">{selectedVHost}</span>
        </div>
      }
    />
  )
}

export default VHostSelector
