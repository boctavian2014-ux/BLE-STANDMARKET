export type OnlinePing = () => Promise<boolean>;

export async function pingWithTimeout(
  ping: OnlinePing,
  timeoutMs = 3_000,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });
    return await Promise.race([ping(), timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function errorFallbackCopy(error: Error): {
  title: string;
  body: string;
  retryLabel: string;
} {
  return {
    title: "A apărut o eroare",
    body: error.message || "Something went wrong",
    retryLabel: "Reîncearcă",
  };
}
