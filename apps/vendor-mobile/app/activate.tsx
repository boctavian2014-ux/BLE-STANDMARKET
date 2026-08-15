import {
  A11yButton,
  GENERIC_ACTIVATION_ERROR,
  getSupabaseClient,
  redeemVendorActivationCode,
  useSession,
  useToast,
  type RedeemVendorResult,
} from "@standmarket/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { screenStyles } from "../lib/styles";

export default function ActivateScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RedeemVendorResult | null>(null);

  async function onSubmit() {
    setBusy(true);
    try {
      const redeemed = await redeemVendorActivationCode(
        getSupabaseClient(),
        code.trim(),
      );
      setResult(redeemed);
      showToast("Stand activat", "success");
    } catch {
      showToast(GENERIC_ACTIVATION_ERROR, "error");
    } finally {
      setBusy(false);
    }
  }

  async function onContinue() {
    await queryClient.invalidateQueries({
      queryKey: ["membership", session?.user.id],
    });
    router.replace("/(vendor)/offers");
  }

  if (result) {
    return (
      <View style={screenStyles.root}>
        <Text accessibilityRole="header" style={screenStyles.title}>
          Stand activat
        </Text>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>stand_id</Text>
          <Text style={screenStyles.body}>{result.stand_id}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>expo_id</Text>
          <Text style={screenStyles.body}>{result.expo_id}</Text>
        </View>
        <A11yButton
          label="Continuă"
          hint="Intră în aplicația vendor"
          onPress={() => void onContinue()}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>Continuă</Text>
        </A11yButton>
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      <Text accessibilityRole="header" style={screenStyles.title}>
        Activează stand
      </Text>
      <Text style={screenStyles.muted}>
        Introdu codul de activare (16 caractere Crockford)
      </Text>
      <TextInput
        accessibilityLabel="Cod de activare"
        accessibilityHint="16 caractere Crockford"
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={setCode}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        placeholderTextColor="#C5CDD6"
        style={screenStyles.input}
        value={code}
      />
      <A11yButton
        disabled={busy}
        label="Activează"
        hint="Validează codul de activare"
        onPress={() => void onSubmit()}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>
          {busy ? "Se verifică…" : "Activează"}
        </Text>
      </A11yButton>
    </View>
  );
}
