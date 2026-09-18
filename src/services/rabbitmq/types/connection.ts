import type { RateDetail } from './common.ts';

export interface ClientProperties {
  capabilities?: {
    authentication_failure_close?: boolean;
    basic_nack?: boolean;
    'connection.blocked'?: boolean;
    consumer_cancel_notify?: boolean;
    exchange_exchange_bindings?: boolean;
    publisher_confirms?: boolean;
    [key: string]: unknown;
  };
  client_api_library?: string;
  connection_name?: string;
  platform?: string;
  product?: string;
  version?: string;
  [key: string]: unknown;
}

export interface Connection {
  name: string;
  node: string;
  state: 'starting' | 'tuning' | 'opening' | 'running' | 'flow' | 'blocking' | 'blocked' | 'closing' | 'closed';
  channels: number;
  user: string;
  vhost: string;
  timeout: number;
  frame_max: number;
  client_properties?: ClientProperties;
  ssl: boolean;
  ssl_protocol?: string;
  ssl_key_exchange?: string;
  ssl_cipher?: string;
  ssl_hash?: string;
  protocol: string;
  user_who_performed_action?: string;
  peer_host: string;
  peer_port: number;
  host: string;
  port: number;
  type: 'network' | 'direct';
  connected_at: number;
  recv_oct?: number;
  recv_oct_details?: RateDetail;
  send_oct?: number;
  send_oct_details?: RateDetail;
  recv_cnt?: number;
  recv_cnt_details?: RateDetail;
  send_cnt?: number;
  send_cnt_details?: RateDetail;
  send_pend?: number;
  garbage_collection?: Record<string, unknown>;
  reductions?: number;
  reductions_details?: RateDetail;
}

export interface CloseConnectionOptions {
  reason?: string;
}
