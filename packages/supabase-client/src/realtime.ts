import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type PostgresChangeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export type PostgresChangeSpec = {
  table: string;
  event?: PostgresChangeEvent;
  filter?: string;
};

export function subscribePostgresChanges(
  client: Pick<SupabaseClient, "channel" | "removeChannel">,
  channelName: string,
  spec: PostgresChangeSpec,
  onChange: () => void,
): () => void {
  const payload = {
    event: spec.event ?? "*",
    schema: "public",
    table: spec.table,
    ...(spec.filter ? { filter: spec.filter } : {}),
  };
  const channel: RealtimeChannel = client
    .channel(channelName)
    .on("postgres_changes", payload, () => {
      onChange();
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
