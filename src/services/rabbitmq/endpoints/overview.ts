import type { RabbitMQClient } from '../client.ts';
import type {
  ClusterNameResponse,
  Extension,
  OverviewQueryOptions,
  RabbitMQOverview,
  WhoamiResponse,
} from '../types/overview.ts';
import { encodeVhost } from '../utils.ts';

export class OverviewApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Retrieves overall cluster state, version metrics, global rates, and listener status.
   */
  async getOverview(options?: OverviewQueryOptions): Promise<RabbitMQOverview> {
    return this.client.request<RabbitMQOverview>('/api/overview', {
      query: options,
    });
  }

  /**
   * Gets the cluster identifier name.
   */
  async getClusterName(): Promise<string> {
    const res = await this.client.request<ClusterNameResponse>('/api/cluster-name');
    return res.name;
  }

  /**
   * Updates the cluster identifier name.
   */
  async setClusterName(name: string): Promise<void> {
    await this.client.request<void>('/api/cluster-name', {
      method: 'PUT',
      body: { name },
    });
  }

  /**
   * Returns information about the currently authenticated user.
   */
  async whoami(): Promise<WhoamiResponse> {
    return this.client.request<WhoamiResponse>('/api/whoami');
  }

  /**
   * Returns list of extensions registered in the management UI.
   */
  async getExtensions(): Promise<Extension[]> {
    return this.client.request<Extension[]>('/api/extensions');
  }

  /**
   * Checks aliveness of a vhost.
   */
  async testAliveness(vhost = '/'): Promise<{ status: string }> {
    return this.client.request<{ status: string }>(`/api/aliveness-test/${encodeVhost(vhost)}`);
  }
}
