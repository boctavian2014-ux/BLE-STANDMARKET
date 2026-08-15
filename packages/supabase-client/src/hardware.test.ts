import { expect, test } from "bun:test";
import {
  createBleScanner,
  createNfcScanner,
  createQrScanner,
  encodeOfferScan,
  encodeRedemptionScan,
  isBeaconInProximity,
  matchZonalBeacon,
  parseScanPayload,
  type ZonalBeacon,
} from "./hardware";

const beacon: ZonalBeacon = {
  id: "20000000-0000-0000-0000-000000000001",
  expo_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  beacon_uuid: "e2c56db5-dffb-48d2-b060-d0f5a71096e0",
  major: 1,
  minor: 1,
  hall: "Hall A",
  zone: "A1",
  tx_power: -59,
  is_active: true,
};

test("parseScanPayload accepts offer and redemption encodings", () => {
  expect(parseScanPayload("sm:offer:30000000-0000-0000-0000-000000000001")).toEqual({
    type: "offer",
    offerId: "30000000-0000-0000-0000-000000000001",
  });
  expect(parseScanPayload("SM:RDM:RDM-VISITOR-A-001")).toEqual({
    type: "redemption",
    code: "RDM-VISITOR-A-001",
  });
  expect(parseScanPayload("30000000-0000-0000-0000-000000000001")?.type).toBe(
    "offer",
  );
  expect(parseScanPayload("RDM-ABC")?.type).toBe("redemption");
  expect(parseScanPayload("nope")).toBeNull();
  expect(parseScanPayload("")).toBeNull();
});

test("encode helpers round-trip through parseScanPayload", () => {
  const offer = encodeOfferScan("30000000-0000-0000-0000-000000000002");
  const redemption = encodeRedemptionScan("RDM-TEST-1");
  expect(parseScanPayload(offer)).toEqual({
    type: "offer",
    offerId: "30000000-0000-0000-0000-000000000002",
  });
  expect(parseScanPayload(redemption)).toEqual({
    type: "redemption",
    code: "RDM-TEST-1",
  });
});

test("matchZonalBeacon matches uuid/major/minor ignoring uuid case", () => {
  expect(
    matchZonalBeacon([beacon], {
      uuid: "E2C56DB5-DFFB-48D2-B060-D0F5A71096E0",
      major: 1,
      minor: 1,
      rssi: -60,
    })?.zone,
  ).toBe("A1");
  expect(
    matchZonalBeacon([beacon], { uuid: beacon.beacon_uuid, major: 1, minor: 2 }),
  ).toBeNull();
  expect(
    matchZonalBeacon([{ ...beacon, is_active: false }], {
      uuid: beacon.beacon_uuid,
      major: 1,
      minor: 1,
    }),
  ).toBeNull();
});

test("isBeaconInProximity uses txPower floor", () => {
  expect(isBeaconInProximity(-60, -59)).toBe(true);
  expect(isBeaconInProximity(-100, -59)).toBe(false);
  expect(isBeaconInProximity(undefined, -59)).toBe(true);
});

test("createBleScanner / createQrScanner / createNfcScanner forward adapter calls", async () => {
  const ads: { uuid: string; major: number; minor: number }[] = [];
  const payloads: string[] = [];
  const ble = createBleScanner({
    start: async (onAdvertisement) => {
      onAdvertisement({ uuid: beacon.beacon_uuid, major: 1, minor: 1 });
      return () => undefined;
    },
    simulate: (ad) => ads.push(ad),
  });
  const qr = createQrScanner({
    start: async (onPayload) => {
      onPayload("sm:offer:30000000-0000-0000-0000-000000000001");
      return () => undefined;
    },
    simulate: (raw) => payloads.push(raw),
  });
  const nfc = createNfcScanner({
    start: async (onPayload) => {
      onPayload("sm:rdm:RDM-1");
      return () => undefined;
    },
    simulate: (raw) => payloads.push(raw),
  });

  const stopBle = await ble.start(() => undefined);
  const stopQr = await qr.start(() => undefined);
  const stopNfc = await nfc.start(() => undefined);
  stopBle();
  stopQr();
  stopNfc();
  ble.simulate({ uuid: beacon.beacon_uuid, major: 1, minor: 1 });
  qr.simulate("sm:offer:x");
  nfc.simulate("sm:rdm:y");
  expect(ads).toHaveLength(1);
  expect(payloads).toEqual(["sm:offer:x", "sm:rdm:y"]);
});
