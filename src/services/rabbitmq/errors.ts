export class RabbitMQError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RabbitMQError';
  }
}

export class RabbitMQApiError extends RabbitMQError {
  readonly status: number;
  readonly statusText: string;
  readonly error?: string;
  readonly reason?: string;
  readonly endpoint?: string;

  constructor(
    message: string,
    status: number,
    statusText: string,
    options?: { error?: string; reason?: string; endpoint?: string }
  ) {
    super(message);
    this.name = 'RabbitMQApiError';
    this.status = status;
    this.statusText = statusText;
    this.error = options?.error;
    this.reason = options?.reason;
    this.endpoint = options?.endpoint;
  }
}

export class AuthenticationError extends RabbitMQApiError {
  constructor(
    message = 'Invalid username or password',
    endpoint?: string,
    options?: { error?: string; reason?: string }
  ) {
    super(message, 401, 'Unauthorized', {
      endpoint,
      reason: options?.reason || 'Unauthorized',
      error: options?.error,
    });
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends RabbitMQApiError {
  constructor(
    message = 'Access forbidden to requested resource',
    endpoint?: string,
    options?: { error?: string; reason?: string }
  ) {
    super(message, 403, 'Forbidden', {
      endpoint,
      reason: options?.reason || 'Forbidden',
      error: options?.error,
    });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends RabbitMQApiError {
  constructor(message = 'Resource not found', endpoint?: string) {
    super(message, 404, 'Not Found', { endpoint, reason: 'Not Found' });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends RabbitMQApiError {
  constructor(message = 'Resource already exists or conflicts with current state', endpoint?: string) {
    super(message, 409, 'Conflict', { endpoint, reason: 'Conflict' });
    this.name = 'ConflictError';
  }
}

export class NetworkError extends RabbitMQError {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}
