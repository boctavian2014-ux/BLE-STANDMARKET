import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "./client";
import { useSession } from "./session-context";
import type { Profile } from "./types";

export function useProfile() {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user.id;

  const refetch = useCallback(() => {
    if (!userId) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return Promise.resolve();
    }
    setIsLoading(true);
    return getSupabaseClient()
      .from("profiles")
      .select("id, role, display_name")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (queryError) {
          setError(queryError.message);
          setProfile(null);
        } else {
          setError(null);
          setProfile((data as Profile | null) ?? null);
        }
        setIsLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profile, isLoading, error, refetch };
}
