import type { RabbitMQClient } from '../client.ts';
import type { Permission, TopicPermission } from '../types/permissions.ts';
import type { Queue } from '../types/queue.ts';
import type {
  CreateUserRequest,
  User,
  UserLimit,
} from '../types/user.ts';
import { encodeName } from '../utils.ts';

export class UsersApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all users in the RabbitMQ internal database.
   */
  async getUsers(): Promise<User[]> {
    return this.client.request<User[]>('/api/users');
  }

  /**
   * Lists all users who do not have permissions in any virtual host.
   */
  async getUsersWithoutPermissions(): Promise<User[]> {
    return this.client.request<User[]>('/api/users/without-permissions');
  }

  /**
   * Retrieves an individual user by name.
   */
  async getUser(name: string): Promise<User> {
    return this.client.request<User>(`/api/users/${encodeName(name)}`);
  }

  /**
   * Creates or updates a user with password / password_hash and tags.
   */
  async createUser(name: string, data: CreateUserRequest): Promise<void> {
    const payload = {
      ...data,
      tags: Array.isArray(data.tags) ? data.tags.join(',') : data.tags,
    };
    await this.client.request<void>(`/api/users/${encodeName(name)}`, {
      method: 'PUT',
      body: payload,
    });
  }

  /**
   * Deletes a user.
   */
  async deleteUser(name: string): Promise<void> {
    await this.client.request<void>(`/api/users/${encodeName(name)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Deletes multiple users in bulk.
   */
  async bulkDeleteUsers(users: string[]): Promise<void> {
    await this.client.request<void>('/api/users/bulk-delete', {
      method: 'POST',
      body: { users },
    });
  }

  /**
   * Lists permissions for an individual user across all virtual hosts.
   */
  async getUserPermissions(name: string): Promise<Permission[]> {
    return this.client.request<Permission[]>(`/api/users/${encodeName(name)}/permissions`);
  }

  /**
   * Lists topic permissions for an individual user across all virtual hosts.
   */
  async getUserTopicPermissions(name: string): Promise<TopicPermission[]> {
    return this.client.request<TopicPermission[]>(
      `/api/users/${encodeName(name)}/topic-permissions`
    );
  }

  /**
   * Lists queues declared by a specific user.
   */
  async getUserQueues(name: string): Promise<Queue[]> {
    return this.client.request<Queue[]>(`/api/users/${encodeName(name)}/queues`);
  }

  /**
   * Lists all user limits, or limits for a specific user.
   */
  async getUserLimits(user?: string): Promise<UserLimit[] | UserLimit> {
    const path = user ? `/api/user-limits/${encodeName(user)}` : '/api/user-limits';
    return this.client.request<UserLimit[] | UserLimit>(path);
  }

  /**
   * Sets a specific per-user limit (e.g. max-connections, max-channels).
   */
  async setUserLimit(user: string, name: string, value: number): Promise<void> {
    await this.client.request<void>(
      `/api/user-limits/${encodeName(user)}/${encodeName(name)}`,
      {
        method: 'PUT',
        body: { value },
      }
    );
  }

  /**
   * Deletes a per-user limit.
   */
  async deleteUserLimit(user: string, name: string): Promise<void> {
    await this.client.request<void>(
      `/api/user-limits/${encodeName(user)}/${encodeName(name)}`,
      {
        method: 'DELETE',
      }
    );
  }
}
