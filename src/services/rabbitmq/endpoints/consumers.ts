import type { RabbitMQClient } from '../client.ts';
import type { ListQueryOptions } from '../types/common.ts';
import type { Consumer } from '../types/consumer.ts';
import { encodeVhost } from '../utils.ts';

export class ConsumersApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all active consumers across all queues in the cluster.
   */
  async getConsumers(options?: ListQueryOptions): Promise<Consumer[]> {
    return this.client.request<Consumer[]>('/api/consumers', {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Lists all active consumers in a specific virtual host.
   */
  async getConsumersByVhost(vhost: string, options?: ListQueryOptions): Promise<Consumer[]> {
    return this.client.request<Consumer[]>(`/api/consumers/${encodeVhost(vhost)}`, {
      query: options as Record<string, unknown>,
    });
  }
}
