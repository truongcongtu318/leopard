/**
 * Structured error envelope that matches the Leopard API error contract.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly requestId: string | undefined;
  public readonly details: unknown | undefined;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    requestId?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId ?? undefined;
    this.details = details ?? undefined;
  }

  /**
   * Check whether a caught value is an ApiError instance.
   * More reliable than instanceof across Babel/Jest compilation boundaries.
   */
  static isApiError(value: unknown): value is ApiError {
    return value instanceof Error && value.name === "ApiError";
  }

  /**
   * Factory that parses a fetch Response status and body into an ApiError.
   * Falls back to a generic INTERNAL_ERROR when the body is not a valid
   * Leopard error envelope.
   */
  static async fromResponse(
    status: number,
    body: unknown,
  ): Promise<ApiError> {
    if (isApiErrorBody(body)) {
      return new ApiError(
        status,
        body.code,
        body.message,
        body.requestId,
        body.details,
      );
    }

    // Unknown / unexpected response shape
    return new ApiError(
      status,
      "INTERNAL_ERROR",
      typeof body === "string" ? body : JSON.stringify(body),
    );
  }
}

// ---- type guards ----

interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.code === "string" && typeof obj.message === "string";
}

/**
 * Safely parse a response as JSON, falling back to raw text if parsing fails.
 */
export async function safeParseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

