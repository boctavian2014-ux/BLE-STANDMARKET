import type { Session, User } from "@supabase/supabase-js";

export type { Session, User };

export type Profile = {
  id: string;
  role: "organizer" | "vendor" | "visitor";
  display_name: string | null;
};

export type SessionState = {
  session: Session | null;
  isLoading: boolean;
};
