export type ShovelProtocol = 'amqp091' | 'amqp10';
export type ShovelAckMode = 'on-confirm' | 'on-publish' | 'no-ack';
export type ShovelDeleteAfter = 'never' | 'queue-length' | number;

export interface DynamicShovelDefinition {
  'src-protocol'?: ShovelProtocol;
  'src-uri': string | string[];
  'src-queue'?: string;
  'src-exchange'?: string;
  'src-exchange-key'?: string;
  'src-address'?: string;
  'src-prefetch-count'?: number;
  'src-delete-after'?: ShovelDeleteAfter;
  'src-consumer-args'?: Record<string, unknown>;
  'dest-protocol'?: ShovelProtocol;
  'dest-uri': string | string[];
  'dest-queue'?: string;
  'dest-exchange'?: string;
  'dest-exchange-key'?: string;
  'dest-address'?: string;
  'dest-add-forward-headers'?: boolean;
  'dest-publish-properties'?: Record<string, unknown>;
  'reconnect-delay'?: number;
  'ack-mode'?: ShovelAckMode;
  [key: string]: unknown;
}

export interface DynamicShovel {
  vhost: string;
  name: string;
  component: 'shovel';
  value: DynamicShovelDefinition;
}

export interface ShovelStatus {
  node: string;
  timestamp: string;
  name: string;
  vhost: string;
  type: 'dynamic' | 'static';
  state: 'starting' | 'running' | 'terminated' | string;
  reason?: string;
  src_uri?: string;
  src_protocol?: string;
  src_queue?: string;
  src_exchange?: string;
  src_exchange_key?: string;
  src_address?: string;
  dest_uri?: string;
  dest_protocol?: string;
  dest_queue?: string;
  dest_exchange?: string;
  dest_exchange_key?: string;
  dest_address?: string;
  pending?: number;
  remaining?: string | number;
  remaining_unacked?: string | number;
  forwarded?: number;
  blocked_status?: string;
}

export interface CreateDynamicShovelRequest {
  vhost: string;
  name: string;
  definition: DynamicShovelDefinition;
}
