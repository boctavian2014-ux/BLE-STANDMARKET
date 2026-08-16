import {
  colors,
  mapVisibleError,
  radius,
  spacing,
  typography,
  useTranslation,
} from "../../ui/src/index";
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
import { pingWithTimeout } from "./hardening";
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
  const { t } = useTranslation();
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
        showToast(mapVisibleError(caught, t), "error");
        throw caught;
      }
    },
    [enqueue, online, showToast, t],
  );
}

function ErrorFallback({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const title = t("errorBoundary.title");
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={title}
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        justifyContent: "center",
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          fontSize: typography.title,
          fontWeight: "600",
          marginBottom: spacing.md,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.mutedAA,
          fontSize: typography.subtitle,
          marginBottom: spacing.lg,
        }}
      >
        {mapVisibleError(error, t)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("errorBoundary.retry")}
        accessibilityHint={t("errorBoundary.retryHint")}
        onPress={onRetry}
        style={{
          backgroundColor: colors.accent,
          paddingVertical: 12,
          borderRadius: radius.md,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: colors.buttonLabelOnAccent,
            fontSize: typography.subtitle,
            fontWeight: "600",
          }}
        >
          {t("errorBoundary.retry")}
        </Text>
      </Pressable>
    </View>
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
    return <ErrorFallback error={this.state.error} onRetry={this.retry} />;
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
  const { t } = useTranslation();
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
      showToast(t("offline.queued"), "success");
    },
    [showToast, store, t],
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
        showToast(t("offline.flushed"), "success");
      }
    });
  }, [handlers, online, showToast, store, t]);

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
          accessibilityLabel={t("offline.label")}
          accessibilityHint={t("offline.hint")}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 40,
            backgroundColor: colors.error,
            paddingTop: 44,
            paddingBottom: 10,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text
            style={{
              color: colors.buttonLabelOnAccent,
              fontSize: typography.body,
              fontWeight: "600",
            }}
          >
            {t("offline.banner")}
          </Text>
        </View>
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: spacing.md,
          right: spacing.md,
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
              backgroundColor:
                toast.variant === "error" ? colors.error : colors.accent,
              padding: 12,
              borderRadius: radius.md,
              marginTop: spacing.sm,
            }}
          >
            <Text
              style={{
                color: colors.buttonLabelOnAccent,
                fontSize: typography.body,
                fontWeight: "600",
              }}
            >
              {toast.message}
            </Text>
          </View>
        ))}
      </View>
    </HardeningContext.Provider>
  );
}

export const QuerySkeleton = memo(function QuerySkeleton({
  label,
}: {
  label?: string;
}) {
  const { t } = useTranslation();
  const resolved = label ?? t("query.loading");
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={resolved}
      style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}
    >
      {[0, 1, 2].map((slot) => (
        <View
          key={slot}
          style={{
            height: 72,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
            marginBottom: spacing.sm,
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
  const { t } = useTranslation();
  if (loading) {
    return <QuerySkeleton />;
  }
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
        <Text
          accessibilityRole="alert"
          style={{ color: colors.error, fontSize: typography.body }}
        >
          {mapVisibleError(error, t)}
        </Text>
        {onRetry ? (
          <A11yButton
            label={t("query.retryLoad")}
            hint={t("query.retryHint")}
            onPress={onRetry}
            style={{
              marginTop: spacing.md,
              backgroundColor: colors.accent,
              paddingVertical: 12,
              borderRadius: radius.md,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.buttonLabelOnAccent,
                fontSize: typography.subtitle,
                fontWeight: "600",
              }}
            >
              {t("query.retry")}
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
        borderRadius: radius.sm,
        backgroundColor: colors.surface,
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
