import type { ListQueryOptions } from './types/common.ts';

/**
 * Safely encodes a RabbitMQ virtual host name for API URLs.
 * The default virtual host "/" must be encoded as "%2F".
 */
export function encodeVhost(vhost: string): string {
  if (vhost === '/') {
    return '%2F';
  }
  return encodeURIComponent(vhost);
}

/**
 * Safely encodes resource names (exchanges, queues, users, nodes, etc.) for URL paths.
 */
export function encodeName(name: string): string {
  return encodeURIComponent(name);
}

/**
 * Cross-platform base64 encoder supporting browser and Node.js environments.
 */
export function base64Encode(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)));
  }
  const globalBuffer = (globalThis as { Buffer?: { from: (s: string, enc: string) => { toString: (e: string) => string } } }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(str, 'utf-8').toString('base64');
  }
  throw new Error('No base64 encoding implementation available in this environment');
}

/**
 * Constructs a query string from ListQueryOptions or arbitrary key-value objects.
 */
export function buildQueryParams(params?: ListQueryOptions | Record<string, unknown>): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (key === 'columns') {
      if (Array.isArray(value)) {
        searchParams.set('columns', value.join(','));
      } else {
        searchParams.set('columns', String(value));
      }
    } else if (typeof value === 'boolean') {
      searchParams.set(key, value ? 'true' : 'false');
    } else {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}
