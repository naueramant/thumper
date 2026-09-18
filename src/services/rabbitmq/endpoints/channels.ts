import type { RabbitMQClient } from '../client.ts';
import type { Channel } from '../types/channel.ts';
import type { ListQueryOptions, PaginatedResult } from '../types/common.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class ChannelsApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all open AMQP channels across the cluster.
   */
  async getChannels(options?: ListQueryOptions): Promise<Channel[] | PaginatedResult<Channel>> {
    return this.client.request<Channel[] | PaginatedResult<Channel>>('/api/channels', {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Lists all open AMQP channels within a specific virtual host.
   */
  async getChannelsByVhost(
    vhost: string,
    options?: ListQueryOptions
  ): Promise<Channel[] | PaginatedResult<Channel>> {
    return this.client.request<Channel[] | PaginatedResult<Channel>>(
      `/api/vhosts/${encodeVhost(vhost)}/channels`,
      {
        query: options as Record<string, unknown>,
      }
    );
  }

  /**
   * Retrieves an individual channel by its name/id.
   */
  async getChannel(nameOrId: string): Promise<Channel> {
    return this.client.request<Channel>(`/api/channels/${encodeName(nameOrId)}`);
  }
}
