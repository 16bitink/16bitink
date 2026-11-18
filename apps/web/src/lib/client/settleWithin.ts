/**
 * Waits for a best-effort browser call, but never longer than `ms`, and never fails.
 * Android Chrome can leave screen.orientation.lock() pending for as long as the page
 * is fullscreen: awaited bare, it held the game on the loading screen until the
 * player left fullscreen (which aborts the lock).
 */
export function settleWithin(task: Promise<unknown> | (() => Promise<unknown> | undefined), ms: number): Promise<void> {
  let pending: Promise<unknown> | undefined;
  try {
    pending = typeof task === 'function' ? task() : task;
  } catch {
    return Promise.resolve();
  }
  if (!pending) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    const done = (): void => {
      clearTimeout(timer);
      resolve();
    };
    pending.then(done, done);
  });
}
