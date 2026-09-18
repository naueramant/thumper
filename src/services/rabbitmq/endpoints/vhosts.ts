import type { RabbitMQClient } from '../client.ts';
import type { ListQueryOptions } from '../types/common.ts';
import type { Permission, TopicPermission } from '../types/permissions.ts';
import type { CreateVhostRequest, Vhost } from '../types/vhost.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class VhostsApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all virtual hosts in the cluster.
   */
  async getVhosts(options?: ListQueryOptions): Promise<Vhost[]> {
    return this.client.request<Vhost[]>('/api/vhosts', {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Retrieves details of an individual virtual host.
   */
  async getVhost(name: string): Promise<Vhost> {
    return this.client.request<Vhost>(`/api/vhosts/${encodeVhost(name)}`);
  }

  /**
   * Creates a virtual host.
   */
  async createVhost(name: string, data?: CreateVhostRequest): Promise<void> {
    await this.client.request<void>(`/api/vhosts/${encodeVhost(name)}`, {
      method: 'PUT',
      body: data ?? {},
    });
  }

  /**
   * Deletes a virtual host and all its queues, exchanges, and bindings.
   */
  async deleteVhost(name: string): Promise<void> {
    await this.client.request<void>(`/api/vhosts/${encodeVhost(name)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Lists permissions for all users in a virtual host.
   */
  async getVhostPermissions(name: string): Promise<Permission[]> {
    return this.client.request<Permission[]>(`/api/vhosts/${encodeVhost(name)}/permissions`);
  }

  /**
   * Lists topic permissions in a virtual host.
   */
  async getVhostTopicPermissions(name: string): Promise<TopicPermission[]> {
    return this.client.request<TopicPermission[]>(
      `/api/vhosts/${encodeVhost(name)}/topic-permissions`
    );
  }

  /**
   * Starts a virtual host on a stopped node.
   */
  async startVhostOnNode(vhost: string, node: string): Promise<void> {
    await this.client.request<void>(
      `/api/vhosts/${encodeVhost(vhost)}/start/${encodeName(node)}`,
      {
        method: 'POST',
      }
    );
  }

  /**
   * Enables deletion protection for a virtual host.
   */
  async enableDeletionProtection(name: string): Promise<void> {
    await this.client.request<void>(`/api/vhosts/${encodeVhost(name)}/deletion/protection`, {
      method: 'POST',
    });
  }

  /**
   * Disables deletion protection for a virtual host.
   */
  async disableDeletionProtection(name: string): Promise<void> {
    await this.client.request<void>(`/api/vhosts/${encodeVhost(name)}/deletion/protection`, {
      method: 'DELETE',
    });
  }
}
