import type { RabbitMQClient } from '../client.ts';
import type { Binding, CreateBindingRequest } from '../types/binding.ts';
import type { ListQueryOptions } from '../types/common.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class BindingsApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all bindings across all virtual hosts.
   */
  async getBindings(options?: ListQueryOptions): Promise<Binding[]> {
    return this.client.request<Binding[]>('/api/bindings', {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Lists all bindings within a specific virtual host.
   */
  async getBindingsByVhost(vhost: string, options?: ListQueryOptions): Promise<Binding[]> {
    return this.client.request<Binding[]>(`/api/bindings/${encodeVhost(vhost)}`, {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Lists all bindings between a specific exchange and queue.
   */
  async getQueueBindings(vhost: string, exchange: string, queue: string): Promise<Binding[]> {
    return this.client.request<Binding[]>(
      `/api/bindings/${encodeVhost(vhost)}/e/${encodeName(exchange)}/q/${encodeName(queue)}`
    );
  }

  /**
   * Creates a binding between an exchange and a queue.
   */
  async createQueueBinding(
    vhost: string,
    exchange: string,
    queue: string,
    data?: CreateBindingRequest
  ): Promise<void> {
    await this.client.request<void>(
      `/api/bindings/${encodeVhost(vhost)}/e/${encodeName(exchange)}/q/${encodeName(queue)}`,
      {
        method: 'POST',
        body: data ?? {},
      }
    );
  }

  /**
   * Deletes a binding between an exchange and a queue using its properties key.
   */
  async deleteQueueBinding(
    vhost: string,
    exchange: string,
    queue: string,
    props: string
  ): Promise<void> {
    await this.client.request<void>(
      `/api/bindings/${encodeVhost(vhost)}/e/${encodeName(exchange)}/q/${encodeName(queue)}/${encodeName(props)}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Lists all bindings between two exchanges (exchange-to-exchange).
   */
  async getExchangeBindings(vhost: string, source: string, destination: string): Promise<Binding[]> {
    return this.client.request<Binding[]>(
      `/api/bindings/${encodeVhost(vhost)}/e/${encodeName(source)}/e/${encodeName(destination)}`
    );
  }

  /**
   * Creates a binding between two exchanges.
   */
  async createExchangeBinding(
    vhost: string,
    source: string,
    destination: string,
    data?: CreateBindingRequest
  ): Promise<void> {
    await this.client.request<void>(
      `/api/bindings/${encodeVhost(vhost)}/e/${encodeName(source)}/e/${encodeName(destination)}`,
      {
        method: 'POST',
        body: data ?? {},
      }
    );
  }

  /**
   * Deletes a binding between two exchanges using its properties key.
   */
  async deleteExchangeBinding(
    vhost: string,
    source: string,
    destination: string,
    props: string
  ): Promise<void> {
    await this.client.request<void>(
      `/api/bindings/${encodeVhost(vhost)}/e/${encodeName(source)}/e/${encodeName(destination)}/${encodeName(props)}`,
      {
        method: 'DELETE',
      }
    );
  }
}
