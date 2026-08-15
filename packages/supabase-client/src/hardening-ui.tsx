import {
  Component,
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { errorFallbackCopy, pingWithTimeout } from "./hardening";
import {
  enqueueMutation,
  flushOfflineQueue,
  type KeyValueStore,
} from "./offline-queue";

type ToastVariant = "success" | "error";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type HardeningValue = {
  online: boolean;
  showToast: (message: string, variant?: ToastVariant) => void;
  enqueue: (name: string, payload: unknown) => Promise<void>;
};

const HardeningContext = createContext<HardeningValue | null>(null);

export function useHardening(): HardeningValue {
  const value = useContext(HardeningContext);
  if (!value) {
    throw new Error("useHardening must be used within HardeningProvider");
  }
  return value;
}

export function useToast(): HardeningValue["showToast"] {
  return useHardening().showToast;
}

export function useOnline(): boolean {
  return useHardening().online;
}

export function useQueuedAction() {
  const { online, enqueue, showToast } = useHardening();
  return useCallback(
    async (
      name: string,
      payload: unknown,
      run: () => Promise<void>,
      successMessage: string,
    ) => {
      if (!online) {
        await enqueue(name, payload);
        return;
      }
      try {
        await run();
        showToast(successMessage, "success");
      } catch (caught) {
        showToast(
          caught instanceof Error ? caught.message : "Eroare",
          "error",
        );
        throw caught;
      }
    },
    [enqueue, online, showToast],
  );
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  retry = () => {
    this.setState({ error: null });
  };

  override render() {
    if (!this.state.error) {
      return this.props.children;
    }
    const copy = errorFallbackCopy(this.state.error);
    return (
      <View
        accessibilityRole="alert"
        accessibilityLabel={copy.title}
        style={{
          flex: 1,
          backgroundColor: "#0B0F14",
          padding: 24,
          justifyContent: "center",
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ color: "#F4F6F8", fontSize: 28, fontWeight: "600", marginBottom: 16 }}
        >
          {copy.title}
        </Text>
        <Text style={{ color: "#C5CDD6", fontSize: 16, marginBottom: 24 }}>
          {copy.body}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.retryLabel}
          accessibilityHint="Reîncarcă ecranul după eroare"
          onPress={this.retry}
          style={{
            backgroundColor: "#3D8BFF",
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#0B0F14", fontSize: 16, fontWeight: "600" }}>
            {copy.retryLabel}
          </Text>
        </Pressable>
      </View>
    );
  }
}

export function HardeningProvider({
  children,
  ping,
  store,
  handlers,
}: {
  children: ReactNode;
  ping: () => Promise<boolean>;
  store: KeyValueStore;
  handlers: Record<string, (payload: unknown) => Promise<void>>;
}) {
  const [online, setOnline] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4_000);
  }, []);

  const enqueue = useCallback(
    async (name: string, payload: unknown) => {
      await enqueueMutation(store, { name, payload });
      showToast("Salvat în coadă. Se trimite la reconectare.", "success");
    },
    [showToast, store],
  );

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const next = await pingWithTimeout(ping);
      if (!cancelled) {
        setOnline(next);
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 4_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ping]);

  useEffect(() => {
    if (!online) {
      return;
    }
    void flushOfflineQueue(store, handlers).then((result) => {
      if (result.flushed > 0) {
        showToast("Coada offline a fost trimisă.", "success");
      }
    });
  }, [handlers, online, showToast, store]);

  const value = useMemo(
    () => ({ online, showToast, enqueue }),
    [enqueue, online, showToast],
  );

  return (
    <HardeningContext.Provider value={value}>
      <View style={{ flex: 1, paddingTop: online ? 0 : 40 }}>{children}</View>
      {!online ? (
        <View
          accessibilityRole="alert"
          accessibilityLabel="Fără conexiune"
          accessibilityHint="Acțiunile vor fi puse în coadă până la reconectare"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 40,
            backgroundColor: "#F97066",
            paddingTop: 44,
            paddingBottom: 10,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: "#0B0F14", fontSize: 14, fontWeight: "600" }}>
            Ești offline. Mutations merg în coadă.
          </Text>
        </View>
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 88,
          zIndex: 50,
        }}
      >
        {toasts.map((toast) => (
          <View
            key={toast.id}
            accessibilityRole="alert"
            accessibilityLabel={toast.message}
            style={{
              backgroundColor: toast.variant === "error" ? "#F97066" : "#3D8BFF",
              padding: 12,
              borderRadius: 10,
              marginTop: 8,
            }}
          >
            <Text style={{ color: "#0B0F14", fontSize: 14, fontWeight: "600" }}>
              {toast.message}
            </Text>
          </View>
        ))}
      </View>
    </HardeningContext.Provider>
  );
}

export const QuerySkeleton = memo(function QuerySkeleton({
  label = "Se încarcă",
}: {
  label?: string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ flex: 1, backgroundColor: "#0B0F14", padding: 24 }}
    >
      {[0, 1, 2].map((slot) => (
        <View
          key={slot}
          style={{
            height: 72,
            borderRadius: 12,
            backgroundColor: "#151B23",
            marginBottom: 8,
          }}
        />
      ))}
    </View>
  );
});

export function QueryGate({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: unknown;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return <QuerySkeleton />;
  }
  if (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Could not load data";
    return (
      <View style={{ flex: 1, backgroundColor: "#0B0F14", padding: 24 }}>
        <Text accessibilityRole="alert" style={{ color: "#F97066", fontSize: 14 }}>
          {message}
        </Text>
        {onRetry ? (
          <A11yButton
            label="Reîncearcă încărcarea"
            hint="Reîncearcă interogarea"
            onPress={onRetry}
            style={{
              marginTop: 16,
              backgroundColor: "#3D8BFF",
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#0B0F14", fontSize: 16, fontWeight: "600" }}>
              Reîncearcă
            </Text>
          </A11yButton>
        ) : null}
      </View>
    );
  }
  return children;
}

export const A11yButton = memo(function A11yButton({
  label,
  hint,
  onPress,
  disabled,
  style,
  children,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={style}
    >
      {children}
    </Pressable>
  );
});

export const LazyImage = memo(function LazyImage({
  uri,
  label,
}: {
  uri?: string | null;
  label: string;
}) {
  const [loaded, setLoaded] = useState(!uri);
  const onLoad = useCallback(() => setLoaded(true), []);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#151B23",
        overflow: "hidden",
        marginRight: 12,
      }}
    >
      {uri ? (
        <Image
          accessibilityIgnoresInvertColors
          onLoad={onLoad}
          source={{ uri }}
          style={{ width: 40, height: 40, opacity: loaded ? 1 : 0.3 }}
        />
      ) : null}
    </View>
  );
});
