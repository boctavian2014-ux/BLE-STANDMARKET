export {
  GENERIC_ACTIVATION_ERROR,
  fetchActiveMembership,
  parseRedeemVendorResponse,
  redeemVendorActivationCode,
} from "./activation";
export type { RedeemVendorResult, VendorMembership } from "./activation";
export { createAuthController } from "./auth";
export { getSupabaseClient, resetSupabaseClientForTests } from "./client";
export { readSupabasePublicEnv } from "./env";
export {
  createBleScanner,
  createNfcScanner,
  createQrScanner,
  encodeOfferScan,
  encodeRedemptionScan,
  isBeaconInProximity,
  matchZonalBeacon,
  parseScanPayload,
} from "./hardware";
export type {
  BleAdvertisement,
  BleScanAdapter,
  OfferScanPayload,
  PayloadScanAdapter,
  RedemptionScanPayload,
  ScanPayload,
  ZonalBeacon,
} from "./hardware";
export {
  subscribePostgresChanges,
} from "./realtime";
export type { PostgresChangeEvent, PostgresChangeSpec } from "./realtime";
export { SessionProvider, useSession } from "./session-context";
export { relativeLuminance, contrastRatio, WCAG_AA_BODY } from "./a11y";
export {
  errorFallbackCopy,
  pingWithTimeout,
} from "./hardening";
export type { OnlinePing } from "./hardening";
export {
  A11yButton,
  ErrorBoundary,
  HardeningProvider,
  LazyImage,
  QueryGate,
  QuerySkeleton,
  useHardening,
  useOnline,
  useQueuedAction,
  useToast,
} from "./hardening-ui";
export {
  OFFLINE_QUEUE_KEY,
  createMemoryStore,
  enqueueMutation,
  flushOfflineQueue,
  readOfflineQueue,
  replaceOfflineQueue,
} from "./offline-queue";
export type { KeyValueStore, OfflineMutation } from "./offline-queue";
export {
  QUERY_RETRY,
  QUERY_STALE_MS,
  appQueryClientOptions,
} from "./query-client";
export type { Profile, Session, SessionState, User } from "./types";
export { usePostgresChanges } from "./use-postgres-changes";
export { useProfile } from "./use-profile";
