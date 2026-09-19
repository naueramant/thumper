import type { Node } from '@xyflow/react'

export interface ExchangeNodeData extends Record<string, unknown> {
  name: string
  vhost: string
  type: string
  durable?: boolean
  autoDelete?: boolean
  ingressRate?: number
  egressRate?: number
  isFocal?: boolean
  onClick?: () => void
}

export interface QueueNodeData extends Record<string, unknown> {
  name: string
  vhost: string
  messages: number
  messagesReady: number
  messagesUnacked: number
  consumers: number
  memoryBytes?: number
  isFocal?: boolean
  onClick?: () => void
}

export interface ConsumerNodeData extends Record<string, unknown> {
  consumerTag: string
  channel: string
  ackRequired?: boolean
  prefetch?: number
}

export type ExchangeFlowNode = Node<ExchangeNodeData, 'exchange'>
export type QueueFlowNode = Node<QueueNodeData, 'queue'>
export type ConsumerFlowNode = Node<ConsumerNodeData, 'consumer'>

export type RabbitFlowNode = ExchangeFlowNode | QueueFlowNode | ConsumerFlowNode
