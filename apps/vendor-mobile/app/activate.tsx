import {
  GENERIC_ACTIVATION_ERROR,
  getSupabaseClient,
  redeemVendorActivationCode,
  useSession,
  type RedeemVendorResult,
} from "@standmarket/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { screenStyles } from "../lib/styles";

export default function ActivateScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RedeemVendorResult | null>(null);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const redeemed = await redeemVendorActivationCode(
        getSupabaseClient(),
        code.trim(),
      );
      setResult(redeemed);
    } catch {
      setError(GENERIC_ACTIVATION_ERROR);
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
        <Text style={screenStyles.title}>Stand activat</Text>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>stand_id</Text>
          <Text style={screenStyles.body}>{result.stand_id}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>expo_id</Text>
          <Text style={screenStyles.body}>{result.expo_id}</Text>
        </View>
        <Pressable onPress={() => void onContinue()} style={screenStyles.button}>
          <Text style={screenStyles.buttonLabel}>Continuă</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      <Text style={screenStyles.title}>Activează stand</Text>
      <Text style={screenStyles.muted}>
        Introdu codul de activare (16 caractere Crockford)
      </Text>
      <TextInput
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={setCode}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        placeholderTextColor="#9AA4B2"
        style={screenStyles.input}
        value={code}
      />
      {error ? <Text style={screenStyles.error}>{error}</Text> : null}
      <Pressable disabled={busy} onPress={() => void onSubmit()} style={screenStyles.button}>
        <Text style={screenStyles.buttonLabel}>
          {busy ? "Se verifică…" : "Activează"}
        </Text>
      </Pressable>
    </View>
  );
}
