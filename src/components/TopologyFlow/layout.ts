import dagre from '@dagrejs/dagre'
import type { Edge } from '@xyflow/react'
import type { Exchange } from '@/services/rabbitmq/types/exchange'
import type { Queue } from '@/services/rabbitmq/types/queue'
import type { Binding } from '@/services/rabbitmq/types/binding'
import type { RabbitFlowNode } from './types'

export interface BuildGraphOptions {
  exchanges: Exchange[]
  queues: Queue[]
  bindings: Binding[]
  vhost: string
  focalType?: 'exchange' | 'queue'
  focalName?: string
  hideSystemExchanges?: boolean
  searchQuery?: string
  rankDir?: 'LR' | 'TB'
  onNavigate?: (path: string) => void
}

const NODE_DIMENSIONS = {
  exchange: { width: 240, height: 110 },
  queue: { width: 250, height: 115 },
  consumer: { width: 190, height: 75 },
}

export function buildTopologyGraph({
  exchanges,
  queues,
  bindings,
  vhost,
  focalType,
  focalName,
  hideSystemExchanges = false,
  searchQuery,
  rankDir = 'LR',
  onNavigate,
}: BuildGraphOptions): { nodes: RabbitFlowNode[]; edges: Edge[] } {
  const rawNodes: RabbitFlowNode[] = []
  const edges: Edge[] = []

  const q = searchQuery?.toLowerCase().trim() || ''

  // 1. Filter bindings relevant to vhost
  const vhostBindings = bindings.filter(
    (b) => !vhost || vhost === 'all' || b.vhost === vhost
  )

  // 2. Identify focal filtering if specified
  let relevantExchangeNames = new Set<string>()
  let relevantQueueNames = new Set<string>()

  if (focalType === 'exchange' && focalName !== undefined) {
    relevantExchangeNames.add(focalName)
    // Find outbound
    vhostBindings.forEach((b) => {
      if (b.source === focalName) {
        if (b.destination_type === 'queue') {
          relevantQueueNames.add(b.destination)
        } else if (b.destination_type === 'exchange') {
          relevantExchangeNames.add(b.destination)
        }
      }
      if (b.destination === focalName && b.destination_type === 'exchange') {
        relevantExchangeNames.add(b.source)
      }
    })
  } else if (focalType === 'queue' && focalName !== undefined) {
    relevantQueueNames.add(focalName)
    // Find inbound exchanges
    vhostBindings.forEach((b) => {
      if (b.destination === focalName && b.destination_type === 'queue') {
        relevantExchangeNames.add(b.source)
      }
    })
  } else {
    // Global topology
    exchanges.forEach((e) => {
      if (hideSystemExchanges && (e.name.startsWith('amq.') || e.name === '')) {
        // Keep only if it has custom bindings
        const hasCustomBindings = vhostBindings.some(
          (b) =>
            b.source === e.name ||
            (b.destination === e.name && b.destination_type === 'exchange')
        )
        if (!hasCustomBindings) return
      }
      relevantExchangeNames.add(e.name)
    })

    queues.forEach((queue) => {
      relevantQueueNames.add(queue.name)
    })
  }

  // Filter by search query if provided
  if (q) {
    const matchedExchanges = new Set<string>()
    const matchedQueues = new Set<string>()

    relevantExchangeNames.forEach((name) => {
      if (name.toLowerCase().includes(q)) matchedExchanges.add(name)
    })
    relevantQueueNames.forEach((name) => {
      if (name.toLowerCase().includes(q)) matchedQueues.add(name)
    })

    // Also include connected neighbors of search matches
    vhostBindings.forEach((b) => {
      if (matchedExchanges.has(b.source) && relevantQueueNames.has(b.destination)) {
        matchedQueues.add(b.destination)
      }
      if (matchedQueues.has(b.destination) && relevantExchangeNames.has(b.source)) {
        matchedExchanges.add(b.source)
      }
    })

    relevantExchangeNames = matchedExchanges
    relevantQueueNames = matchedQueues
  }

  // 3. Create Exchange Nodes
  relevantExchangeNames.forEach((name) => {
    const exData = exchanges.find((e) => e.name === name)
    const isFocal = focalType === 'exchange' && focalName === name
    const nodeId = `exchange_${name || 'default'}`

    rawNodes.push({
      id: nodeId,
      type: 'exchange',
      position: { x: 0, y: 0 },
      data: {
        name,
        vhost,
        type: exData?.type || (name === '' ? 'direct' : 'direct'),
        durable: exData?.durable ?? true,
        autoDelete: exData?.auto_delete ?? false,
        ingressRate: exData?.message_stats?.publish_details?.rate,
        egressRate: exData?.message_stats?.deliver_get_details?.rate,
        isFocal,
        onClick: () => {
          if (onNavigate) {
            onNavigate(
              `/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(name || '(default)')}`
            )
          }
        },
      },
    })
  })

  // 4. Create Queue Nodes
  relevantQueueNames.forEach((name) => {
    const qData = queues.find((q) => q.name === name)
    const isFocal = focalType === 'queue' && focalName === name
    const nodeId = `queue_${name}`

    rawNodes.push({
      id: nodeId,
      type: 'queue',
      position: { x: 0, y: 0 },
      data: {
        name,
        vhost,
        messages: qData?.messages || 0,
        messagesReady: qData?.messages_ready || 0,
        messagesUnacked: qData?.messages_unacknowledged || 0,
        consumers: qData?.consumers || 0,
        memoryBytes: qData?.memory,
        isFocal,
        onClick: () => {
          if (onNavigate) {
            onNavigate(`/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(name)}`)
          }
        },
      },
    })

    // Add up to 3 consumer nodes if present
    const consumerList = (qData as any)?.consumer_details as any[] | undefined
    if (consumerList && consumerList.length > 0) {
      consumerList.slice(0, 3).forEach((consumer: any, cIdx: number) => {
        const consumerNodeId = `consumer_${name}_${cIdx}`
        rawNodes.push({
          id: consumerNodeId,
          type: 'consumer',
          position: { x: 0, y: 0 },
          data: {
            consumerTag: consumer.consumer_tag,
            channel: consumer.channel_details?.name || 'channel',
            ackRequired: consumer.ack_required,
            prefetch: consumer.prefetch_count,
          },
        })

        edges.push({
          id: `edge_queue_consumer_${name}_${cIdx}`,
          source: nodeId,
          target: consumerNodeId,
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '4 4' },
        })
      })
    }
  })

  // 5. Create Edges based on Bindings
  const addedEdges = new Set<string>()

  vhostBindings.forEach((b) => {
    const sourceNodeId = `exchange_${b.source || 'default'}`
    const destNodeId =
      b.destination_type === 'exchange'
        ? `exchange_${b.destination}`
        : `queue_${b.destination}`

    const hasSource = rawNodes.some((n) => n.id === sourceNodeId)
    const hasDest = rawNodes.some((n) => n.id === destNodeId)

    if (hasSource && hasDest) {
      const edgeKey = `${sourceNodeId}->${destNodeId}:${b.routing_key || ''}`
      if (addedEdges.has(edgeKey)) return
      addedEdges.add(edgeKey)

      const isE2E = b.destination_type === 'exchange'
      const strokeColor = isE2E ? '#38bdf8' : '#f97316'

      edges.push({
        id: `edge_${b.source || 'default'}_${b.destination}_${b.properties_key || b.routing_key || Math.random()}`,
        source: sourceNodeId,
        target: destNodeId,
        animated: true,
        label: b.routing_key ? b.routing_key : '',
        style: { stroke: strokeColor, strokeWidth: 2 },
      })
    }
  })

  // 6. Dagre Hierarchical Layout Engine
  const g = new dagre.graphlib.Graph()
  
  // Calculate dynamic node spacing based on total queues
  // When there are many queues, slightly tighter node separation keeps the graph compact
  const nodeCount = rawNodes.length
  const nodeSep = nodeCount > 20 ? 30 : nodeCount > 10 ? 40 : 50
  const rankSep = rankDir === 'LR' ? 240 : 120

  g.setGraph({
    rankdir: rankDir,
    nodesep: nodeSep,
    ranksep: rankSep,
    // No explicit `align`: dagre's Brandes-Köpf heuristic averages all four
    // corner alignments (UL/UR/DL/DR) for a vertically-balanced/centered result.
    // Forcing 'UL' pins every rank to its upper-left neighbor, which is what
    // produced the lopsided, top-heavy layouts.
    ranker: 'network-simplex',
    marginx: 40,
    marginy: 40,
  })
  g.setDefaultEdgeLabel(() => ({}))

  // Register nodes with Dagre
  rawNodes.forEach((node) => {
    const dims =
      NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] || {
        width: 240,
        height: 110,
      }
    g.setNode(node.id, { width: dims.width, height: dims.height })
  })

  // Register edges with Dagre
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  // Execute Dagre Layout
  dagre.layout(g)

  // Apply computed positions back to nodes
  const nodes = rawNodes.map((node) => {
    const nodeWithPos = g.node(node.id)
    const dims =
      NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] || {
        width: 240,
        height: 110,
      }

    if (nodeWithPos) {
      return {
        ...node,
        position: {
          x: nodeWithPos.x - dims.width / 2,
          y: nodeWithPos.y - dims.height / 2,
        },
      }
    }
    return node
  })

  return { nodes, edges }
}
