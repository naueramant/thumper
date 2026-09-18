import * as React from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import { cn } from '@/utilities/cn/index.ts'

export interface DropdownOption<T = string | number> {
  label: string
  value: T
  subLabel?: string
  icon?: React.ReactNode
}

export interface DropdownProps<T = string | number> {
  trigger?: React.ReactNode
  value?: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  searchable?: boolean
  searchPlaceholder?: string
  align?: 'left' | 'right'
  className?: string
  contentClassName?: string
  width?: string
}

export function Dropdown<T = string | number>({
  trigger,
  value,
  options,
  onChange,
  searchable = false,
  searchPlaceholder = 'Search...',
  align = 'right',
  className,
  contentClassName,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !search.trim()) return options
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
    )
  }, [options, searchable, search])

  const selectedOption = options.find((opt) => opt.value === value)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 0)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isOpen])

  return (
    <div className={cn('relative inline-block', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-2.5 text-xs text-foreground transition-colors hover:bg-muted/50 hover:border-border focus:outline-none focus:ring-1 focus:ring-primary',
          isOpen && 'border-primary bg-muted/50 ring-1 ring-primary'
        )}
      >
        {trigger ? (
          trigger
        ) : (
          <div className="flex items-center gap-1.5">
            {selectedOption?.icon}
            <span className="font-medium truncate">{selectedOption?.label}</span>
          </div>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute top-9 z-50 min-w-44 rounded-md border border-border bg-card p-1 text-foreground animate-in fade-in-50 zoom-in-95',
            align === 'right' ? 'right-0' : 'left-0',
            contentClassName
          )}
        >
          {searchable && (
            <div className="relative mb-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="h-7 w-full rounded border border-border/80 bg-muted/30 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/80',
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground font-mono">
                      {opt.subLabel && <span>{opt.subLabel}</span>}
                      {isSelected && <Check className="h-3 w-3 text-primary ml-1" />}
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="p-2 text-center text-xs text-muted-foreground">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
  contentClassName?: string
}

export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  className,
  contentClassName,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 0)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [isOpen])

  return (
    <div className={cn('relative inline-block', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-2.5 text-xs text-foreground transition-colors hover:bg-muted/50 hover:border-border focus:outline-none focus:ring-1 focus:ring-primary',
          isOpen && 'border-primary bg-muted/50 ring-1 ring-primary'
        )}
      >
        {trigger}
        <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5 shrink-0" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => {
            // Close when clicking an action item, unless it has data-keep-open
            if (!(e.target as HTMLElement).closest('[data-keep-open]')) {
              setIsOpen(false)
            }
          }}
          className={cn(
            'absolute top-9 z-50 rounded-md border border-border bg-card p-1 text-foreground animate-in fade-in-50 zoom-in-95',
            align === 'right' ? 'right-0' : 'left-0',
            contentClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default Dropdown
