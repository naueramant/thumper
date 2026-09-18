import type { RabbitMQClient } from '../client.ts';
import type { HealthCheckResult, NodeAlarm } from '../types/health.ts';
import { encodeName } from '../utils.ts';

export class HealthApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists active resource alarms (memory, disk, file descriptors) across cluster nodes.
   */
  async checkAlarms(): Promise<NodeAlarm[]> {
    return this.client.request<NodeAlarm[]>('/api/health/checks/alarms');
  }

  /**
   * Lists active resource alarms local to the target node.
   */
  async checkLocalAlarms(): Promise<NodeAlarm[]> {
    return this.client.request<NodeAlarm[]>('/api/health/checks/local-alarms');
  }

  /**
   * Checks if node is in service and running.
   */
  async checkNodeInService(): Promise<HealthCheckResult> {
    return this.client.request<HealthCheckResult>('/api/health/checks/is-in-service');
  }

  /**
   * Checks whether the node is ready to serve client requests.
   */
  async checkNodeReadyToServe(): Promise<HealthCheckResult> {
    return this.client.request<HealthCheckResult>('/api/health/checks/ready-to-serve-clients');
  }

  /**
   * Checks if any quorum queues would lose majority if this node shuts down.
   */
  async checkNodeQuorumCritical(): Promise<HealthCheckResult> {
    return this.client.request<HealthCheckResult>(
      '/api/health/checks/node-is-quorum-critical'
    );
  }

  /**
   * Checks if node has not exceeded its connection limit.
   */
  async checkNodeBelowConnectionLimit(): Promise<HealthCheckResult> {
    return this.client.request<HealthCheckResult>(
      '/api/health/checks/below-node-connection-limit'
    );
  }

  /**
   * Checks if all virtual hosts are running and accessible.
   */
  async checkVirtualHosts(): Promise<HealthCheckResult> {
    return this.client.request<HealthCheckResult>('/api/health/checks/virtual-hosts');
  }

  /**
   * Checks TLS certificate expiration within specified duration.
   */
  async checkCertificateExpiration(
    within: number,
    unit: 'days' | 'weeks' | 'months'
  ): Promise<HealthCheckResult> {
    return this.client.request<HealthCheckResult>(
      `/api/health/checks/certificate-expiration/${within}/${unit}`
    );
  }

  /**
   * Checks if a specific port listener is active and accepting connections.
   */
  async checkPortListener(port: number): Promise<HealthCheckResult> {
    return this.client.request<HealthCheckResult>(
      `/api/health/checks/port-listener/${port}`
    );
  }

  /**
   * Checks if a protocol listener is active (e.g. 'amqp', 'http').
   */
  async checkProtocolListener(protocols: string): Promise<HealthCheckResult> {
    return this.client.request<HealthCheckResult>(
      `/api/health/checks/protocol-listener/${encodeName(protocols)}`
    );
  }

  /**
   * Rebalances quorum queue leadership across cluster nodes.
   */
  async rebalanceQueues(): Promise<void> {
    await this.client.request<void>('/api/rebalance/queues', {
      method: 'POST',
    });
  }
}
