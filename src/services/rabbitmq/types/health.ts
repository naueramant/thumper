export interface HealthCheckResult {
  status: 'ok' | 'failed' | string;
  reason?: string;
}

export interface NodeAlarm {
  node: string;
  resource: 'memory' | 'disk_free' | string;
  limit: number;
  free?: number;
  used?: number;
}
