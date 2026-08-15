import {
  isBeaconInProximity,
  matchZonalBeacon,
  parseScanPayload,
  useSession,
  type BleAdvertisement,
} from "@standmarket/supabase-client";
import { colors } from "@standmarket/ui";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  visitorBleScanner,
  visitorNfcScanner,
  visitorQrScanner,
} from "../../lib/hardware-adapters";
import {
  fetchActiveBeacons,
  fetchActiveOffersInZone,
  fetchOfferById,
  recordVisitorEvent,
  redeemOffer,
  type OfferListItem,
} from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

const DEMO_ZONE_A1: BleAdvertisement = {
  uuid: "e2c56db5-dffb-48d2-b060-d0f5a71096e0",
  major: 1,
  minor: 1,
  rssi: -60,
};

export default function ScanScreen() {
  const { session } = useSession();
  const userId = session?.user.id ?? "";
  const [permission, requestPermission] = useCameraPermissions();
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [status, setStatus] = useState("Așteaptă beacon, QR sau NFC.");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const lastQrAt = useRef(0);
  const lastBeacon = useRef<string | null>(null);

  const beacons = useQuery({
    queryKey: ["beacons", "active"],
    queryFn: fetchActiveBeacons,
  });

  const redeem = useMutation({
    mutationFn: (offer: OfferListItem) => redeemOffer(userId, offer),
    onSuccess: async (redemptionCode, offer) => {
      setCode(redemptionCode);
      setStatus(`Revendicat: ${redemptionCode}`);
      if (offer.expo_id) {
        await recordVisitorEvent({
          userId,
          expoId: offer.expo_id,
          eventType: "offer_redeemed",
          standId: offer.stand_id,
          offerId: offer.id,
        }).catch(() => undefined);
      }
    },
    onError: (caught) => {
      setError(caught instanceof Error ? caught.message : "Redeem failed");
    },
  });

  async function onAdvertisement(ad: BleAdvertisement) {
    const list = beacons.data ?? (await fetchActiveBeacons());
    const matched = matchZonalBeacon(list, ad);
    if (!matched || !isBeaconInProximity(ad.rssi, matched.tx_power)) {
      return;
    }
    if (lastBeacon.current === matched.id) {
      return;
    }
    lastBeacon.current = matched.id;
    const zoneOffers = await fetchActiveOffersInZone(matched.hall, matched.zone);
    setOffers(zoneOffers);
    setStatus(`Zonă ${matched.hall} ${matched.zone}`);
    setError(null);
    if (zoneOffers[0]) {
      await recordVisitorEvent({
        userId,
        expoId: matched.expo_id,
        eventType: "zone_detected",
        standId: zoneOffers[0].stand_id,
        offerId: zoneOffers[0].id,
        beaconId: matched.id,
      }).catch(() => undefined);
    }
  }

  async function onRawPayload(
    raw: string,
    eventType: "qr_scanned" | "nfc_tapped",
  ) {
    const parsed = parseScanPayload(raw);
    if (!parsed || parsed.type !== "offer") {
      setError("QR/NFC invalid. Aștept sm:offer:<id>.");
      return;
    }
    const offer = await fetchOfferById(parsed.offerId);
    if (!offer) {
      setError("Oferta nu este activă.");
      return;
    }
    setOffers([offer]);
    setStatus(eventType === "qr_scanned" ? "QR scanat" : "NFC scanat");
    setError(null);
    if (offer.expo_id) {
      await recordVisitorEvent({
        userId,
        expoId: offer.expo_id,
        eventType,
        standId: offer.stand_id,
        offerId: offer.id,
      }).catch(() => undefined);
    }
  }

  useEffect(() => {
    if (!userId) {
      return;
    }
    let stopBle: (() => void) | undefined;
    let stopQr: (() => void) | undefined;
    let stopNfc: (() => void) | undefined;
    void visitorBleScanner.start((ad) => {
      void onAdvertisement(ad);
    }).then((stop) => {
      stopBle = stop;
    });
    void visitorQrScanner.start((raw) => {
      void onRawPayload(raw, "qr_scanned");
    }).then((stop) => {
      stopQr = stop;
    });
    void visitorNfcScanner.start((raw) => {
      void onRawPayload(raw, "nfc_tapped");
    }).then((stop) => {
      stopNfc = stop;
    });
    return () => {
      stopBle?.();
      stopQr?.();
      stopNfc?.();
    };
  }, [userId]);

  if (!permission) {
    return (
      <View style={screenStyles.root}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={screenStyles.root}>
      <Text style={screenStyles.title}>Scan</Text>
      <Text style={screenStyles.muted}>{status}</Text>
      {error ? <Text style={screenStyles.error}>{error}</Text> : null}
      {code ? (
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Cod redemption (arată-l vendorului)</Text>
          <Text style={screenStyles.body}>{code}</Text>
        </View>
      ) : null}

      {!permission.granted ? (
        <Pressable onPress={() => void requestPermission()} style={screenStyles.button}>
          <Text style={screenStyles.buttonLabel}>Permite camera (QR)</Text>
        </Pressable>
      ) : (
        <View style={{ height: 220, marginVertical: 12, overflow: "hidden", borderRadius: 12 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={(result: { data: string }) => {
              const now = Date.now();
              if (now - lastQrAt.current < 1500) {
                return;
              }
              lastQrAt.current = now;
              visitorQrScanner.simulate(result.data);
            }}
          />
        </View>
      )}

      <Pressable
        onPress={() => visitorBleScanner.simulate(DEMO_ZONE_A1)}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>Simulează BLE zonă A1</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          visitorNfcScanner.simulate("sm:offer:30000000-0000-0000-0000-000000000001")
        }
        style={screenStyles.buttonSecondary}
      >
        <Text style={screenStyles.buttonLabel}>Simulează NFC ofertă</Text>
      </Pressable>

      <TextInput
        autoCapitalize="none"
        onChangeText={setManual}
        placeholder="Payload QR/NFC sau RDM-…"
        placeholderTextColor="#9AA4B2"
        style={screenStyles.input}
        value={manual}
      />
      <Pressable
        onPress={() => visitorQrScanner.simulate(manual)}
        style={screenStyles.buttonSecondary}
      >
        <Text style={screenStyles.buttonLabel}>Folosește payload</Text>
      </Pressable>

      {offers.map((offer) => (
        <View key={offer.id} style={screenStyles.card}>
          <Text style={screenStyles.body}>{offer.product_name}</Text>
          <Text style={screenStyles.muted}>
            {offer.discount_percent != null ? `${offer.discount_percent}%` : "Offer"}
            {offer.stand_name ? ` · ${offer.stand_name}` : ""}
          </Text>
          <Pressable
            disabled={redeem.isPending}
            onPress={() => redeem.mutate(offer)}
            style={screenStyles.button}
          >
            <Text style={screenStyles.buttonLabel}>
              {redeem.isPending ? "Se revendică…" : "Revendică"}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
