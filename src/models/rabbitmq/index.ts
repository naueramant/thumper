export interface RabbitClusterOverview {
  management_version: string
  rates_mode: string
  rabbitmq_version: string
  cluster_name: string
  erlang_version: string
  erlang_full_version: string
  message_stats?: {
    publish?: number
    publish_details?: { rate: number }
    deliver_get?: number
    deliver_get_details?: { rate: number }
    ack?: number
    ack_details?: { rate: number }
  }
  queue_totals?: {
    messages: number
    messages_ready: number
    messages_unacknowledged: number
  }
  object_totals?: {
    connections: number
    channels: number
    exchanges: number
    queues: number
    consumers: number
  }
  node: string
}

export interface RabbitQueue {
  name: string
  vhost: string
  durable: boolean
  auto_delete: boolean
  exclusive: boolean
  arguments: Record<string, unknown>
  node: string
  state: 'running' | 'idle' | 'down'
  type: 'classic' | 'quorum' | 'stream'
  messages: number
  messages_ready: number
  messages_unacknowledged: number
  consumers: number
  memory: number
  message_stats?: {
    publish_details?: { rate: number }
    deliver_get_details?: { rate: number }
  }
}

export interface RabbitConnection {
  name: string
  node: string
  state: 'running' | 'flow' | 'blocked' | 'closing'
  channels: number
  user: string
  vhost: string
  timeout: number
  frame_max: number
  client_properties?: {
    platform?: string
    product?: string
    version?: string
    capabilities?: Record<string, boolean>
  }
  recv_oct: number
  send_oct: number
  recv_cnt: number
  send_cnt: number
  connected_at: number
}

export interface RabbitChannel {
  name: string
  node: string
  vhost: string
  user: string
  number: number
  state: 'running' | 'flow'
  consumer_count: number
  messages_unacknowledged: number
  messages_unconfirmed: number
  prefetch_count: number
}

export interface RabbitExchange {
  name: string
  vhost: string
  type: 'direct' | 'fanout' | 'topic' | 'headers'
  durable: boolean
  auto_delete: boolean
  internal: boolean
  arguments: Record<string, unknown>
  message_stats?: {
    publish_in_details?: { rate: number }
    publish_out_details?: { rate: number }
  }
}

export interface RabbitUser {
  name: string
  password_hash: string
  hashing_algorithm: string
  tags: string[]
  limits?: Record<string, number>
}

export interface RabbitVHost {
  name: string
  description?: string
  tags?: string[]
  tracing: boolean
  cluster_state?: Record<string, string>
  messages?: number
  messages_ready?: number
}
