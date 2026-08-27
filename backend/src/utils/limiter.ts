/**
 * Tiny dependency-free concurrency limiter.
 *
 * Used to cap how many heavy media-processing (ffmpeg) pipelines run at once.
 * Uploads themselves are not affected — they go straight to object storage —
 * only the post-upload transcode/thumbnail work is gated. Extra jobs wait in an
 * in-memory FIFO queue and start as slots free up.
 *
 * Note: this queue lives in the Node process. If the process restarts while
 * jobs are queued or running, those jobs are lost (the uploaded file is still
 * in storage but won't be processed until re-triggered). A Redis/BullMQ queue
 * is the durable upgrade when that matters.
 */
export interface Limiter {
  <T>(fn: () => Promise<T>): Promise<T>;
  readonly active: number;
  readonly pending: number;
}

export function createLimiter(maxConcurrent: number, maxQueue = Infinity): Limiter {
  const safeMax = Math.max(1, Math.floor(maxConcurrent));
  let active = 0;
  const queue: Array<() => void> = [];

  const pump = () => {
    if (active >= safeMax) return;
    const job = queue.shift();
    if (!job) return;
    active++;
    job();
  };

  const limit = (<T>(fn: () => Promise<T>): Promise<T> => {
    if (queue.length >= maxQueue) {
      return Promise.reject(
        new Error(`Media processing queue is full (${queue.length}); try again shortly.`)
      );
    }
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        Promise.resolve()
          .then(fn)
          .then(resolve, reject)
          .finally(() => {
            active--;
            pump();
          });
      });
      pump();
    });
  }) as Limiter;

  Object.defineProperty(limit, 'active', { get: () => active });
  Object.defineProperty(limit, 'pending', { get: () => queue.length });
  return limit;
}
