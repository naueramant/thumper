import React from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Share2, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ExchangeFlowNode } from './types'

export const ExchangeNode: React.FC<NodeProps<ExchangeFlowNode>> = ({ data }) => {
  const isDefault = !data.name || data.name === '(default)'
  const displayName = isDefault ? '(default)' : data.name

  const getTypeBadgeClass = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'direct':
        return 'border-sky-500/40 dark:text-sky-400 text-sky-700 dark:bg-sky-500/10 bg-sky-50'
      case 'topic':
        return 'border-purple-500/40 dark:text-purple-400 text-purple-700 dark:bg-purple-500/10 bg-purple-50'
      case 'fanout':
        return 'border-emerald-500/40 dark:text-emerald-400 text-emerald-700 dark:bg-emerald-500/10 bg-emerald-50'
      case 'headers':
        return 'border-amber-500/40 dark:text-amber-400 text-amber-700 dark:bg-amber-500/10 bg-amber-50'
      default:
        return 'border-border text-muted-foreground bg-muted/30'
    }
  }

  return (
    <div
      onClick={data.onClick}
      className={`relative min-w-[210px] max-w-[260px] rounded-xl border bg-card p-3 shadow-md transition-all hover:border-primary/80 group cursor-pointer ${
        data.isFocal
          ? 'border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/10'
          : 'border-border hover:shadow-lg hover:shadow-primary/5'
      }`}
    >
      {/* Upstream target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-card hover:!scale-125 transition-transform"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2 truncate">
          <div className="p-1 rounded-md dark:bg-sky-500/10 bg-sky-50 dark:text-sky-400 text-sky-700 border dark:border-sky-500/20 border-sky-200">
            <Share2 className="w-3.5 h-3.5" />
          </div>
          <span
            className="font-mono text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors"
            title={displayName}
          >
            {displayName}
          </span>
        </div>
        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {/* Details & Tags */}
      <div className="pt-2 space-y-1.5 text-[11px] font-mono">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={`text-[9px] uppercase px-1.5 py-0 font-mono font-bold ${getTypeBadgeClass(
              data.type
            )}`}
          >
            {data.type || 'direct'}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {data.durable ? 'Durable' : 'Transient'}
          </span>
        </div>

        {(data.ingressRate !== undefined || data.egressRate !== undefined) && (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
            <span>In: {((data.ingressRate || 0)).toFixed(1)}/s</span>
            <span>Out: {((data.egressRate || 0)).toFixed(1)}/s</span>
          </div>
        )}
      </div>

      {/* Downstream source handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-card hover:!scale-125 transition-transform"
      />
    </div>
  )
}
