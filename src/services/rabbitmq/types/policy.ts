export type PolicyApplyTo = 'all' | 'queues' | 'exchanges' | 'classic_queues' | 'quorum_queues' | 'streams' | string;

export interface Policy {
  vhost: string;
  name: string;
  pattern: string;
  apply_to: PolicyApplyTo;
  definition: Record<string, unknown>;
  priority: number;
}

export interface CreatePolicyRequest {
  pattern: string;
  definition: Record<string, unknown>;
  priority?: number;
  'apply-to'?: PolicyApplyTo;
}

export interface OperatorPolicy {
  vhost: string;
  name: string;
  pattern: string;
  apply_to: PolicyApplyTo;
  definition: Record<string, unknown>;
  priority: number;
}

export interface CreateOperatorPolicyRequest {
  pattern: string;
  definition: Record<string, unknown>;
  priority?: number;
  'apply-to'?: PolicyApplyTo;
}
