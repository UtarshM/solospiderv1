export type ServiceErrorCode =
  | "AUTH_EXPIRED"
  | "TIMEOUT"
  | "ABORTED"
  | "NETWORK"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UNKNOWN";

export class ServiceError extends Error {
  code: ServiceErrorCode;
  status?: number;

  constructor(message: string, code: ServiceErrorCode, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function mapServiceError(err: unknown): ServiceError {
  if (err instanceof ServiceError) return err;

  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("jwt expired") || lower.includes("auth") || lower.includes("refresh token")) {
    return new ServiceError(msg, "AUTH_EXPIRED", 401);
  }
  if (lower.includes("timeout")) return new ServiceError(msg, "TIMEOUT");
  if (lower.includes("abort")) return new ServiceError(msg, "ABORTED");
  if (lower.includes("failed to fetch") || lower.includes("network")) return new ServiceError(msg, "NETWORK");

  return new ServiceError(msg, "UNKNOWN");
}
