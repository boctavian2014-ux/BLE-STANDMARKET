import {
  A11yButton,
  isBeaconInProximity,
  matchZonalBeacon,
  parseScanPayload,
  QueryGate,
  QuerySkeleton,
  useQueuedAction,
  useSession,
  useToast,
  type BleAdvertisement,
} from "@standmarket/supabase-client";
import { colors, radius, useTranslation, type TranslateVars } from "@standmarket/ui";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
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
  const showToast = useToast();
  const runQueued = useQueuedAction();
  const { t } = useTranslation();
  const userId = session?.user.id ?? "";
  const [permission, requestPermission] = useCameraPermissions();
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [statusKey, setStatusKey] = useState("scan.waiting");
  const [statusVars, setStatusVars] = useState<TranslateVars>({});
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
  });

  const onAdvertisement = useCallback(
    async (ad: BleAdvertisement) => {
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
      const vars = { hall: matched.hall, zone: matched.zone };
      setStatusKey("scan.zone");
      setStatusVars(vars);
      showToast(t("scan.zone", vars), "success");
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
    },
    [beacons.data, showToast, t, userId],
  );

  const onRawPayload = useCallback(
    async (raw: string, eventType: "qr_scanned" | "nfc_tapped") => {
      const parsed = parseScanPayload(raw);
      if (!parsed || parsed.type !== "offer") {
        showToast(t("scan.invalidQr"), "error");
        return;
      }
      const offer = await fetchOfferById(parsed.offerId);
      if (!offer) {
        showToast(t("scan.offerInactive"), "error");
        return;
      }
      setOffers([offer]);
      const key = eventType === "qr_scanned" ? "scan.qrScanned" : "scan.nfcScanned";
      setStatusKey(key);
      setStatusVars({});
      showToast(t(key), "success");
      if (offer.expo_id) {
        await recordVisitorEvent({
          userId,
          expoId: offer.expo_id,
          eventType,
          standId: offer.stand_id,
          offerId: offer.id,
        }).catch(() => undefined);
      }
    },
    [showToast, t, userId],
  );

  useEffect(() => {
    if (!userId) {
      return;
    }
    let stopBle: (() => void) | undefined;
    let stopQr: (() => void) | undefined;
    let stopNfc: (() => void) | undefined;
    void visitorBleScanner
      .start((ad) => {
        void onAdvertisement(ad);
      })
      .then((stop) => {
        stopBle = stop;
      });
    void visitorQrScanner
      .start((raw) => {
        void onRawPayload(raw, "qr_scanned");
      })
      .then((stop) => {
        stopQr = stop;
      });
    void visitorNfcScanner
      .start((raw) => {
        void onRawPayload(raw, "nfc_tapped");
      })
      .then((stop) => {
        stopNfc = stop;
      });
    return () => {
      stopBle?.();
      stopQr?.();
      stopNfc?.();
    };
  }, [onAdvertisement, onRawPayload, userId]);

  const onRedeem = useCallback(
    (offer: OfferListItem) => {
      void runQueued(
        "redeem",
        { userId, offer },
        async () => {
          const redemptionCode = await redeem.mutateAsync(offer);
          setCode(redemptionCode);
          setStatusKey("scan.redeemed");
          setStatusVars({ code: redemptionCode });
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
        t("scan.redeemSuccess"),
      );
    },
    [redeem, runQueued, t, userId],
  );

  if (!permission) {
    return <QuerySkeleton label={t("query.cameraPermission")} />;
  }

  return (
    <QueryGate
      loading={beacons.isLoading}
      error={beacons.error}
      onRetry={() => void beacons.refetch()}
    >
      <ScrollView style={screenStyles.root}>
        <Text style={screenStyles.muted}>{t(statusKey, statusVars)}</Text>
        {code ? (
          <View
            accessibilityLabel={t("scan.redemptionA11y", { code })}
            style={screenStyles.card}
          >
            <Text style={screenStyles.muted}>{t("scan.redemptionCode")}</Text>
            <Text style={screenStyles.body}>{code}</Text>
          </View>
        ) : null}

        {!permission.granted ? (
          <A11yButton
            label={t("scan.allowCameraLabel")}
            hint={t("scan.allowCameraHint")}
            onPress={() => void requestPermission()}
            style={screenStyles.button}
          >
            <Text style={screenStyles.buttonLabel}>{t("scan.allowCamera")}</Text>
          </A11yButton>
        ) : (
          <View
            accessibilityLabel={t("scan.cameraPreview")}
            style={{
              height: 220,
              marginVertical: 12,
              overflow: "hidden",
              borderRadius: radius.lg,
            }}
          >
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

        <A11yButton
          label={t("scan.simulateBle")}
          hint={t("scan.simulateBleHint")}
          onPress={() => visitorBleScanner.simulate(DEMO_ZONE_A1)}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>{t("scan.simulateBle")}</Text>
        </A11yButton>
        <A11yButton
          label={t("scan.simulateNfc")}
          hint={t("scan.simulateNfcHint")}
          onPress={() =>
            visitorNfcScanner.simulate(
              "sm:offer:30000000-0000-0000-0000-000000000001",
            )
          }
          style={screenStyles.buttonSecondary}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>
            {t("scan.simulateNfc")}
          </Text>
        </A11yButton>

        <TextInput
          accessibilityLabel={t("scan.payloadLabel")}
          accessibilityHint={t("scan.payloadHint")}
          autoCapitalize="none"
          onChangeText={setManual}
          placeholder={t("scan.payloadPlaceholder")}
          placeholderTextColor={colors.mutedAA}
          style={screenStyles.input}
          value={manual}
        />
        <A11yButton
          label={t("scan.usePayload")}
          hint={t("scan.usePayloadHint")}
          onPress={() => visitorQrScanner.simulate(manual)}
          style={screenStyles.buttonSecondary}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>
            {t("scan.usePayload")}
          </Text>
        </A11yButton>

        {offers.map((offer) => (
          <View
            key={offer.id}
            accessibilityLabel={offer.product_name}
            style={screenStyles.card}
          >
            <Text style={screenStyles.body}>{offer.product_name}</Text>
            <Text style={screenStyles.muted}>
              {offer.discount_percent != null
                ? `${offer.discount_percent}%`
                : t("scan.offerFallback")}
              {offer.stand_name ? ` · ${offer.stand_name}` : ""}
            </Text>
            <A11yButton
              disabled={redeem.isPending}
              label={t("scan.redeemNamed", { name: offer.product_name })}
              hint={t("scan.redeemHint")}
              onPress={() => onRedeem(offer)}
              style={screenStyles.button}
            >
              <Text style={screenStyles.buttonLabel}>
                {redeem.isPending ? t("scan.redeeming") : t("scan.redeem")}
              </Text>
            </A11yButton>
          </View>
        ))}
      </ScrollView>
    </QueryGate>
  );
}
