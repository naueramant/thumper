export interface Parameter<T = unknown> {
  component: string;
  vhost: string;
  name: string;
  value: T;
}

export interface SetParameterRequest<T = unknown> {
  value: T;
}

export interface GlobalParameter<T = unknown> {
  name: string;
  value: T;
}

export interface SetGlobalParameterRequest<T = unknown> {
  value: T;
}

export interface FeatureFlag {
  name: string;
  desc?: string;
  doc_url?: string;
  state: 'enabled' | 'disabled' | 'unsupported';
  stability?: 'stable' | 'experimental' | string;
  provided_by?: string;
}

export interface DeprecatedFeature {
  name: string;
  desc?: string;
}

export interface FederationLink {
  vhost: string;
  connection?: string;
  upstream: string;
  exchange?: string;
  queue?: string;
  status: string;
  type: string;
  timestamp?: string;
  error?: string;
}
