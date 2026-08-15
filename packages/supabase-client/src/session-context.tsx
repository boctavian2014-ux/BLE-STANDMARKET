import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createAuthController } from "./auth";
import { getSupabaseClient } from "./client";
import type { Session, SessionState } from "./types";

const SessionContext = createContext<
  (SessionState & { signOut: () => Promise<void> }) | null
>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const auth = useMemo(() => createAuthController(getSupabaseClient()), []);

  useEffect(() => {
    let cancelled = false;
    void auth
      .getSession()
      .then((next) => {
        if (!cancelled) {
          setSession(next);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setIsLoading(false);
        }
      });
    const unsubscribe = auth.subscribe((next) => {
      setSession(next);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [auth]);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      signOut: () => auth.signOut(),
    }),
    [auth, isLoading, session],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return value;
}
