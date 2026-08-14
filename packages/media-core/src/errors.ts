/**
 * Base class for all SDK errors.
 * Preserves the original error chain and adds SDK-specific context.
 */
export class MediaError extends Error {
  readonly code: string;
  readonly cause: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'MediaError';
    this.code = code;
    this.cause = cause;
    // Restore prototype chain (needed for instanceof checks in transpiled code)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the API key is missing, invalid, or rejected by Pexels (401).
 */
export class AuthError extends MediaError {
  constructor(message = 'Invalid or missing Pexels API key', cause?: unknown) {
    super(message, 'AUTH_ERROR', cause);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a network request fails (fetch rejected, timeout, CORS, etc.).
 */
export class NetworkError extends MediaError {
  constructor(message = 'Network request failed', cause?: unknown) {
    super(message, 'NETWORK_ERROR', cause);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the API returns 404.
 */
export class NotFoundError extends MediaError {
  readonly resourceId: number | string;

  constructor(resourceId: number | string, cause?: unknown) {
    super(`Resource not found: ${String(resourceId)}`, 'NOT_FOUND', cause);
    this.name = 'NotFoundError';
    this.resourceId = resourceId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the API returns a non-success status that isn't specifically handled.
 */
export class ApiError extends MediaError {
  readonly status: number;

  constructor(status: number, message?: string, cause?: unknown) {
    super(message ?? `Pexels API error: HTTP ${status}`, 'API_ERROR', cause);
    this.name = 'ApiError';
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
