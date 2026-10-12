/** Body of an error response from the ParserBee API. */
export interface ErrorBody {
  error?: string;
  code?: string;
  [key: string]: unknown;
}

/** Base class for every error the client throws. */
export class ParserBeeError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly body: ErrorBody;

  constructor(message: string, options: { code?: string; status?: number; body?: ErrorBody } = {}) {
    super(message);
    this.name = new.target.name;
    this.code = options.code;
    this.status = options.status;
    this.body = options.body ?? {};
  }
}

/** The request is missing a field or the file is not accepted (HTTP 400). */
export class InvalidRequestError extends ParserBeeError {}

/** The API key is missing or invalid (HTTP 401). */
export class AuthenticationError extends ParserBeeError {}

/** The account has no page credits left (HTTP 402). */
export class InsufficientCreditsError extends ParserBeeError {
  get creditsRemaining(): number | undefined {
    const value = this.body.credits_remaining;
    return typeof value === "number" ? value : undefined;
  }
}

/** No active subscription, or the account is locked (HTTP 403). */
export class PermissionDeniedError extends ParserBeeError {}

/** The template or activity record does not exist (HTTP 404). */
export class NotFoundError extends ParserBeeError {}

/** Any other error returned by the API, including server errors. */
export class APIError extends ParserBeeError {}

/** The request did not reach the API (network error or timeout). */
export class APIConnectionError extends ParserBeeError {}

const STATUS_ERRORS: Record<number, typeof ParserBeeError> = {
  400: InvalidRequestError,
  401: AuthenticationError,
  402: InsufficientCreditsError,
  403: PermissionDeniedError,
  404: NotFoundError,
};

export function errorForStatus(status: number, body: ErrorBody): ParserBeeError {
  const ErrorClass = STATUS_ERRORS[status] ?? APIError;
  const message = body.error ?? `ParserBee API returned HTTP ${status}`;
  return new ErrorClass(message, { code: body.code, status, body });
}
