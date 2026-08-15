import { useEffect, useRef } from "react";
import { getSupabaseClient } from "./client";
import {
  subscribePostgresChanges,
  type PostgresChangeSpec,
} from "./realtime";

export function usePostgresChanges(
  enabled: boolean,
  channelName: string,
  spec: PostgresChangeSpec,
  onChange: () => void,
): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return subscribePostgresChanges(
      getSupabaseClient(),
      channelName,
      spec,
      () => {
        onChangeRef.current();
      },
    );
  }, [channelName, enabled, spec.event, spec.filter, spec.table]);
}
