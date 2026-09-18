import type { ChurnRates, MessageStats, RateDetail } from './common.ts';

export interface QueueTotals {
  messages: number;
  messages_details?: RateDetail;
  messages_ready: number;
  messages_ready_details?: RateDetail;
  messages_unacknowledged: number;
  messages_unacknowledged_details?: RateDetail;
}

export interface ObjectTotals {
  connections: number;
  channels: number;
  exchanges: number;
  queues: number;
  consumers: number;
}

export interface Listener {
  node: string;
  protocol: string;
  ip_address: string;
  port: number;
  socket_opts?: Record<string, unknown>;
}

export interface WebContext {
  node: string;
  description: string;
  path: string;
  port: number;
  ssl?: boolean;
}

export interface RabbitMQOverview {
  management_version: string;
  rates_mode: string;
  rabbitmq_version: string;
  cluster_name: string;
  erlang_version: string;
  erlang_full_version: string;
  message_stats?: MessageStats;
  queue_totals?: QueueTotals;
  object_totals: ObjectTotals;
  churn_rates?: ChurnRates;
  node: string;
  statistics_db_node?: string;
  listeners?: Listener[];
  contexts?: WebContext[];
  rates_mode_effective?: string;
  sample_retention_policies?: Record<string, number[]>;
}

export interface ClusterNameResponse {
  name: string;
}

export interface UpdateClusterNameRequest {
  name: string;
}

export interface WhoamiResponse {
  name: string;
  tags: string[];
  auth_backend?: string;
}

export interface Extension {
  javascript: string;
}
