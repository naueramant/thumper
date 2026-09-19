import React from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Radio } from 'lucide-react'
import type { ConsumerFlowNode } from './types'

export const ConsumerNode: React.FC<NodeProps<ConsumerFlowNode>> = ({ data }) => {
  return (
    <div className="relative min-w-[170px] max-w-[220px] rounded-xl border border-border bg-card p-2.5 shadow-md transition-all hover:border-purple-500/80 group">
      {/* Target handle from Queue */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-card hover:!scale-125 transition-transform"
      />

      <div className="flex items-center gap-2 pb-1.5 border-b border-border/40">
        <div className="p-1 rounded dark:bg-purple-500/10 bg-purple-50 dark:text-purple-400 text-purple-700 border dark:border-purple-500/20 border-purple-200">
          <Radio className="w-3 h-3 animate-pulse" />
        </div>
        <span
          className="font-mono text-xs font-semibold text-foreground truncate"
          title={data.consumerTag}
        >
          {data.consumerTag || 'consumer'}
        </span>
      </div>

      <div className="pt-1.5 space-y-0.5 text-[10px] font-mono text-muted-foreground">
        <div className="truncate">
          Channel: <span className="text-foreground">{data.channel || '-'}</span>
        </div>
        {data.prefetch !== undefined && (
          <div>
            Prefetch: <span className="text-foreground">{data.prefetch}</span>
          </div>
        )}
      </div>
    </div>
  )
}
