import { mapServiceError, ServiceError } from "./errors";

export async function fetchWithPolicy<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ServiceError(`HTTP ${res.status}: ${body}`, "UNKNOWN", res.status);
    }

    return (await res.json()) as T;
  } catch (err) {
    throw mapServiceError(err);
  } finally {
    clearTimeout(timeoutId);
  }
}
