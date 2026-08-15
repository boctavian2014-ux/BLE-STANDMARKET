import type { ComponentType } from "react";

export type CameraApi = {
  CameraView: ComponentType<{
    style?: object;
    barcodeScannerSettings?: { barcodeTypes: string[] };
    onBarcodeScanned?: (result: { data: string }) => void;
  }>;
  useCameraPermissions: () => [
    { granted: boolean } | null,
    () => Promise<unknown>,
  ];
};

export function loadCamera(): CameraApi {
  const req = (globalThis as { require?: (id: string) => CameraApi }).require;
  if (!req) {
    throw new Error("Camera module loader is unavailable");
  }
  return req(["expo", "camera"].join("-"));
}
