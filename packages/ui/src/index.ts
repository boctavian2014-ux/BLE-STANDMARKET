export const colors = {
  background: "#0B0F14",
  surface: "#151B23",
  text: "#F4F6F8",
  muted: "#9AA4B2",
  accent: "#3D8BFF",
  error: "#F97066",
  mutedAA: "#C5CDD6",
  buttonLabelOnAccent: "#0B0F14",
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  title: 28,
  subtitle: 16,
  body: 14,
} as const;

export {
  LANGUAGE_STORAGE_KEY,
  LanguageProvider,
  createMemoryLanguageStore,
  detectDeviceLanguage,
  interpolate,
  lookup,
  mapVisibleError,
  persistLanguage,
  readStoredLanguage,
  useTranslation,
} from "./i18n";
export type { Language, LanguageStore, TranslateVars } from "./i18n";
