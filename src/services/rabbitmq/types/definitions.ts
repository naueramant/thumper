import type { Binding } from './binding.ts';
import type { Exchange } from './exchange.ts';
import type { GlobalParameter, Parameter } from './parameter.ts';
import type { Permission, TopicPermission } from './permissions.ts';
import type { Policy } from './policy.ts';
import type { Queue } from './queue.ts';
import type { User } from './user.ts';

export interface Definitions {
  rabbit_version?: string;
  rabbitmq_version?: string;
  users?: User[];
  vhosts?: Array<{ name: string; tracing?: boolean }>;
  permissions?: Permission[];
  topic_permissions?: TopicPermission[];
  parameters?: Parameter[];
  global_parameters?: GlobalParameter[];
  policies?: Policy[];
  queues?: Queue[];
  exchanges?: Exchange[];
  bindings?: Binding[];
}

export interface VhostDefinitions {
  permissions?: Permission[];
  topic_permissions?: TopicPermission[];
  parameters?: Parameter[];
  policies?: Policy[];
  queues?: Queue[];
  exchanges?: Exchange[];
  bindings?: Binding[];
}
