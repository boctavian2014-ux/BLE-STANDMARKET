import { useSession } from "@standmarket/supabase-client";
import { colors } from "@standmarket/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { INTEREST_CATEGORIES } from "../../lib/categories";
import {
  addInterest,
  fetchCurrentExpoId,
  fetchInterestCategories,
  removeInterest,
} from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

export default function InterestsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const expo = useQuery({
    queryKey: ["expo", "current"],
    queryFn: fetchCurrentExpoId,
  });

  const selected = useQuery({
    queryKey: ["interests", userId, expo.data],
    queryFn: () => fetchInterestCategories(userId!, expo.data!),
    enabled: Boolean(userId && expo.data),
  });

  const toggle = useMutation({
    mutationFn: async (category: string) => {
      if (!userId || !expo.data) {
        throw new Error("Not signed in");
      }
      const isOn = selected.data?.includes(category);
      if (isOn) {
        await removeInterest(userId, expo.data, category);
      } else {
        await addInterest(userId, expo.data, category);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interests", userId, expo.data] });
    },
  });

  if (expo.isLoading || selected.isLoading) {
    return (
      <View style={screenStyles.root}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (expo.isError || selected.isError) {
    return (
      <View style={screenStyles.root}>
        <Text style={screenStyles.error}>Could not load interests</Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      <Text style={screenStyles.muted}>
        Static categories (placeholder; no categories table).
      </Text>
      {INTEREST_CATEGORIES.map((category) => {
        const isOn = selected.data?.includes(category) ?? false;
        return (
          <Pressable
            key={category}
            onPress={() => toggle.mutate(category)}
            style={[
              screenStyles.card,
              isOn ? { borderWidth: 1, borderColor: colors.accent } : null,
            ]}
          >
            <Text style={screenStyles.body}>{category}</Text>
            <Text style={screenStyles.muted}>{isOn ? "Selected" : "Tap to select"}</Text>
          </Pressable>
        );
      })}
      {toggle.isError ? (
        <Text style={screenStyles.error}>
          {toggle.error instanceof Error ? toggle.error.message : "Save failed"}
        </Text>
      ) : null}
    </View>
  );
}
