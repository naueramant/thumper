import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'

interface JsonTreeViewerProps {
  data: any
  initialExpandDepth?: number
  searchQuery?: string
}

interface TreeNodeProps {
  name?: string
  value: any
  depth: number
  maxDepth: number
  searchQuery?: string
}

const TreeNode: React.FC<TreeNodeProps> = ({ name, value, depth, maxDepth, searchQuery }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < maxDepth)
  const [copied, setCopied] = useState<boolean>(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const textToCopy = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Type identification
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value)
  const isArray = Array.isArray(value)
  const isContainer = isObject || isArray

  // Search filter
  const q = searchQuery?.toLowerCase() || ''
  const matchesSearch =
    q &&
    ((name && name.toLowerCase().includes(q)) ||
      (!isContainer && String(value).toLowerCase().includes(q)))

  const renderValue = () => {
    if (value === null) {
      return <span className="text-rose-700 dark:text-rose-400 italic">null</span>
    }
    if (typeof value === 'boolean') {
      return <span className="text-purple-700 dark:text-purple-400 font-bold">{value ? 'true' : 'false'}</span>
    }
    if (typeof value === 'number') {
      return <span className="text-amber-700 dark:text-amber-400">{value}</span>
    }
    if (typeof value === 'string') {
      return <span className="text-emerald-700 dark:text-emerald-400">"{value}"</span>
    }
    return <span className="text-foreground">{String(value)}</span>
  }

  if (isContainer) {
    const keys = Object.keys(value)
    const itemCount = keys.length

    return (
      <div className="text-xs font-mono select-text">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded cursor-pointer group hover:bg-muted/30 ${
            matchesSearch ? 'bg-yellow-400/20' : ''
          }`}
        >
          <span className="text-muted-foreground w-4 h-4 flex items-center justify-center flex-shrink-0">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>

          {name !== undefined && (
            <span className="text-sky-700 dark:text-sky-400 font-semibold">{name}:</span>
          )}

          <span className="text-muted-foreground">
            {isArray ? `Array[${itemCount}]` : `{${itemCount} keys}`}
          </span>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto transition-opacity">
            <button
              onClick={handleCopy}
              title="Copy value"
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="pl-4 ml-1.5 border-l border-border/40 space-y-0.5">
            {keys.map((key) => (
              <TreeNode
                key={key}
                name={isArray ? undefined : key}
                value={value[key]}
                depth={depth + 1}
                maxDepth={maxDepth}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-1.5 py-0.5 px-1.5 text-xs font-mono rounded group hover:bg-muted/30 ${
        matchesSearch ? 'bg-yellow-400/20' : ''
      }`}
    >
      <span className="w-4 flex-shrink-0" />
      {name !== undefined && (
        <span className="text-sky-700 dark:text-sky-400 font-semibold">{name}:</span>
      )}
      <span className="break-all">{renderValue()}</span>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto transition-opacity">
        <button
          onClick={handleCopy}
          title="Copy value"
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    </div>
  )
}

export const JsonTreeViewer: React.FC<JsonTreeViewerProps> = ({
  data,
  initialExpandDepth = 2,
  searchQuery,
}) => {
  const [expandAllKey, setExpandAllKey] = useState<number>(0)
  const [maxDepth, setMaxDepth] = useState<number>(initialExpandDepth)

  const handleExpandAll = () => {
    setMaxDepth(99)
    setExpandAllKey((prev) => prev + 1)
  }

  const handleCollapseAll = () => {
    setMaxDepth(0)
    setExpandAllKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2 pb-1 border-b border-border/40 text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={handleExpandAll}
          className="hover:text-foreground hover:underline"
        >
          Expand All
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={handleCollapseAll}
          className="hover:text-foreground hover:underline"
        >
          Collapse All
        </button>
      </div>

      <div key={expandAllKey} className="overflow-x-auto select-text">
        <TreeNode
          value={data}
          depth={0}
          maxDepth={maxDepth}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  )
}
