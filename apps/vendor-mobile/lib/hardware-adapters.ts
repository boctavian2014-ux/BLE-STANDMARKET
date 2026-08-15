import {
  createNfcScanner,
  createQrScanner,
} from "@standmarket/supabase-client";

type Listener = (value: string) => void;

function createPayloadAdapter() {
  let listener: Listener | null = null;
  return {
    async start(onPayload: Listener) {
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

const qrAdapter = createPayloadAdapter();
const nfcAdapter = createPayloadAdapter();

export const vendorQrScanner = createQrScanner(qrAdapter);
export const vendorNfcScanner = createNfcScanner(nfcAdapter);
