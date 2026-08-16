import {
  A11yButton,
  createAuthController,
  getSupabaseClient,
  useToast,
} from "@standmarket/supabase-client";
import { colors, mapVisibleError, spacing, useTranslation } from "@standmarket/ui";
import { Link } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { screenStyles } from "../../lib/styles";

export default function SignUpScreen() {
  const showToast = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    try {
      await createAuthController(getSupabaseClient()).signUp(
        email.trim(),
        password,
      );
      showToast(t("auth.accountCreated"), "success");
    } catch (caught) {
      showToast(mapVisibleError(caught, t), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={screenStyles.root}>
      <Text accessibilityRole="header" style={screenStyles.title}>
        {t("auth.appName")}
      </Text>
      <Text style={screenStyles.muted}>{t("auth.visitorSignUpSubtitle")}</Text>
      <TextInput
        accessibilityLabel={t("auth.email")}
        accessibilityHint={t("auth.emailHintNew")}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder={t("auth.email")}
        placeholderTextColor={colors.mutedAA}
        style={screenStyles.input}
        value={email}
      />
      <TextInput
        accessibilityLabel={t("auth.password")}
        accessibilityHint={t("auth.passwordHintChoose")}
        onChangeText={setPassword}
        placeholder={t("auth.password")}
        placeholderTextColor={colors.mutedAA}
        secureTextEntry
        style={screenStyles.input}
        value={password}
      />
      <A11yButton
        disabled={busy}
        label={t("auth.signUp")}
        hint={t("auth.signUpHintVisitor")}
        onPress={() => void onSubmit()}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>
          {busy ? t("auth.creating") : t("auth.signUp")}
        </Text>
      </A11yButton>
      <Link
        href="/(auth)/sign-in"
        accessibilityRole="link"
        accessibilityLabel={t("auth.alreadyHaveAccount")}
        accessibilityHint={t("auth.alreadyHaveAccountHint")}
        style={{ marginTop: spacing.md }}
      >
        <Text style={screenStyles.muted}>{t("auth.alreadyHaveAccount")}</Text>
      </Link>
    </View>
  );
}
