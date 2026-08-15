import { expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { subscribePostgresChanges } from "./realtime";

test("subscribePostgresChanges binds postgres_changes and removes the channel", () => {
  const calls: string[] = [];
  let handler: (() => void) | undefined;
  const channel = {
    on(
      type: string,
      payload: { table: string; event: string; filter?: string },
      cb: () => void,
    ) {
      calls.push(`${type}:${payload.table}:${payload.event}:${payload.filter ?? ""}`);
      handler = cb;
      return this;
    },
    subscribe() {
      calls.push("subscribe");
      return this;
    },
  };
  const client = {
    channel(name: string) {
      calls.push(`channel:${name}`);
      return channel;
    },
    removeChannel() {
      calls.push("remove");
      return Promise.resolve("ok");
    },
  } as unknown as SupabaseClient;

  let changed = 0;
  const stop = subscribePostgresChanges(
    client,
    "visitor-offers",
    { table: "offers", event: "*", filter: "status=eq.active" },
    () => {
      changed += 1;
    },
  );
  handler?.();
  stop();

  expect(calls).toEqual([
    "channel:visitor-offers",
    "postgres_changes:offers:*:status=eq.active",
    "subscribe",
    "remove",
  ]);
  expect(changed).toBe(1);
});
