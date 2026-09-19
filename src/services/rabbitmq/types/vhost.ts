import type { MessageStats, RateDetail } from './common.ts';

export interface Vhost {
  name: string;
  description?: string;
  tags?: string[];
  tracing: boolean;
  cluster_state?: Record<string, 'running' | 'stopped' | string>;
  default_queue_type?: string;
  messages?: number;
  messages_details?: RateDetail;
  messages_ready?: number;
  messages_ready_details?: RateDetail;
  messages_unacknowledged?: number;
  messages_unacknowledged_details?: RateDetail;
  message_stats?: MessageStats;
  recv_oct?: number;
  recv_oct_details?: RateDetail;
  send_oct?: number;
  send_oct_details?: RateDetail;
}

export type VirtualHost = Vhost;

export interface CreateVhostRequest {
  description?: string;
  tags?: string | string[];
  tracing?: boolean;
  default_queue_type?: string;
}

export interface VhostLimit {
  vhost: string;
  value: {
    'max-connections'?: number;
    'max-queues'?: number;
    [key: string]: unknown;
  };
}

export interface SetVhostLimitRequest {
  value: number;
}
