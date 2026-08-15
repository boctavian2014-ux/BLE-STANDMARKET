import {
  createBleScanner,
  createNfcScanner,
  createQrScanner,
  type BleAdvertisement,
} from "@standmarket/supabase-client";

type Listener<T> = (value: T) => void;

function createPayloadAdapter() {
  let listener: Listener<string> | null = null;
  return {
    async start(onPayload: Listener<string>) {
      listener = onPayload;
      return () => {
        listener = null;
      };
    },
    simulate(raw: string) {
      listener?.(raw);
    },
  };
}

function createBleAdapter() {
  let listener: Listener<BleAdvertisement> | null = null;
  return {
    async start(onAdvertisement: Listener<BleAdvertisement>) {
      listener = onAdvertisement;
      return () => {
        listener = null;
      };
    },
    simulate(ad: BleAdvertisement) {
      listener?.(ad);
    },
  };
}

const bleAdapter = createBleAdapter();
const qrAdapter = createPayloadAdapter();
const nfcAdapter = createPayloadAdapter();

export const visitorBleScanner = createBleScanner(bleAdapter);
export const visitorQrScanner = createQrScanner(qrAdapter);
export const visitorNfcScanner = createNfcScanner(nfcAdapter);
