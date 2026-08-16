import {
  A11yButton,
  getSupabaseClient,
  redeemVendorActivationCode,
  useSession,
  useToast,
  type RedeemVendorResult,
} from "@standmarket/supabase-client";
import { colors, mapVisibleError, useTranslation } from "@standmarket/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { screenStyles } from "../lib/styles";

export default function ActivateScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const { t } = useTranslation();
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
      showToast(t("activate.successToast"), "success");
    } catch (caught) {
      showToast(mapVisibleError(caught, t), "error");
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
          {t("activate.success")}
        </Text>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>{t("activate.standId")}</Text>
          <Text style={screenStyles.body}>{result.stand_id}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>{t("activate.expoId")}</Text>
          <Text style={screenStyles.body}>{result.expo_id}</Text>
        </View>
        <A11yButton
          label={t("activate.continue")}
          hint={t("activate.continueHint")}
          onPress={() => void onContinue()}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>{t("activate.continue")}</Text>
        </A11yButton>
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      <Text accessibilityRole="header" style={screenStyles.title}>
        {t("activate.title")}
      </Text>
      <Text style={screenStyles.muted}>{t("activate.hint")}</Text>
      <TextInput
        accessibilityLabel={t("activate.codeLabel")}
        accessibilityHint={t("activate.codeHint")}
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={setCode}
        placeholder={t("activate.codePlaceholder")}
        placeholderTextColor={colors.mutedAA}
        style={screenStyles.input}
        value={code}
      />
      <A11yButton
        disabled={busy}
        label={t("activate.button")}
        hint={t("activate.buttonHint")}
        onPress={() => void onSubmit()}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>
          {busy ? t("activate.checking") : t("activate.button")}
        </Text>
      </A11yButton>
    </View>
  );
}
