/**
 * Free-tier keys have tight per-minute limits, and a screen that fires a summary
 * the moment an article opens can trip them in seconds. Requests are therefore
 * run one at a time with a small gap, and a rate-limit response opens a circuit
 * that keeps the app from hammering a key that has already said no.
 */

export class QuotaError extends Error {
  constructor(
    message: string,
    /** Seconds the provider asked us to wait, when it said. */
    readonly retryAfterSec?: number,
    /** true for a daily/lifetime cap rather than a per-minute burst. */
    readonly daily = false,
  ) {
    super(message);
    this.name = 'QuotaError';
  }
}

const MIN_GAP_MS = 1200;
let queue: Promise<unknown> = Promise.resolve();
let lastStart = 0;
let blockedUntil = 0;
let blockedReason: QuotaError | null = null;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Seconds until the provider is worth trying again, or 0. */
export function cooldownRemaining() {
  return Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
}

export function lastQuotaError() {
  return cooldownRemaining() > 0 ? blockedReason : null;
}

export function clearCooldown() {
  blockedUntil = 0;
  blockedReason = null;
}

function open(error: QuotaError) {
  // A daily cap is not worth retrying for a long time; a burst limit clears fast.
  const seconds = error.retryAfterSec ?? (error.daily ? 3600 : 60);
  blockedUntil = Date.now() + seconds * 1000;
  blockedReason = error;
}

/**
 * Serialises provider calls and retries a burst rate-limit once, after the delay
 * the provider asked for. A daily cap is surfaced immediately — waiting will not help.
 */
export async function schedule<T>(task: () => Promise<T>): Promise<T> {
  const remaining = cooldownRemaining();
  if (remaining > 0 && blockedReason) {
    throw new QuotaError(
      `${blockedReason.message} Try again in ${remaining}s.`,
      remaining,
      blockedReason.daily,
    );
  }

  const run = queue.then(async () => {
    const gap = MIN_GAP_MS - (Date.now() - lastStart);
    if (gap > 0) await wait(gap);
    lastStart = Date.now();

    try {
      const result = await task();
      clearCooldown();
      return result;
    } catch (error) {
      if (!(error instanceof QuotaError)) throw error;
      open(error);

      // One automatic retry for a short burst limit, never for a daily cap.
      if (!error.daily && (error.retryAfterSec ?? 0) > 0 && (error.retryAfterSec ?? 0) <= 30) {
        await wait((error.retryAfterSec ?? 1) * 1000 + 500);
        lastStart = Date.now();
        const result = await task();
        clearCooldown();
        return result;
      }
      throw error;
    }
  });

  // Keep the chain alive regardless of this task's outcome.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
