import type { MessageStats, RateDetail } from './common.ts';
import type { Connection } from './connection.ts';

export interface Channel {
  name: string;
  number: number;
  user: string;
  vhost: string;
  node: string;
  state: string;
  mode?: string;
  connection_details: {
    name: string;
    peer_address: string;
    peer_port: number;
  };
  consumer_count: number;
  confirm: boolean;
  transactional: boolean;
  prefetch_count: number;
  global_prefetch_count: number;
  messages_unacknowledged: number;
  messages_uncommitted: number;
  messages_unconfirmed: number;
  acks_uncommitted: number;
  message_stats?: MessageStats;
  reductions?: number;
  reductions_details?: RateDetail;
}

export interface ChannelDetail extends Channel {
  connection?: Connection;
}
