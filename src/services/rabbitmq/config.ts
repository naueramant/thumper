export interface RabbitMQClientOptions {
  /**
   * RabbitMQ Management API base URL (e.g. "http://localhost:15672" or "/api" if behind proxy)
   * Defaults to "http://localhost:15672"
   */
  baseUrl?: string;

  /**
   * RabbitMQ username for Basic Auth. Defaults to "guest".
   */
  username?: string;

  /**
   * RabbitMQ password for Basic Auth. Defaults to "guest".
   */
  password?: string;

  /**
   * Bearer token (JWT / OAuth2) if RabbitMQ is configured with oauth2/oidc authentication.
   * If provided, takes precedence over Basic Auth username/password.
   */
  token?: string;

  /**
   * Request timeout in milliseconds. Defaults to 30,000ms.
   */
  timeoutMs?: number;

  /**
   * Custom HTTP headers included with every request.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation (optional, falls back to globalThis.fetch).
   */
  fetch?: typeof fetch;
}

export interface ResolvedRabbitMQClientConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  token?: string;
  timeoutMs: number;
  headers: Record<string, string>;
  fetch: typeof fetch;
}

export function resolveConfig(options?: RabbitMQClientOptions): ResolvedRabbitMQClientConfig {
  let rawBaseUrl = options?.baseUrl ?? (typeof window !== 'undefined' ? '' : 'http://localhost:15672');
  if (typeof window !== 'undefined' && (rawBaseUrl === 'http://localhost:15672' || rawBaseUrl === 'http://127.0.0.1:15672')) {
    rawBaseUrl = '';
  }
  // Remove trailing slashes
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  return {
    baseUrl,
    username: options?.username ?? (options?.token ? undefined : 'guest'),
    password: options?.password ?? (options?.token ? undefined : 'guest'),
    token: options?.token,
    timeoutMs: options?.timeoutMs ?? 30000,
    headers: options?.headers ?? {},
    fetch: options?.fetch ?? (typeof globalThis !== 'undefined' ? globalThis.fetch.bind(globalThis) : fetch),
  };
}
