export type UserTag = 'administrator' | 'monitoring' | 'policymaker' | 'management' | 'impersonator' | string;

export interface User {
  name: string;
  password_hash: string;
  hashing_algorithm?: string;
  tags: string[];
  limits?: Record<string, unknown>;
}

export interface CreateUserRequest {
  password?: string;
  password_hash?: string;
  hashing_algorithm?: string;
  tags: string | string[];
}

export interface BulkDeleteUsersRequest {
  users: string[];
}

export interface UserLimit {
  user: string;
  value: {
    'max-connections'?: number;
    'max-channels'?: number;
    [key: string]: unknown;
  };
}

export interface SetUserLimitRequest {
  value: number;
}
