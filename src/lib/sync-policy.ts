// Pure retry/error rules for the sync engine (unit-tested in sync-policy.test.ts).
export const MAX_AUTO_RETRIES = 5;
export const BASE_DELAY_MS = 5000;

export type FailureKind = "auth" | "transient" | "permanent";

/** 401/403 or an expired/invalid JWT pauses the queue; network, timeout, rate-limit and 5xx errors retry; anything else needs a person. */
export function classifyFailure(status: number | undefined, message: string): FailureKind {
  if (status === 401 || status === 403 || /jwt|token.*expired|not authenticated|unauthori[sz]ed/i.test(message)) return "auth";
  if (!status || status >= 500 || status === 408 || status === 429 || /failed to fetch|network|load failed|timeout|aborted/i.test(message)) return "transient";
  return "permanent";
}

/** Delay before automatic retry number `retryCount` (1-based): 5s, 15s, 45s, 135s, 405s; null once the limit is reached. */
export function backoffDelay(retryCount: number): number | null {
  if (retryCount < 1 || retryCount > MAX_AUTO_RETRIES) return null;
  return BASE_DELAY_MS * 3 ** (retryCount - 1);
}
