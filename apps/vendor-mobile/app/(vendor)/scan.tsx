import {
  A11yButton,
  parseScanPayload,
  QuerySkeleton,
  useSession,
  useToast,
} from "@standmarket/supabase-client";
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
        throw new Error("Scan invalid. Aștept sm:rdm:<cod>.");
      }
      return validateRedemptionCode(code);
    },
    onSuccess: (validation) => {
      setResult(validation);
      showToast(
        validation.status === "valid" ? "Redemption valid" : "Redemption invalid",
        validation.status === "valid" ? "success" : "error",
      );
    },
    onError: (caught) => {
      setResult(null);
      showToast(
        caught instanceof Error ? caught.message : "Validare eșuată",
        "error",
      );
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
    return <QuerySkeleton label="Se cere permisiunea camerei" />;
  }

  return (
    <ScrollView style={screenStyles.root}>
      <Text accessibilityRole="header" style={screenStyles.title}>
        Validare
      </Text>
      <Text style={screenStyles.muted}>
        Scanează QR sau NFC cu codul de redemption.
      </Text>
      {result ? (
        <View
          accessibilityLabel={`${result.status === "valid" ? "VALID" : "INVALID"} ${result.product_name ?? ""}`}
          style={screenStyles.card}
        >
          <Text style={screenStyles.body}>
            {result.status === "valid" ? "VALID" : "INVALID"}
          </Text>
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
          label="Permite camera"
          hint="Activează camera pentru scanare QR"
          onPress={() => void requestPermission()}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>Permite camera (QR)</Text>
        </A11yButton>
      ) : (
        <View
          accessibilityLabel="Previzualizare cameră QR"
          style={{
            height: 220,
            marginVertical: 12,
            overflow: "hidden",
            borderRadius: 12,
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
        label="Simulează NFC redemption"
        hint="Validează un cod de test"
        onPress={() => vendorNfcScanner.simulate("sm:rdm:RDM-VISITOR-A-001")}
        style={screenStyles.buttonSecondary}
      >
        <Text style={screenStyles.buttonLabelOnSurface}>
          Simulează NFC redemption
        </Text>
      </A11yButton>

      <TextInput
        accessibilityLabel="Payload redemption"
        accessibilityHint="Introdu sm:rdm:cod sau RDM-cod"
        autoCapitalize="none"
        onChangeText={setManual}
        placeholder="sm:rdm:RDM-… sau RDM-…"
        placeholderTextColor="#C5CDD6"
        style={screenStyles.input}
        value={manual}
      />
      <A11yButton
        disabled={validate.isPending}
        label="Validează payload"
        hint="Verifică codul introdus"
        onPress={() => vendorQrScanner.simulate(manual)}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>
          {validate.isPending ? "Se validează…" : "Validează payload"}
        </Text>
      </A11yButton>
    </ScrollView>
  );
}
