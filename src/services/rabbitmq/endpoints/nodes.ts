import type { RabbitMQClient } from '../client.ts';
import type { ListQueryOptions } from '../types/common.ts';
import type { Node, NodeMemoryBreakdown } from '../types/node.ts';
import { encodeName } from '../utils.ts';

export class NodesApi {
  private readonly client: RabbitMQClient;

  constructor(client: RabbitMQClient) {
    this.client = client;
  }

  /**
   * Lists all nodes in the RabbitMQ cluster with metrics.
   */
  async getNodes(options?: ListQueryOptions): Promise<Node[]> {
    return this.client.request<Node[]>('/api/nodes', {
      query: options as Record<string, unknown>,
    });
  }

  /**
   * Returns metrics and status of an individual cluster node.
   */
  async getNode(name: string, options?: { memory?: boolean }): Promise<Node> {
    return this.client.request<Node>(`/api/nodes/${encodeName(name)}`, {
      query: options,
    });
  }

  /**
   * Returns detailed memory breakdown of an individual cluster node.
   */
  async getNodeMemory(name: string): Promise<NodeMemoryBreakdown> {
    return this.client.request<NodeMemoryBreakdown>(`/api/nodes/${encodeName(name)}/memory`);
  }
}
