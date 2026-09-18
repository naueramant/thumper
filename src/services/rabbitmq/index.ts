import { RabbitMQClient } from './client.ts';
import type { RabbitMQClientOptions } from './config.ts';

/**
 * Factory function to create a configured RabbitMQClient instance.
 */
export function createRabbitMQClient(options?: RabbitMQClientOptions): RabbitMQClient {
  return new RabbitMQClient(options);
}

export { RabbitMQClient };
export type { RequestOptions } from './client.ts';
export * from './config.ts';
export * from './errors.ts';
export * from './utils.ts';
export * from './types/index.ts';
export * from './endpoints/index.ts';
