// A small request queue that caps concurrent fetches and enforces a minimum
// interval between requests, with exponential-backoff retry for rate-limit
// responses. Shared by every BaseScan / Blockscout call so we stay under the
// provider's ~5 req/s limit even when three actions run in parallel.

export interface RateLimitedFetchOptions {
  maxRetries?: number;
  onRateLimit?: () => void;
}

const MIN_INTERVAL_MS = 220; // ~4.5 req/s — below the documented 5 rps cap
const MAX_CONCURRENT = 2;

type QueuedTask<T> = () => Promise<T>;

let inflight = 0;
let lastRequestAt = 0;
const waiters: Array<() => void> = [];

const acquireSlot = (): Promise<void> =>
  new Promise((resolve) => {
    const tryAcquire = () => {
      const now = Date.now();
      const elapsed = now - lastRequestAt;
      if (inflight < MAX_CONCURRENT && elapsed >= MIN_INTERVAL_MS) {
        inflight += 1;
        lastRequestAt = Date.now();
        resolve();
      } else if (inflight < MAX_CONCURRENT) {
        // slot free but too close to previous request — wait the remainder
        setTimeout(tryAcquire, Math.max(0, MIN_INTERVAL_MS - elapsed));
      } else {
        waiters.push(tryAcquire);
      }
    };
    tryAcquire();
  });

const releaseSlot = () => {
  inflight -= 1;
  const next = waiters.shift();
  if (next) next();
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const runThrottled = async <T>(
  task: QueuedTask<T>,
  isRateLimitError: (err: unknown) => boolean,
  options: RateLimitedFetchOptions = {},
): Promise<T> => {
  const { maxRetries = 4, onRateLimit } = options;
  let attempt = 0;
  for (;;) {
    await acquireSlot();
    try {
      const result = await task();
      return result;
    } catch (err) {
      if (isRateLimitError(err) && attempt < maxRetries) {
        onRateLimit?.();
        const backoff = Math.min(4_000, 2 ** attempt * 300 + Math.random() * 200);
        attempt += 1;
        await sleep(backoff);
        continue;
      }
      throw err;
    } finally {
      releaseSlot();
    }
  }
};
