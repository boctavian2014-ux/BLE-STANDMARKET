import { expect, test } from "bun:test";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createAuthController } from "./auth";

function sessionStub(email: string): Session {
  return {
    access_token: "access",
    refresh_token: "refresh",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "user-1", email } as Session["user"],
  } as Session;
}

test("signIn returns the mocked session and does not call the network", async () => {
  const session = sessionStub("visitor@local.test");
  const client = {
    auth: {
      signInWithPassword: async () => ({ data: { session }, error: null }),
    },
  } as unknown as SupabaseClient;

  const auth = createAuthController(client);
  await expect(auth.signIn("visitor@local.test", "secret")).resolves.toEqual(
    session,
  );
});

test("signOut surfaces auth errors", async () => {
  const client = {
    auth: {
      signOut: async () => ({ error: new Error("not signed in") }),
    },
  } as unknown as SupabaseClient;

  const auth = createAuthController(client);
  await expect(auth.signOut()).rejects.toThrow("not signed in");
});

test("subscribe forwards session updates from the mock client", () => {
  let listener: ((event: string, session: Session | null) => void) | undefined;
  const client = {
    auth: {
      onAuthStateChange: (cb: (event: string, session: Session | null) => void) => {
        listener = cb;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  } as unknown as SupabaseClient;

  const auth = createAuthController(client);
  let seen: Session | null | undefined;
  const stop = auth.subscribe((next) => {
    seen = next;
  });
  listener?.("SIGNED_IN", sessionStub("a@b.c"));
  expect(seen?.user.email).toBe("a@b.c");
  stop();
});
