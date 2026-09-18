export interface ConsumerChannelDetails {
  connection_name: string;
  name: string;
  node: string;
  number: number;
  peer_host: string;
  peer_port: number;
  user: string;
}

export interface ConsumerQueueDetails {
  name: string;
  vhost: string;
}

export interface Consumer {
  consumer_tag: string;
  channel_details: ConsumerChannelDetails;
  queue: ConsumerQueueDetails;
  ack_required: boolean;
  active?: boolean;
  activity_status?: 'up' | 'single_active' | 'waiting';
  exclusive: boolean;
  prefetch_count: number;
  arguments: Record<string, unknown>;
}
