import type { RabbitMQClient } from '../client.ts';
import type { Binding } from '../types/binding.ts';
import type { ListQueryOptions, PaginatedResult } from '../types/common.ts';
import type {
  CreateQueueRequest,
  GetMessagesRequest,
  PurgeQueueResponse,
  Queue,
  QueueMessage,
} from '../types/queue.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class QueuesApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all queues across the cluster.
   */
  async getQueues(options?: ListQueryOptions): Promise<Queue[] | PaginatedResult<Queue>> {
    return this.client.request<Queue[] | PaginatedResult<Queue>>('/api/queues', {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Lists queues with detailed consumer and channel metrics.
   */
  async getQueuesDetailed(options?: ListQueryOptions): Promise<Queue[] | PaginatedResult<Queue>> {
    return this.client.request<Queue[] | PaginatedResult<Queue>>('/api/queues/detailed', {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Lists all queues within a specific virtual host.
   */
  async getQueuesByVhost(
    vhost: string,
    options?: ListQueryOptions
  ): Promise<Queue[] | PaginatedResult<Queue>> {
    return this.client.request<Queue[] | PaginatedResult<Queue>>(
      `/api/queues/${encodeVhost(vhost)}`,
      {
        query: options as Record<string, unknown>,
      }
    );
  }

  /**
   * Retrieves an individual queue by virtual host and name.
   */
  async getQueue(vhost: string, name: string): Promise<Queue> {
    return this.client.request<Queue>(
      `/api/queues/${encodeVhost(vhost)}/${encodeName(name)}`
    );
  }

  /**
   * Declares (creates) a queue.
   */
  async createQueue(vhost: string, name: string, data: CreateQueueRequest): Promise<void> {
    await this.client.request<void>(
      `/api/queues/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  /**
   * Deletes a queue.
   */
  async deleteQueue(
    vhost: string,
    name: string,
    options?: { if_empty?: boolean; if_unused?: boolean }
  ): Promise<void> {
    await this.client.request<void>(
      `/api/queues/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'DELETE',
        query: options,
      }
    );
  }

  /**
   * Purges all messages from a queue.
   */
  async purgeQueue(vhost: string, name: string): Promise<PurgeQueueResponse> {
    return this.client.request<PurgeQueueResponse>(
      `/api/queues/${encodeVhost(vhost)}/${encodeName(name)}/contents`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Consumes/peeks messages from a queue.
   */
  async getMessages(
    vhost: string,
    name: string,
    options: GetMessagesRequest
  ): Promise<QueueMessage[]> {
    return this.client.request<QueueMessage[]>(
      `/api/queues/${encodeVhost(vhost)}/${encodeName(name)}/get`,
      {
        method: 'POST',
        body: options,
      }
    );
  }

  /**
   * Lists all bindings for a specific queue.
   */
  async getBindings(vhost: string, name: string): Promise<Binding[]> {
    return this.client.request<Binding[]>(
      `/api/queues/${encodeVhost(vhost)}/${encodeName(name)}/bindings`
    );
  }

  /**
   * Synchronises or cancels synchronisation of a classic mirrored queue.
   */
  async syncQueue(vhost: string, name: string, action: 'sync' | 'cancel_sync'): Promise<void> {
    await this.client.request<void>(
      `/api/queues/${encodeVhost(vhost)}/${encodeName(name)}/actions`,
      {
        method: 'POST',
        body: { action },
      }
    );
  }
}
