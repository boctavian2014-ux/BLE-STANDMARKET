export const QUERY_RETRY = 2;
export const QUERY_STALE_MS = 15_000;

export const appQueryClientOptions = {
  defaultOptions: {
    queries: {
      retry: QUERY_RETRY,
      retryDelay: (attempt: number) => Math.min(1_000 * 2 ** attempt, 8_000),
      staleTime: QUERY_STALE_MS,
      networkMode: "offlineFirst" as const,
    },
    mutations: {
      retry: 0,
      networkMode: "offlineFirst" as const,
    },
  },
};
