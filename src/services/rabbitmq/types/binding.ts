export type BindingDestinationType = 'queue' | 'exchange';

export interface Binding {
  source: string;
  vhost: string;
  destination: string;
  destination_type: BindingDestinationType;
  routing_key: string;
  arguments: Record<string, unknown>;
  properties_key: string;
}

export interface CreateBindingRequest {
  routing_key?: string;
  arguments?: Record<string, unknown>;
}
