import { createAuthController, getSupabaseClient } from "@standmarket/supabase-client";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { screenStyles } from "../../lib/styles";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await createAuthController(getSupabaseClient()).signIn(
        email.trim(),
        password,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={screenStyles.root}>
      <Text style={screenStyles.title}>StandMarket Vendor</Text>
      <Text style={screenStyles.muted}>Sign in</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#9AA4B2"
        style={screenStyles.input}
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#9AA4B2"
        secureTextEntry
        style={screenStyles.input}
        value={password}
      />
      {error ? <Text style={screenStyles.error}>{error}</Text> : null}
      <Pressable disabled={busy} onPress={() => void onSubmit()} style={screenStyles.button}>
        <Text style={screenStyles.buttonLabel}>{busy ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
      <Link href="/(auth)/sign-up" style={{ marginTop: 16 }}>
        <Text style={screenStyles.muted}>Create an account</Text>
      </Link>
    </View>
  );
}
