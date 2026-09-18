import { useQuery } from '@tanstack/react-query'
import type { RabbitClusterOverview, RabbitQueue, RabbitConnection } from '@/models/rabbitmq/index.ts'

// Mock overview data for development preview if RabbitMQ backend is not yet connected
const mockOverview: RabbitClusterOverview = {
  management_version: '3.13.2',
  rabbitmq_version: '3.13.2',
  rates_mode: 'basic',
  cluster_name: 'rabbit@cluster-alpha',
  erlang_version: '26.2.5',
  erlang_full_version: 'Erlang/OTP 26 [erts-14.2.5]',
  node: 'rabbit@node-01',
  message_stats: {
    publish: 248192,
    publish_details: { rate: 1240.5 },
    deliver_get: 245100,
    deliver_get_details: { rate: 1198.2 },
    ack: 243980,
    ack_details: { rate: 1185.0 },
  },
  queue_totals: {
    messages: 3092,
    messages_ready: 2840,
    messages_unacknowledged: 252,
  },
  object_totals: {
    connections: 48,
    channels: 112,
    exchanges: 16,
    queues: 24,
    consumers: 96,
  },
}

const mockQueues: RabbitQueue[] = [
  {
    name: 'orders.checkout',
    vhost: '/',
    type: 'quorum',
    durable: true,
    auto_delete: false,
    exclusive: false,
    state: 'running',
    messages: 1420,
    messages_ready: 1380,
    messages_unacknowledged: 40,
    consumers: 12,
    memory: 14285760,
    node: 'rabbit@node-01',
    arguments: { 'x-queue-type': 'quorum' },
    message_stats: {
      publish_details: { rate: 450.2 },
      deliver_get_details: { rate: 448.0 },
    },
  },
  {
    name: 'payments.notifications',
    vhost: '/',
    type: 'classic',
    durable: true,
    auto_delete: false,
    exclusive: false,
    state: 'running',
    messages: 45,
    messages_ready: 40,
    messages_unacknowledged: 5,
    consumers: 6,
    memory: 4194304,
    node: 'rabbit@node-02',
    arguments: {},
    message_stats: {
      publish_details: { rate: 85.0 },
      deliver_get_details: { rate: 85.0 },
    },
  },
  {
    name: 'telemetry.events.stream',
    vhost: '/',
    type: 'stream',
    durable: true,
    auto_delete: false,
    exclusive: false,
    state: 'running',
    messages: 12500,
    messages_ready: 12500,
    messages_unacknowledged: 0,
    consumers: 18,
    memory: 52428800,
    node: 'rabbit@node-01',
    arguments: { 'x-queue-type': 'stream', 'x-max-length-bytes': 1073741824 },
    message_stats: {
      publish_details: { rate: 2100.8 },
      deliver_get_details: { rate: 2095.4 },
    },
  },
  {
    name: 'dead-letter.failed-jobs',
    vhost: '/',
    type: 'classic',
    durable: true,
    auto_delete: false,
    exclusive: false,
    state: 'idle',
    messages: 12,
    messages_ready: 12,
    messages_unacknowledged: 0,
    consumers: 2,
    memory: 2097152,
    node: 'rabbit@node-03',
    arguments: {},
    message_stats: {
      publish_details: { rate: 0.2 },
      deliver_get_details: { rate: 0.0 },
    },
  },
]

export function useRabbitOverview() {
  return useQuery({
    queryKey: ['rabbit', 'overview'],
    queryFn: async () => {
      // Future integration with RabbitMQClient
      return mockOverview
    },
    refetchInterval: 5000,
  })
}

export function useRabbitQueues() {
  return useQuery({
    queryKey: ['rabbit', 'queues'],
    queryFn: async () => {
      return mockQueues
    },
    refetchInterval: 5000,
  })
}

export function useRabbitConnections() {
  return useQuery({
    queryKey: ['rabbit', 'connections'],
    queryFn: async () => {
      const connections: RabbitConnection[] = []
      return connections
    },
    refetchInterval: 5000,
  })
}
