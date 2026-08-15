export type BleAdvertisement = {
  uuid: string;
  major: number;
  minor: number;
  rssi?: number;
};

export type ZonalBeacon = {
  id: string;
  expo_id: string;
  beacon_uuid: string;
  major: number;
  minor: number;
  hall: string;
  zone: string;
  tx_power: number | null;
  is_active: boolean;
};

export type OfferScanPayload = {
  type: "offer";
  offerId: string;
};

export type RedemptionScanPayload = {
  type: "redemption";
  code: string;
};

export type ScanPayload = OfferScanPayload | RedemptionScanPayload;

const OFFER_PREFIX = "sm:offer:";
const REDEMPTION_PREFIX = "sm:rdm:";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeOfferScan(offerId: string): string {
  return `${OFFER_PREFIX}${offerId}`;
}

export function encodeRedemptionScan(code: string): string {
  return `${REDEMPTION_PREFIX}${code}`;
}

export function parseScanPayload(raw: string): ScanPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith(OFFER_PREFIX)) {
    const offerId = trimmed.slice(OFFER_PREFIX.length).trim();
    return UUID_RE.test(offerId) ? { type: "offer", offerId } : null;
  }
  if (lower.startsWith(REDEMPTION_PREFIX)) {
    const code = trimmed.slice(REDEMPTION_PREFIX.length).trim();
    return code ? { type: "redemption", code } : null;
  }
  if (UUID_RE.test(trimmed)) {
    return { type: "offer", offerId: trimmed };
  }
  if (/^RDM-/i.test(trimmed)) {
    return { type: "redemption", code: trimmed };
  }
  return null;
}

export function matchZonalBeacon(
  beacons: ZonalBeacon[],
  ad: BleAdvertisement,
): ZonalBeacon | null {
  const uuid = ad.uuid.toLowerCase();
  return (
    beacons.find(
      (beacon) =>
        beacon.is_active &&
        beacon.beacon_uuid.toLowerCase() === uuid &&
        beacon.major === ad.major &&
        beacon.minor === ad.minor,
    ) ?? null
  );
}

export function isBeaconInProximity(
  rssi: number | undefined,
  txPower: number | null,
): boolean {
  if (rssi == null) {
    return true;
  }
  const floor = (txPower ?? -59) - 30;
  return rssi >= floor;
}

export type BleScanAdapter = {
  start: (
    onAdvertisement: (ad: BleAdvertisement) => void,
  ) => Promise<() => void>;
  simulate?: (ad: BleAdvertisement) => void;
};

export type PayloadScanAdapter = {
  start: (onPayload: (raw: string) => void) => Promise<() => void>;
  simulate?: (raw: string) => void;
};

export function createBleScanner(adapter: BleScanAdapter) {
  return {
    start: adapter.start,
    simulate(ad: BleAdvertisement) {
      if (!adapter.simulate) {
        throw new Error("BLE simulate is not available");
      }
      adapter.simulate(ad);
    },
  };
}

export function createQrScanner(adapter: PayloadScanAdapter) {
  return {
    start: adapter.start,
    simulate(raw: string) {
      if (!adapter.simulate) {
        throw new Error("QR simulate is not available");
      }
      adapter.simulate(raw);
    },
  };
}

export function createNfcScanner(adapter: PayloadScanAdapter) {
  return {
    start: adapter.start,
    simulate(raw: string) {
      if (!adapter.simulate) {
        throw new Error("NFC simulate is not available");
      }
      adapter.simulate(raw);
    },
  };
}
