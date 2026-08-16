import { expect, test } from "bun:test";
import {
  QUERY_RETRY,
  QUERY_STALE_MS,
  appQueryClientOptions,
} from "./query-client";

test("createAppQueryClient enables retry and offline-first queries", () => {
  const defaults = appQueryClientOptions.defaultOptions;
  expect(defaults.queries.retry).toBe(QUERY_RETRY);
  expect(defaults.queries.staleTime).toBe(QUERY_STALE_MS);
  expect(defaults.queries.networkMode).toBe("offlineFirst");
  expect(defaults.mutations.networkMode).toBe("offlineFirst");
});
