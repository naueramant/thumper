import type { MessageStats } from './common.ts';

export type ExchangeType = 'direct' | 'fanout' | 'topic' | 'headers' | string;

export interface Exchange {
  name: string;
  vhost: string;
  type: ExchangeType;
  durable: boolean;
  auto_delete: boolean;
  internal: boolean;
  arguments: Record<string, unknown>;
  message_stats?: MessageStats;
  user_who_performed_action?: string;
}

export interface CreateExchangeRequest {
  type: ExchangeType;
  auto_delete?: boolean;
  durable?: boolean;
  internal?: boolean;
  arguments?: Record<string, unknown>;
}

export interface MessageProperties {
  content_type?: string;
  content_encoding?: string;
  headers?: Record<string, unknown>;
  delivery_mode?: number;
  priority?: number;
  correlation_id?: string;
  reply_to?: string;
  expiration?: string;
  message_id?: string;
  timestamp?: number;
  type?: string;
  user_id?: string;
  app_id?: string;
  cluster_id?: string;
  [key: string]: unknown;
}

export interface PublishMessageRequest {
  properties?: MessageProperties;
  routing_key: string;
  payload: string;
  payload_encoding: 'string' | 'base64';
}

export interface PublishMessageResponse {
  routed: boolean;
}

export interface ExchangeQueryOptions extends Record<string, unknown> {
  msg_rates_age?: number;
  msg_rates_incr?: number;
  data_rates_age?: number;
  data_rates_incr?: number;
}
