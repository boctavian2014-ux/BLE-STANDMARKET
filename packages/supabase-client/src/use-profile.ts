import { useEffect, useState } from "react";
import { getSupabaseClient } from "./client";
import { useSession } from "./session-context";
import type { Profile } from "./types";

export function useProfile() {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void getSupabaseClient()
      .from("profiles")
      .select("id, role, display_name")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (cancelled) {
          return;
        }
        if (queryError) {
          setError(queryError.message);
          setProfile(null);
        } else {
          setError(null);
          setProfile((data as Profile | null) ?? null);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  return { profile, isLoading, error };
}
