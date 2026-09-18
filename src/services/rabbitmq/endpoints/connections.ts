import type { RabbitMQClient } from '../client.ts';
import type { Channel } from '../types/channel.ts';
import type { ListQueryOptions, PaginatedResult } from '../types/common.ts';
import type { Connection } from '../types/connection.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class ConnectionsApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all open TCP/TLS connections to the cluster.
   */
  async getConnections(options?: ListQueryOptions): Promise<Connection[] | PaginatedResult<Connection>> {
    return this.client.request<Connection[] | PaginatedResult<Connection>>('/api/connections', {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Lists all open connections within a specific virtual host.
   */
  async getConnectionsByVhost(
    vhost: string,
    options?: ListQueryOptions
  ): Promise<Connection[] | PaginatedResult<Connection>> {
    return this.client.request<Connection[] | PaginatedResult<Connection>>(
      `/api/vhosts/${encodeVhost(vhost)}/connections`,
      {
        query: options as Record<string, unknown>,
      }
    );
  }

  /**
   * Retrieves an individual connection by its name.
   */
  async getConnection(name: string): Promise<Connection> {
    return this.client.request<Connection>(`/api/connections/${encodeName(name)}`);
  }

  /**
   * Closes an individual connection.
   */
  async closeConnection(name: string, reason = 'Closed via Management API'): Promise<void> {
    await this.client.request<void>(`/api/connections/${encodeName(name)}`, {
      method: 'DELETE',
      headers: {
        'X-Reason': reason,
      },
    });
  }

  /**
   * Lists all connections established by a specific username.
   */
  async getConnectionsByUsername(username: string): Promise<Connection[]> {
    return this.client.request<Connection[]>(`/api/connections/username/${encodeName(username)}`);
  }

  /**
   * Closes all connections established by a specific username.
   */
  async closeConnectionsByUsername(username: string, reason = 'Closed via Management API'): Promise<void> {
    await this.client.request<void>(`/api/connections/username/${encodeName(username)}`, {
      method: 'DELETE',
      headers: {
        'X-Reason': reason,
      },
    });
  }

  /**
   * Lists all channels opened over a specific connection.
   */
  async getConnectionChannels(name: string): Promise<Channel[]> {
    return this.client.request<Channel[]>(`/api/connections/${encodeName(name)}/channels`);
  }
}
