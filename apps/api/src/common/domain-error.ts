/**
 * Application-level error with a machine-readable code, HTTP status, and
 * optional structured details.  Throw this from service / use-case layers
 * so the ApiExceptionFilter can map it to the correct envelope.
 */
export class DomainError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: unknown;

  constructor(code: string, status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.details = details;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
