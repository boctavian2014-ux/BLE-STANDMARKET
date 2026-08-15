import { parseScanPayload, useSession } from "@standmarket/supabase-client";
import { colors } from "@standmarket/ui";
import { useMutation } from "@tanstack/react-query";
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
  const userId = session?.user.id ?? "";
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<RedemptionValidation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastQrAt = useRef(0);

  const validate = useMutation({
    mutationFn: async (raw: string) => {
      const parsed = parseScanPayload(raw);
      const code =
        parsed?.type === "redemption" ? parsed.code : raw.trim();
      if (!code || parsed?.type === "offer") {
        throw new Error("Scan invalid. Aștept sm:rdm:<cod>.");
      }
      return validateRedemptionCode(code);
    },
    onSuccess: (validation) => {
      setResult(validation);
      setError(null);
    },
    onError: (caught) => {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Validare eșuată");
    },
  });

  useEffect(() => {
    if (!userId) {
      return;
    }
    let stopQr: (() => void) | undefined;
    let stopNfc: (() => void) | undefined;
    void vendorQrScanner.start((raw) => {
      validate.mutate(raw);
    }).then((stop) => {
      stopQr = stop;
    });
    void vendorNfcScanner.start((raw) => {
      validate.mutate(raw);
    }).then((stop) => {
      stopNfc = stop;
    });
    return () => {
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
      <Text style={screenStyles.title}>Validare</Text>
      <Text style={screenStyles.muted}>
        Scanează QR sau NFC cu codul de redemption.
      </Text>
      {error ? <Text style={screenStyles.error}>{error}</Text> : null}
      {result ? (
        <View style={screenStyles.card}>
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
        <Pressable onPress={() => void requestPermission()} style={screenStyles.button}>
          <Text style={screenStyles.buttonLabel}>Permite camera (QR)</Text>
        </Pressable>
      ) : (
        <View style={{ height: 220, marginVertical: 12, overflow: "hidden", borderRadius: 12 }}>
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

      <Pressable
        onPress={() => vendorNfcScanner.simulate("sm:rdm:RDM-VISITOR-A-001")}
        style={screenStyles.buttonSecondary}
      >
        <Text style={screenStyles.buttonLabel}>Simulează NFC redemption</Text>
      </Pressable>

      <TextInput
        autoCapitalize="none"
        onChangeText={setManual}
        placeholder="sm:rdm:RDM-… sau RDM-…"
        placeholderTextColor="#9AA4B2"
        style={screenStyles.input}
        value={manual}
      />
      <Pressable
        onPress={() => vendorQrScanner.simulate(manual)}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>
          {validate.isPending ? "Se validează…" : "Validează payload"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
