export interface Permission {
  user: string;
  vhost: string;
  configure: string;
  write: string;
  read: string;
}

export interface SetPermissionRequest {
  configure: string;
  write: string;
  read: string;
}

export interface TopicPermission {
  user: string;
  vhost: string;
  exchange: string;
  write: string;
  read: string;
}

export interface SetTopicPermissionRequest {
  exchange: string;
  write: string;
  read: string;
}
