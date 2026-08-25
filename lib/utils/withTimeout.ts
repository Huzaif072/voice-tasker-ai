export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message = "Operation timed out"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(resolve, reject).finally(() => {
      if (timer) clearTimeout(timer);
    });
  });
}
