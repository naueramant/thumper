import React, { useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Share2, Layers, Radio, ChevronDown, ChevronUp } from 'lucide-react'

import { useTheme } from '@/hooks/useTheme'
import { ExchangeNode } from './ExchangeNode'
import { QueueNode } from './QueueNode'
import { ConsumerNode } from './ConsumerNode'
import type { RabbitFlowNode } from './types'

const nodeTypes: NodeTypes = {
  exchange: ExchangeNode,
  queue: QueueNode,
  consumer: ConsumerNode,
}

export interface TopologyFlowProps {
  nodes: RabbitFlowNode[]
  edges: Edge[]
  height?: string | number
  className?: string
  showControls?: boolean
  showMinimap?: boolean
  showBackground?: boolean
  showLegend?: boolean
  fitViewOnInit?: boolean
  onNodeClick?: (event: React.MouseEvent, node: Node) => void
}

const TopologyLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-md text-[10px] font-mono overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex items-center justify-between gap-3 w-full px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-semibold">Legend</span>
        {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="grid grid-cols-1 gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="p-0.5 rounded dark:bg-sky-500/10 bg-sky-50 dark:text-sky-400 text-sky-700 border dark:border-sky-500/20 border-sky-200">
                <Share2 className="w-2.5 h-2.5" />
              </span>
              <span className="text-muted-foreground">Exchange</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="p-0.5 rounded dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-700 border dark:border-emerald-500/20 border-emerald-200">
                <Layers className="w-2.5 h-2.5" />
              </span>
              <span className="text-muted-foreground">Queue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="p-0.5 rounded dark:bg-purple-500/10 bg-purple-50 dark:text-purple-400 text-purple-700 border dark:border-purple-500/20 border-purple-200">
                <Radio className="w-2.5 h-2.5" />
              </span>
              <span className="text-muted-foreground">Consumer</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-1 gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded bg-orange-500" />
              <span className="text-muted-foreground">Exchange → Queue binding</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded bg-sky-500" />
              <span className="text-muted-foreground">Exchange → Exchange binding</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 rounded bg-purple-500"
                style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 4px)' }}
              />
              <span className="text-muted-foreground">Queue → Consumer</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const TopologyFlow: React.FC<TopologyFlowProps> = ({
  nodes,
  edges,
  height = '500px',
  className = '',
  showControls = true,
  showMinimap = true,
  showBackground = true,
  showLegend = true,
  fitViewOnInit = true,
  onNodeClick,
}) => {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Dynamic edge styling based on active theme
  const styledEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      type: 'smoothstep',
      animated: true,
      labelStyle: {
        fill: isDark ? '#ffffff' : '#0f172a',
        fontWeight: 600,
        fontSize: 10,
        fontFamily: 'monospace',
      },
      labelBgStyle: {
        fill: isDark ? '#18191e' : '#ffffff',
        stroke: isDark ? '#3f3f46' : '#cbd5e1',
        strokeWidth: 1,
        rx: 6,
        ry: 6,
      },
      labelBgPadding: [6, 4] as [number, number],
      style: {
        stroke: edge.style?.stroke || (isDark ? '#f97316' : '#ea580c'),
        strokeWidth: 2,
        ...edge.style,
      },
    }))
  }, [edges, isDark])

  return (
    <div
      style={{ height }}
      className={`relative w-full rounded-xl border border-border overflow-hidden transition-colors ${
        isDark ? 'bg-[#0e1015]' : 'bg-slate-50/70'
      } ${className}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView={fitViewOnInit}
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        {showBackground && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color={isDark ? '#272a34' : '#cbd5e1'}
          />
        )}
        {showControls && (
          <Controls
            className="!m-3"
            showInteractive={false}
          />
        )}
        {showMinimap && (
          <MiniMap
            className="!m-3"
            nodeColor={(n) => {
              if (n.type === 'exchange') return '#0ea5e9'
              if (n.type === 'queue') return '#10b981'
              return '#8b5cf6'
            }}
            maskColor={isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(241, 245, 249, 0.75)'}
          />
        )}
        {showLegend && (
          <Panel position="top-right" className="!m-3">
            <TopologyLegend />
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}
