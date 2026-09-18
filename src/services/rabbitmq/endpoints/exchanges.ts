import type { RabbitMQClient } from '../client.ts';
import type { Binding } from '../types/binding.ts';
import type { ListQueryOptions, PaginatedResult } from '../types/common.ts';
import type {
  CreateExchangeRequest,
  Exchange,
  PublishMessageRequest,
  PublishMessageResponse,
} from '../types/exchange.ts';
import { encodeName, encodeVhost } from '../utils.ts';

export class ExchangesApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all exchanges in the cluster.
   */
  async getExchanges(options?: ListQueryOptions): Promise<Exchange[] | PaginatedResult<Exchange>> {
    return this.client.request<Exchange[] | PaginatedResult<Exchange>>('/api/exchanges', {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Lists all exchanges in a specific virtual host.
   */
  async getExchangesByVhost(
    vhost: string,
    options?: ListQueryOptions
  ): Promise<Exchange[] | PaginatedResult<Exchange>> {
    return this.client.request<Exchange[] | PaginatedResult<Exchange>>(
      `/api/exchanges/${encodeVhost(vhost)}`,
      {
        query: options as Record<string, unknown>,
      }
    );
  }

  /**
   * Retrieves an exchange by name in a given virtual host.
   */
  async getExchange(vhost: string, name: string): Promise<Exchange> {
    return this.client.request<Exchange>(
      `/api/exchanges/${encodeVhost(vhost)}/${encodeName(name)}`
    );
  }

  /**
   * Declares (creates) an exchange.
   */
  async createExchange(vhost: string, name: string, data: CreateExchangeRequest): Promise<void> {
    await this.client.request<void>(
      `/api/exchanges/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  /**
   * Deletes an exchange.
   */
  async deleteExchange(
    vhost: string,
    name: string,
    options?: { if_unused?: boolean }
  ): Promise<void> {
    await this.client.request<void>(
      `/api/exchanges/${encodeVhost(vhost)}/${encodeName(name)}`,
      {
        method: 'DELETE',
        query: options,
      }
    );
  }

  /**
   * Publishes a message to an exchange.
   */
  async publish(
    vhost: string,
    name: string,
    message: PublishMessageRequest
  ): Promise<PublishMessageResponse> {
    return this.client.request<PublishMessageResponse>(
      `/api/exchanges/${encodeVhost(vhost)}/${encodeName(name)}/publish`,
      {
        method: 'POST',
        body: message,
      }
    );
  }

  /**
   * Lists all bindings where this exchange is the source.
   */
  async getBindingsAsSource(vhost: string, name: string): Promise<Binding[]> {
    return this.client.request<Binding[]>(
      `/api/exchanges/${encodeVhost(vhost)}/${encodeName(name)}/bindings/source`
    );
  }

  /**
   * Lists all bindings where this exchange is the destination.
   */
  async getBindingsAsDestination(vhost: string, name: string): Promise<Binding[]> {
    return this.client.request<Binding[]>(
      `/api/exchanges/${encodeVhost(vhost)}/${encodeName(name)}/bindings/destination`
    );
  }
}
