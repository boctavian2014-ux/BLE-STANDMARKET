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

export default function SignUpScreen() {
  const showToast = useToast();
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
      showToast("Cont creat", "success");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Sign up failed",
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
      <Text style={screenStyles.muted}>
        Create an account, then activate a stand
      </Text>
      <TextInput
        accessibilityLabel="Email"
        accessibilityHint="Adresa de email pentru noul cont"
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
        accessibilityHint="Alege o parolă"
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#C5CDD6"
        secureTextEntry
        style={screenStyles.input}
        value={password}
      />
      <A11yButton
        disabled={busy}
        label="Sign up"
        hint="Creează contul de vendor"
        onPress={() => void onSubmit()}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>
          {busy ? "Creating…" : "Sign up"}
        </Text>
      </A11yButton>
      <Link href="/(auth)/sign-in" style={{ marginTop: 16 }}>
        <Text accessibilityRole="link" style={screenStyles.muted}>
          Already have an account
        </Text>
      </Link>
    </View>
  );
}
