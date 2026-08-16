import {
  A11yButton,
  QueryGate,
  useProfile,
  useSession,
} from "@standmarket/supabase-client";
import { useState } from "react";
import { Text, View } from "react-native";
import { screenStyles } from "../../lib/styles";

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const { profile, isLoading, error } = useProfile();
  const [crash, setCrash] = useState(false);

  if (crash) {
    throw new Error("Simulated crash");
  }

  return (
    <QueryGate loading={isLoading} error={error}>
      <View style={screenStyles.root}>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Email</Text>
          <Text style={screenStyles.body}>{session?.user.email ?? "—"}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>Name</Text>
          <Text style={screenStyles.body}>{profile?.display_name ?? "—"}</Text>
        </View>
        <A11yButton
          label="Log out"
          hint="Ieși din contul de vizitator"
          onPress={() => void signOut()}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>Log out</Text>
        </A11yButton>
        <A11yButton
          label="Simulează crash"
          hint="Afișează ecranul de eroare"
          onPress={() => setCrash(true)}
          style={screenStyles.buttonSecondary}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>Simulează crash</Text>
        </A11yButton>
      </View>
    </QueryGate>
  );
}
