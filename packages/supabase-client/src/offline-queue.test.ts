import { expect, test } from "bun:test";
import {
  createMemoryStore,
  enqueueMutation,
  flushOfflineQueue,
  readOfflineQueue,
} from "./offline-queue";

test("enqueueMutation persists items and flushOfflineQueue retries handlers", async () => {
  const store = createMemoryStore();
  await enqueueMutation(store, { name: "redeem", payload: { offerId: "1" } });
  await enqueueMutation(store, { name: "unknown", payload: {} });
  expect(await readOfflineQueue(store)).toHaveLength(2);

  const seen: unknown[] = [];
  const result = await flushOfflineQueue(store, {
    redeem: async (payload) => {
      seen.push(payload);
    },
  });
  expect(result).toEqual({ flushed: 1, remaining: 1 });
  expect(seen).toEqual([{ offerId: "1" }]);
  expect((await readOfflineQueue(store))[0]?.name).toBe("unknown");
});

test("flushOfflineQueue keeps items when the handler throws", async () => {
  const store = createMemoryStore();
  await enqueueMutation(store, { name: "save", payload: { id: 1 } });
  const result = await flushOfflineQueue(store, {
    save: async () => {
      throw new Error("offline");
    },
  });
  expect(result.flushed).toBe(0);
  expect(result.remaining).toBe(1);
});
