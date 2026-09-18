import type { RabbitMQClient } from '../client.ts';
import type {
  CreateOperatorPolicyRequest,
  CreatePolicyRequest,
  OperatorPolicy,
  Policy,
} from '../types/policy.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class PoliciesApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all policies across all virtual hosts or within a specific virtual host.
   */
  async getPolicies(vhost?: string): Promise<Policy[]> {
    const path = vhost ? `/api/policies/${encodeVhost(vhost)}` : '/api/policies';
    return this.client.request<Policy[]>(path);
  }

  /**
   * Retrieves a specific policy by virtual host and name.
   */
  async getPolicy(vhost: string, name: string): Promise<Policy> {
    return this.client.request<Policy>(
      `/api/policies/${encodeVhost(vhost)}/${encodeName(name)}`
    );
  }

  /**
   * Creates or updates a policy in a virtual host.
   */
  async setPolicy(vhost: string, name: string, data: CreatePolicyRequest): Promise<void> {
    await this.client.request<void>(
      `/api/policies/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  /**
   * Deletes a policy from a virtual host.
   */
  async deletePolicy(vhost: string, name: string): Promise<void> {
    await this.client.request<void>(
      `/api/policies/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Lists all operator policies across all virtual hosts or within a specific virtual host.
   */
  async getOperatorPolicies(vhost?: string): Promise<OperatorPolicy[]> {
    const path = vhost
      ? `/api/operator-policies/${encodeVhost(vhost)}`
      : '/api/operator-policies';
    return this.client.request<OperatorPolicy[]>(path);
  }

  /**
   * Retrieves an operator policy by virtual host and name.
   */
  async getOperatorPolicy(vhost: string, name: string): Promise<OperatorPolicy> {
    return this.client.request<OperatorPolicy>(
      `/api/operator-policies/${encodeVhost(vhost)}/${encodeName(name)}`
    );
  }

  /**
   * Creates or updates an operator policy in a virtual host.
   */
  async setOperatorPolicy(
    vhost: string,
    name: string,
    data: CreateOperatorPolicyRequest
  ): Promise<void> {
    await this.client.request<void>(
      `/api/operator-policies/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  /**
   * Deletes an operator policy from a virtual host.
   */
  async deleteOperatorPolicy(vhost: string, name: string): Promise<void> {
    await this.client.request<void>(
      `/api/operator-policies/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'DELETE',
      }
    );
  }
}
