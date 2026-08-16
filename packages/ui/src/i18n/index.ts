// @ts-expect-error -- workspace resolves `react` to a parent install without types
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en } from "./en";
import { ro } from "./ro";

export type Language = "ro" | "en";
export type TranslateVars = Record<string, string | number>;
export type LanguageStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

type Dictionary = Record<string, string>;

export const LANGUAGE_STORAGE_KEY = "sm_language";

const dictionaries: Record<Language, Dictionary> = {
  ro: ro as Dictionary,
  en: en as Dictionary,
};

const ERROR_MAP: Array<{ match: string; key: string }> = [
  { match: "Invalid login credentials", key: "errors.signInFailed" },
  { match: "Sign in failed", key: "errors.signInFailed" },
  { match: "Sign up failed", key: "errors.signUpFailed" },
  { match: "User already registered", key: "errors.signUpFailed" },
  { match: "Title is required", key: "errors.titleRequired" },
  { match: "Not signed in", key: "errors.notSignedIn" },
  { match: "Missing stand", key: "errors.missingStand" },
  { match: "Discount must be between 0 and 100", key: "errors.discountRange" },
  { match: "Oferta a fost deja revendicată", key: "errors.alreadyRedeemed" },
  { match: "Cod invalid sau expirat", key: "errors.activationFailed" },
  { match: "Simulated crash", key: "errors.simulatedCrash" },
  { match: "No running expo", key: "errors.noExpo" },
  { match: "Stand not found", key: "errors.standNotFound" },
  { match: "Could not update offer", key: "errors.updateFailed" },
  { match: "OFFER_IMAGE_TOO_LARGE", key: "offers.photoTooBig" },
  { match: "Could not load data", key: "errors.loadFailed" },
  { match: "Scan invalid", key: "errors.invalidScan" },
  { match: "QR/NFC invalid", key: "errors.invalidScan" },
];

export function interpolate(
  template: string,
  vars?: TranslateVars,
): string {
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_full, name: string) => {
    const value = vars[name];
    return value == null ? `{${name}}` : String(value);
  });
}

export function lookup(
  language: Language,
  key: string,
  vars?: TranslateVars,
): string {
  const active = dictionaries[language][key];
  const fallback = dictionaries.ro[key];
  return interpolate(active ?? fallback ?? key, vars);
}

export function detectDeviceLanguage(): Language {
  try {
    const req = (globalThis as { require?: (id: string) => unknown }).require;
    if (!req) {
      return "ro";
    }
    const Localization = req("expo-localization") as {
      getLocales?: () => Array<{ languageCode?: string }>;
      locale?: string;
    };
    const code =
      Localization.getLocales?.()[0]?.languageCode ??
      Localization.locale?.slice(0, 2);
    if (code === "en" || code === "ro") {
      return code;
    }
  } catch {
    // expo-localization is optional; no new dependency in this PR.
  }
  return "ro";
}

export function createMemoryLanguageStore(
  seed: Record<string, string> = {},
): LanguageStore {
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

export async function readStoredLanguage(
  store: LanguageStore,
): Promise<Language | null> {
  const raw = await store.getItem(LANGUAGE_STORAGE_KEY);
  return raw === "en" || raw === "ro" ? raw : null;
}

export async function persistLanguage(
  store: LanguageStore,
  language: Language,
): Promise<void> {
  await store.setItem(LANGUAGE_STORAGE_KEY, language);
}

export function mapVisibleError(
  error: unknown,
  translate: (key: string, vars?: TranslateVars) => string,
): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const mapped = ERROR_MAP.find((entry) => message.includes(entry.match));
  return translate(mapped?.key ?? "errors.generic");
}

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: TranslateVars) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({
  children,
  store,
  initialLanguage,
}: {
  children: unknown;
  store?: LanguageStore;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(
    initialLanguage ?? "ro",
  );

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      const resolvedStore = store ?? (await loadAsyncStorageStore());
      if (!resolvedStore) {
        if (!cancelled && !initialLanguage) {
          setLanguageState(detectDeviceLanguage());
        }
        return;
      }
      const stored = await readStoredLanguage(resolvedStore);
      if (!cancelled) {
        setLanguageState(stored ?? initialLanguage ?? detectDeviceLanguage());
      }
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [initialLanguage, store]);

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      const persist = async () => {
        const resolvedStore = store ?? (await loadAsyncStorageStore());
        if (resolvedStore) {
          await persistLanguage(resolvedStore, next);
        }
      };
      void persist();
    },
    [store],
  );

  const t = useCallback(
    (key: string, vars?: TranslateVars) => lookup(language, key, vars),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useTranslation(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useTranslation must be used within LanguageProvider");
  }
  return value;
}

async function loadAsyncStorageStore(): Promise<LanguageStore | null> {
  try {
    const req = (globalThis as { require?: (id: string) => unknown }).require;
    if (!req) {
      return null;
    }
    const mod = req("@react-native-async-storage/async-storage") as {
      default: LanguageStore;
    };
    return mod.default;
  } catch {
    return null;
  }
}
