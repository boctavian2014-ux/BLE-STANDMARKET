import { useProfile, useSession } from "@standmarket/supabase-client";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { colors } from "@standmarket/ui";
import { screenStyles } from "../../lib/styles";

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const { profile, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <View style={screenStyles.root}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      <View style={screenStyles.card}>
        <Text style={screenStyles.muted}>Email</Text>
        <Text style={screenStyles.body}>{session?.user.email ?? "—"}</Text>
      </View>
      <View style={screenStyles.card}>
        <Text style={screenStyles.muted}>Name</Text>
        <Text style={screenStyles.body}>{profile?.display_name ?? "—"}</Text>
      </View>
      {error ? <Text style={screenStyles.error}>{error}</Text> : null}
      <Pressable onPress={() => void signOut()} style={screenStyles.button}>
        <Text style={screenStyles.buttonLabel}>Log out</Text>
      </Pressable>
    </View>
  );
}
