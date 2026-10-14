import type { MessageStats, RateDetail } from './common.ts';
import type { MessageProperties } from './exchange.ts';

export type QueueType = 'classic' | 'quorum' | 'stream' | string;

export interface Queue {
  name: string;
  vhost: string;
  type: QueueType;
  durable: boolean;
  auto_delete: boolean;
  exclusive: boolean;
  arguments: Record<string, unknown>;
  node: string;
  state: 'running' | 'idle' | 'paused' | string;
  policy?: string;
  operator_policy?: string;
  effective_policy_definition?: Record<string, unknown>;
  exclusive_consumer_tag?: string | null;
  consumers: number;
  consumer_utilisation?: number | null;
  memory?: number;
  messages: number;
  messages_details?: RateDetail;
  messages_ready: number;
  messages_ready_details?: RateDetail;
  messages_unacknowledged: number;
  messages_unacknowledged_details?: RateDetail;
  messages_paged_out?: number;
  messages_paged_out_details?: RateDetail;
  messages_persistent?: number;
  messages_ram?: number;
  message_bytes?: number;
  message_bytes_ready?: number;
  message_bytes_unacknowledged?: number;
  message_bytes_ram?: number;
  message_bytes_persistent?: number;
  message_stats?: MessageStats;
  reductions?: number;
  reductions_details?: RateDetail;
  head_message_timestamp?: number | null;
  leader?: string;
  members?: string[];
  online?: string[];
  single_active_consumer_tag?: string | null;
  user_who_performed_action?: string;
}

export interface CreateQueueRequest {
  auto_delete?: boolean;
  durable?: boolean;
  type?: QueueType;
  arguments?: Record<string, unknown>;
  node?: string;
}

export type AckMode = 'ack_requeue_true' | 'ack_requeue_false' | 'reject_requeue_true' | 'reject_requeue_false';

export interface GetMessagesRequest {
  count: number;
  ackmode?: AckMode;
  ack_mode?: AckMode;
  encoding: 'auto' | 'base64';
  truncate?: number;
}

export interface QueueMessage {
  payload_bytes: number;
  redelivered: boolean;
  exchange: string;
  routing_key: string;
  message_count: number;
  properties: MessageProperties;
  payload: string;
  payload_encoding: string;
}

export interface PurgeQueueResponse {
  message_count: number;
}

export interface QueueQueryOptions extends Record<string, unknown> {
  lengths_age?: number;
  lengths_incr?: number;
  msg_rates_age?: number;
  msg_rates_incr?: number;
  data_rates_age?: number;
  data_rates_incr?: number;
}
