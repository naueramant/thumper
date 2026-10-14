export interface RateDetail {
  rate: number;
  samples?: MetricSample[];
  avg_rate?: number;
  avg?: number;
}

export interface MetricSample {
  timestamp: number;
  sample: number;
}

export interface MetricDetail {
  rate: number;
  samples?: MetricSample[];
}

export interface MessageStats {
  publish?: number;
  publish_details?: RateDetail;
  deliver_get?: number;
  deliver_get_details?: RateDetail;
  deliver?: number;
  deliver_details?: RateDetail;
  deliver_no_ack?: number;
  deliver_no_ack_details?: RateDetail;
  ack?: number;
  ack_details?: RateDetail;
  redeliver?: number;
  redeliver_details?: RateDetail;
  return_unroutable?: number;
  return_unroutable_details?: RateDetail;
  get?: number;
  get_details?: RateDetail;
  get_no_ack?: number;
  get_no_ack_details?: RateDetail;
  get_empty?: number;
  get_empty_details?: RateDetail;
  disk_reads?: number;
  disk_reads_details?: RateDetail;
  disk_writes?: number;
  disk_writes_details?: RateDetail;
  confirm?: number;
  confirm_details?: RateDetail;
  drop_unroutable?: number;
  drop_unroutable_details?: RateDetail;
  publish_in?: number;
  publish_in_details?: RateDetail;
  publish_out?: number;
  publish_out_details?: RateDetail;
}

export interface ListQueryOptions {
  page?: number;
  page_size?: number;
  name?: string;
  use_regex?: boolean;
  pagination?: boolean;
  sort?: string;
  sort_reverse?: boolean;
  columns?: string | string[];
  disable_stats?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total_count: number;
  filtered_count: number;
  page: number;
  page_count: number;
  page_size: number;
  item_count: number;
}

export interface ChurnRates {
  connection_created?: number;
  connection_created_details?: RateDetail;
  connection_closed?: number;
  connection_closed_details?: RateDetail;
  channel_created?: number;
  channel_created_details?: RateDetail;
  channel_closed?: number;
  channel_closed_details?: RateDetail;
  queue_declared?: number;
  queue_declared_details?: RateDetail;
  queue_created?: number;
  queue_created_details?: RateDetail;
  queue_deleted?: number;
  queue_deleted_details?: RateDetail;
}
