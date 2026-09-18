import type { RabbitMQClient } from '../client.ts';
import type {
  Permission,
  SetPermissionRequest,
  SetTopicPermissionRequest,
  TopicPermission,
} from '../types/permissions.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class PermissionsApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all permissions for all users across all virtual hosts.
   */
  async getPermissions(): Promise<Permission[]> {
    return this.client.request<Permission[]>('/api/permissions');
  }

  /**
   * Retrieves permissions for a specific user in a virtual host.
   */
  async getPermission(vhost: string, user: string): Promise<Permission> {
    return this.client.request<Permission>(
      `/api/permissions/${encodeVhost(vhost)}/${encodeName(user)}`
    );
  }

  /**
   * Sets permissions for a user in a virtual host.
   */
  async setPermission(vhost: string, user: string, data: SetPermissionRequest): Promise<void> {
    await this.client.request<void>(
      `/api/permissions/${encodeVhost(vhost)}/${encodeName(user)}`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  /**
   * Clears permissions for a user in a virtual host.
   */
  async deletePermission(vhost: string, user: string): Promise<void> {
    await this.client.request<void>(
      `/api/permissions/${encodeVhost(vhost)}/${encodeName(user)}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Lists all topic permissions for all users in all virtual hosts.
   */
  async getTopicPermissions(): Promise<TopicPermission[]> {
    return this.client.request<TopicPermission[]>('/api/topic-permissions');
  }

  /**
   * Retrieves topic permissions for a specific user in a virtual host.
   */
  async getTopicPermission(vhost: string, user: string): Promise<TopicPermission[]> {
    return this.client.request<TopicPermission[]>(
      `/api/topic-permissions/${encodeVhost(vhost)}/${encodeName(user)}`
    );
  }

  /**
   * Sets topic permissions for a user in a virtual host.
   */
  async setTopicPermission(
    vhost: string,
    user: string,
    data: SetTopicPermissionRequest
  ): Promise<void> {
    await this.client.request<void>(
      `/api/topic-permissions/${encodeVhost(vhost)}/${encodeName(user)}`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  /**
   * Clears topic permissions for a user in a virtual host.
   */
  async deleteTopicPermission(vhost: string, user: string): Promise<void> {
    await this.client.request<void>(
      `/api/topic-permissions/${encodeVhost(vhost)}/${encodeName(user)}`,
      {
        method: 'DELETE',
      }
    );
  }
}
