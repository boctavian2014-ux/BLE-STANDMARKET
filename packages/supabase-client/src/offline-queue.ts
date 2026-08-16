export type KeyValueStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type OfflineMutation = {
  id: string;
  name: string;
  payload: unknown;
  createdAt: string;
};

export const OFFLINE_QUEUE_KEY = "standmarket.offline-queue";

export function createMemoryStore(
  seed: Record<string, string> = {},
): KeyValueStore {
  const data = { ...seed };
  return {
    async getItem(key) {
      return data[key] ?? null;
    },
    async setItem(key, value) {
      data[key] = value;
    },
  };
}

export async function readOfflineQueue(
  store: KeyValueStore,
): Promise<OfflineMutation[]> {
  const raw = await store.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as OfflineMutation[]) : [];
  } catch {
    return [];
  }
}

export async function enqueueMutation(
  store: KeyValueStore,
  item: Omit<OfflineMutation, "id" | "createdAt"> & { id?: string },
): Promise<OfflineMutation> {
  const queued: OfflineMutation = {
    id: item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: item.name,
    payload: item.payload,
    createdAt: new Date().toISOString(),
  };
  const current = await readOfflineQueue(store);
  current.push(queued);
  await store.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
  return queued;
}

export async function replaceOfflineQueue(
  store: KeyValueStore,
  items: OfflineMutation[],
): Promise<void> {
  await store.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

export async function flushOfflineQueue(
  store: KeyValueStore,
  handlers: Record<string, (payload: unknown) => Promise<void>>,
): Promise<{ flushed: number; remaining: number }> {
  const current = await readOfflineQueue(store);
  const remaining: OfflineMutation[] = [];
  let flushed = 0;
  for (const item of current) {
    const handler = handlers[item.name];
    if (!handler) {
      remaining.push(item);
      continue;
    }
    try {
      await handler(item.payload);
      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }
  await replaceOfflineQueue(store, remaining);
  return { flushed, remaining: remaining.length };
}
