import type { RateDetail } from './common.ts';

export interface NodeApplication {
  name: string;
  description: string;
  version: string;
}

export interface Node {
  name: string;
  type: 'disc' | 'ram';
  running: boolean;
  os_pid: string;
  fd_used: number;
  fd_total: number;
  sockets_used: number;
  sockets_total: number;
  mem_used: number;
  mem_limit: number;
  mem_alarm: boolean;
  disk_free: number;
  disk_free_limit: number;
  disk_free_alarm: boolean;
  proc_used: number;
  proc_total: number;
  rates_mode: string;
  uptime: number;
  run_queue?: number;
  processors?: number;
  partitions?: string[];
  exchange_types?: Array<{ name: string; description: string; enabled: boolean }>;
  auth_mechanisms?: Array<{ name: string; description: string; enabled: boolean }>;
  applications?: NodeApplication[];
  contexts?: Array<{ description: string; path: string; port: number }>;
  log_files?: string[];
  db_dir?: string;
  config_files?: string[];
  net_ticktime?: number;
  enabled_plugins?: string[];
  mem_calculation_strategy?: string;
  gc_num?: number;
  gc_num_details?: RateDetail;
  gc_bytes_reclaimed?: number;
  gc_bytes_reclaimed_details?: RateDetail;
  context_switches?: number;
  context_switches_details?: RateDetail;
  io_read_count?: number;
  io_read_count_details?: RateDetail;
  io_read_bytes?: number;
  io_read_bytes_details?: RateDetail;
  io_write_count?: number;
  io_write_count_details?: RateDetail;
  io_write_bytes?: number;
  io_write_bytes_details?: RateDetail;
  io_sync_count?: number;
  io_sync_count_details?: RateDetail;
  io_seek_count?: number;
  io_seek_count_details?: RateDetail;
}

export interface NodeMemoryBreakdown {
  connection_readers?: number;
  connection_writers?: number;
  connection_channels?: number;
  connection_other?: number;
  queue_procs?: number;
  queue_slave_procs?: number;
  plugins?: number;
  other_proc?: number;
  metrics?: number;
  mgmt_db?: number;
  mnesia?: number;
  quorum_queue_procs?: number;
  quorum_ets?: number;
  stream_queue_procs?: number;
  stream_queue_replica_reader_procs?: number;
  allocated_unused?: number;
  reserved_unallocated?: number;
  total: {
    erlang: number;
    rss: number;
    allocated: number;
  };
}
