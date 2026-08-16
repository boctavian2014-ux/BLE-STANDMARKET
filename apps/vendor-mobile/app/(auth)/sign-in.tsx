import {
  A11yButton,
  createAuthController,
  getSupabaseClient,
  useToast,
} from "@standmarket/supabase-client";
import { Link } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { screenStyles } from "../../lib/styles";

export default function SignInScreen() {
  const showToast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    try {
      await createAuthController(getSupabaseClient()).signIn(
        email.trim(),
        password,
      );
      showToast("Autentificat", "success");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Sign in failed",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={screenStyles.root}>
      <Text accessibilityRole="header" style={screenStyles.title}>
        StandMarket Vendor
      </Text>
      <Text style={screenStyles.muted}>Sign in</Text>
      <TextInput
        accessibilityLabel="Email"
        accessibilityHint="Adresa de email a vendorului"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#C5CDD6"
        style={screenStyles.input}
        value={email}
      />
      <TextInput
        accessibilityLabel="Parolă"
        accessibilityHint="Parola contului de vendor"
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#C5CDD6"
        secureTextEntry
        style={screenStyles.input}
        value={password}
      />
      <A11yButton
        disabled={busy}
        label="Sign in"
        hint="Autentifică vendorul"
        onPress={() => void onSubmit()}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>
          {busy ? "Signing in…" : "Sign in"}
        </Text>
      </A11yButton>
      <Link href="/(auth)/sign-up" style={{ marginTop: 16 }}>
        <Text accessibilityRole="link" style={screenStyles.muted}>
          Create an account
        </Text>
      </Link>
    </View>
  );
}
