import React from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Layers, Users, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBytes } from '@/services/rabbitmq/utils'
import type { QueueFlowNode } from './types'

export const QueueNode: React.FC<NodeProps<QueueFlowNode>> = ({ data }) => {
  return (
    <div
      onClick={data.onClick}
      className={`relative min-w-[220px] max-w-[270px] rounded-xl border bg-card p-3 shadow-md transition-all hover:border-emerald-500/80 group cursor-pointer ${
        data.isFocal
          ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
          : 'border-border hover:shadow-lg hover:shadow-emerald-500/5'
      }`}
    >
      {/* Upstream target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-card hover:!scale-125 transition-transform"
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2 truncate">
          <div className="p-1 rounded-md dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-700 border dark:border-emerald-500/20 border-emerald-200">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span
            className="font-mono text-xs font-bold text-foreground truncate group-hover:text-emerald-500 transition-colors"
            title={data.name}
          >
            {data.name}
          </span>
        </div>
        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {/* Details & Metrics */}
      <div className="pt-2 space-y-1.5 text-[11px] font-mono">
        {/* Message Counters */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Ready:</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 font-bold border-emerald-500/30 dark:text-emerald-400 text-emerald-700 dark:bg-emerald-500/10 bg-emerald-50"
          >
            {data.messagesReady || 0}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Unacked:</span>
          <span
            className={
              data.messagesUnacked > 0
                ? 'dark:text-amber-400 text-amber-600 font-bold'
                : 'text-muted-foreground'
            }
          >
            {data.messagesUnacked || 0}
          </span>
        </div>

        {/* Consumers & Memory */}
        <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-primary" />
            <span>{data.consumers || 0} consumers</span>
          </span>
          {data.memoryBytes !== undefined && (
            <span>{formatBytes(data.memoryBytes)}</span>
          )}
        </div>
      </div>

      {/* Downstream source handle (right) for consumers */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-card hover:!scale-125 transition-transform"
      />
    </div>
  )
}
