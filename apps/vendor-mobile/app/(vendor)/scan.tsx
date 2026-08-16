import {
  A11yButton,
  EmptyState,
  parseScanPayload,
  QuerySkeleton,
  useSession,
  useToast,
} from "@standmarket/supabase-client";
import { colors, mapVisibleError, radius, useTranslation } from "@standmarket/ui";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import {
  vendorNfcScanner,
  vendorQrScanner,
} from "../../lib/hardware-adapters";
import { loadCamera } from "../../lib/load-camera";
import {
  validateRedemptionCode,
  type RedemptionValidation,
} from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

const { CameraView, useCameraPermissions } = loadCamera();

export default function VendorScanScreen() {
  const { session } = useSession();
  const showToast = useToast();
  const { t } = useTranslation();
  const userId = session?.user.id ?? "";
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<RedemptionValidation | null>(null);
  const lastQrAt = useRef(0);

  const validate = useMutation({
    mutationFn: async (raw: string) => {
      const parsed = parseScanPayload(raw);
      const code = parsed?.type === "redemption" ? parsed.code : raw.trim();
      if (!code || parsed?.type === "offer") {
        throw new Error("Scan invalid");
      }
      return validateRedemptionCode(code);
    },
    onSuccess: (validation) => {
      setResult(validation);
      showToast(
        validation.status === "valid"
          ? t("validate.validToast")
          : t("validate.invalidToast"),
        validation.status === "valid" ? "success" : "error",
      );
    },
    onError: (caught) => {
      setResult(null);
      showToast(mapVisibleError(caught, t), "error");
    },
  });

  useEffect(() => {
    if (!userId) {
      return;
    }
    let stopQr: (() => void) | undefined;
    let stopNfc: (() => void) | undefined;
    void vendorQrScanner
      .start((raw) => {
        validate.mutate(raw);
      })
      .then((stop) => {
        stopQr = stop;
      });
    void vendorNfcScanner
      .start((raw) => {
        validate.mutate(raw);
      })
      .then((stop) => {
        stopNfc = stop;
      });
    return () => {
      stopQr?.();
      stopNfc?.();
    };
  }, [userId]);

  if (!permission) {
    return <QuerySkeleton label={t("query.cameraPermission")} />;
  }

  const statusLabel =
    result?.status === "valid" ? t("validate.valid") : t("validate.invalid");

  return (
    <ScrollView style={screenStyles.root}>
      {result ? null : (
        <EmptyState
          icon="🔎"
          title={t("empty.validateTitle")}
          message={t("empty.validateMessage")}
        />
      )}
      {result ? (
        <View
          accessibilityLabel={t("validate.resultA11y", {
            status: statusLabel,
            name: result.product_name ?? "",
          })}
          style={screenStyles.card}
        >
          <Text style={screenStyles.body}>{statusLabel}</Text>
          {result.product_name ? (
            <Text style={screenStyles.muted}>{result.product_name}</Text>
          ) : null}
          {result.redemption_code ? (
            <Text style={screenStyles.muted}>{result.redemption_code}</Text>
          ) : null}
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
            onBarcodeScanned={(scan: { data: string }) => {
              const now = Date.now();
              if (now - lastQrAt.current < 1500) {
                return;
              }
              lastQrAt.current = now;
              vendorQrScanner.simulate(scan.data);
            }}
          />
        </View>
      )}

      <A11yButton
        label={t("validate.simulateNfc")}
        hint={t("validate.simulateNfcHint")}
        onPress={() => vendorNfcScanner.simulate("sm:rdm:RDM-VISITOR-A-001")}
        style={screenStyles.buttonSecondary}
      >
        <Text style={screenStyles.buttonLabelOnSurface}>
          {t("validate.simulateNfc")}
        </Text>
      </A11yButton>

      <TextInput
        accessibilityLabel={t("validate.payloadLabel")}
        accessibilityHint={t("validate.payloadHint")}
        autoCapitalize="none"
        onChangeText={setManual}
        placeholder={t("validate.payloadPlaceholder")}
        placeholderTextColor={colors.mutedAA}
        style={screenStyles.input}
        value={manual}
      />
      <A11yButton
        disabled={validate.isPending}
        label={t("validate.action")}
        hint={t("validate.actionHint")}
        onPress={() => vendorQrScanner.simulate(manual)}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>
          {validate.isPending ? t("validate.validating") : t("validate.action")}
        </Text>
      </A11yButton>
    </ScrollView>
  );
}
