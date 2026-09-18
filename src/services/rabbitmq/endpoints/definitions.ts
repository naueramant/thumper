import type { RabbitMQClient } from '../client.ts';
import type { Definitions, VhostDefinitions } from '../types/definitions.ts';
import { encodeVhost } from '../utils.ts';

export class DefinitionsApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Exports cluster-wide definitions: exchanges, queues, bindings, users,
   * virtual hosts, permissions, topic permissions, and parameters.
   */
  async exportDefinitions(): Promise<Definitions> {
    return this.client.request<Definitions>('/api/definitions');
  }

  /**
   * Imports (uploads and merges) cluster-wide definitions.
   */
  async importDefinitions(definitions: Definitions | FormData): Promise<void> {
    await this.client.request<void>('/api/definitions', {
      method: 'POST',
      body: definitions,
    });
  }

  /**
   * Exports definitions of a single virtual host.
   */
  async exportVhostDefinitions(vhost: string): Promise<VhostDefinitions> {
    return this.client.request<VhostDefinitions>(`/api/definitions/${encodeVhost(vhost)}`);
  }

  /**
   * Imports definitions into a single virtual host.
   */
  async importVhostDefinitions(
    vhost: string,
    definitions: VhostDefinitions | FormData
  ): Promise<void> {
    await this.client.request<void>(`/api/definitions/${encodeVhost(vhost)}`, {
      method: 'POST',
      body: definitions,
    });
  }
}
