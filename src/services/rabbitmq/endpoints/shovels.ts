import type { RabbitMQClient } from '../client.ts';
import type {
  DynamicShovel,
  DynamicShovelDefinition,
  ShovelStatus,
} from '../types/shovel.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class ShovelsApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Retrieves runtime status for all shovels in the cluster or within a specific virtual host.
   * Returns empty array if the endpoint returns 404 (e.g. plugin not enabled).
   */
  async getShovelStatuses(vhost?: string): Promise<ShovelStatus[]> {
    const path =
      vhost && vhost !== 'all'
        ? `/api/shovels/${encodeVhost(vhost)}`
        : '/api/shovels';
    return this.client.request<ShovelStatus[]>(path);
  }

  /**
   * Retrieves runtime status for an individual shovel.
   */
  async getShovelStatus(vhost: string, name: string): Promise<ShovelStatus> {
    return this.client.request<ShovelStatus>(
      `/api/shovels/vhost/${encodeVhost(vhost)}/${encodeName(name)}`
    );
  }

  /**
   * Lists dynamic shovels defined as runtime parameters.
   */
  async getDynamicShovels(vhost?: string): Promise<DynamicShovel[]> {
    const path =
      vhost && vhost !== 'all'
        ? `/api/parameters/shovel/${encodeVhost(vhost)}`
        : '/api/parameters/shovel';
    return this.client.request<DynamicShovel[]>(path);
  }

  /**
   * Retrieves an individual dynamic shovel configuration by vhost and name.
   */
  async getDynamicShovel(vhost: string, name: string): Promise<DynamicShovel> {
    return this.client.request<DynamicShovel>(
      `/api/parameters/shovel/${encodeVhost(vhost)}/${encodeName(name)}`
    );
  }

  /**
   * Creates or updates a dynamic shovel definition as a runtime parameter.
   */
  async createDynamicShovel(
    vhost: string,
    name: string,
    definition: DynamicShovelDefinition
  ): Promise<void> {
    await this.client.request<void>(
      `/api/parameters/shovel/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'PUT',
        body: { value: definition },
      }
    );
  }

  /**
   * Deletes a dynamic shovel parameter.
   */
  async deleteDynamicShovel(vhost: string, name: string): Promise<void> {
    await this.client.request<void>(
      `/api/parameters/shovel/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Restarts a dynamic shovel.
   */
  async restartShovel(vhost: string, name: string): Promise<void> {
    await this.client.request<void>(
      `/api/shovels/vhost/${encodeVhost(vhost)}/${encodeName(name)}/restart`,
      {
        method: 'DELETE',
      }
    );
  }
}
