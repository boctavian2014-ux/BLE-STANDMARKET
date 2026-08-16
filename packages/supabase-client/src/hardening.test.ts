import { expect, test } from "bun:test";
import { errorFallbackCopy, pingWithTimeout } from "./hardening";

test("errorFallbackCopy exposes retry UI copy", () => {
  expect(errorFallbackCopy(new Error("boom"))).toEqual({
    title: "A apărut o eroare",
    body: "boom",
    retryLabel: "Reîncearcă",
  });
});

test("pingWithTimeout returns false when ping hangs", async () => {
  const online = await pingWithTimeout(
    () => new Promise(() => undefined),
    20,
  );
  expect(online).toBe(false);
});

test("pingWithTimeout returns ping result", async () => {
  expect(await pingWithTimeout(async () => true, 100)).toBe(true);
  expect(await pingWithTimeout(async () => false, 100)).toBe(false);
});
