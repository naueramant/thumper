import type { RabbitMQClient } from '../client.ts';
import type {
  DeprecatedFeature,
  FeatureFlag,
  FederationLink,
  GlobalParameter,
  Parameter,
} from '../types/parameter.ts';
import type { VhostLimit } from '../types/vhost.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class ParametersApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all parameters across all components and virtual hosts.
   */
  async getParameters(component?: string, vhost?: string): Promise<Parameter[]> {
    let path = '/api/parameters';
    if (component && vhost) {
      path = `/api/parameters/${encodeName(component)}/${encodeVhost(vhost)}`;
    } else if (component) {
      path = `/api/parameters/${encodeName(component)}`;
    }
    return this.client.request<Parameter[]>(path);
  }

  /**
   * Retrieves an individual parameter by component, vhost, and name.
   */
  async getParameter<T = unknown>(
    component: string,
    vhost: string,
    name: string
  ): Promise<Parameter<T>> {
    return this.client.request<Parameter<T>>(
      `/api/parameters/${encodeName(component)}/${encodeVhost(vhost)}/${encodeName(name)}`
    );
  }

  /**
   * Sets a parameter for a component in a virtual host.
   */
  async setParameter(
    component: string,
    vhost: string,
    name: string,
    value: unknown
  ): Promise<void> {
    await this.client.request<void>(
      `/api/parameters/${encodeName(component)}/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'PUT',
        body: { value },
      }
    );
  }

  /**
   * Clears a parameter.
   */
  async deleteParameter(component: string, vhost: string, name: string): Promise<void> {
    await this.client.request<void>(
      `/api/parameters/${encodeName(component)}/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Lists all cluster-wide global parameters.
   */
  async getGlobalParameters(): Promise<GlobalParameter[]> {
    return this.client.request<GlobalParameter[]>('/api/global-parameters');
  }

  /**
   * Retrieves a cluster-wide global parameter by name.
   */
  async getGlobalParameter<T = unknown>(name: string): Promise<GlobalParameter<T>> {
    return this.client.request<GlobalParameter<T>>(
      `/api/global-parameters/${encodeName(name)}`
    );
  }

  /**
   * Sets a cluster-wide global parameter.
   */
  async setGlobalParameter(name: string, value: unknown): Promise<void> {
    await this.client.request<void>(`/api/global-parameters/${encodeName(name)}`, {
      method: 'PUT',
      body: { value },
    });
  }

  /**
   * Deletes a cluster-wide global parameter.
   */
  async deleteGlobalParameter(name: string): Promise<void> {
    await this.client.request<void>(`/api/global-parameters/${encodeName(name)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Lists all feature flags and their enablement state.
   */
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return this.client.request<FeatureFlag[]>('/api/feature-flags');
  }

  /**
   * Enables a specific feature flag.
   */
  async enableFeatureFlag(name: string): Promise<void> {
    await this.client.request<void>(`/api/feature-flags/${encodeName(name)}/enable`, {
      method: 'PUT',
    });
  }

  /**
   * Lists deprecated features, or only those currently in use.
   */
  async getDeprecatedFeatures(usedOnly = false): Promise<DeprecatedFeature[]> {
    const path = usedOnly ? '/api/deprecated-features/used' : '/api/deprecated-features';
    return this.client.request<DeprecatedFeature[]>(path);
  }

  /**
   * Lists federation links across the cluster or within a specific virtual host.
   */
  async getFederationLinks(vhost?: string): Promise<FederationLink[]> {
    const path = vhost
      ? `/api/federation-links/${encodeVhost(vhost)}`
      : '/api/federation-links';
    return this.client.request<FederationLink[]>(path);
  }

  /**
   * Lists virtual host limits.
   */
  async getVhostLimits(vhost?: string): Promise<VhostLimit[] | VhostLimit> {
    const path = vhost ? `/api/vhost-limits/${encodeVhost(vhost)}` : '/api/vhost-limits';
    return this.client.request<VhostLimit[] | VhostLimit>(path);
  }

  /**
   * Sets a limit for a virtual host (e.g. max-connections, max-queues).
   */
  async setVhostLimit(vhost: string, name: string, value: number): Promise<void> {
    await this.client.request<void>(
      `/api/vhost-limits/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'PUT',
        body: { value },
      }
    );
  }

  /**
   * Deletes a limit for a virtual host.
   */
  async deleteVhostLimit(vhost: string, name: string): Promise<void> {
    await this.client.request<void>(
      `/api/vhost-limits/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'DELETE',
      }
    );
  }
}
