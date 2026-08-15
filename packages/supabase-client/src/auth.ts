import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type AuthChangeHandler = (session: Session | null) => void;

export function createAuthController(client: SupabaseClient) {
  return {
    async getSession(): Promise<Session | null> {
      const { data, error } = await client.auth.getSession();
      if (error) {
        throw error;
      }
      return data.session;
    },
    subscribe(onChange: AuthChangeHandler) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        onChange(session);
      });
      return () => {
        data.subscription.unsubscribe();
      };
    },
    async signIn(email: string, password: string): Promise<Session | null> {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      return data.session;
    },
    async signUp(email: string, password: string): Promise<Session | null> {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      return data.session;
    },
    async signOut(): Promise<void> {
      const { error } = await client.auth.signOut();
      if (error) {
        throw error;
      }
    },
  };
}
