import {
  A11yButton,
  QueryGate,
  useQueuedAction,
  useSession,
} from "@standmarket/supabase-client";
import { colors, useTranslation } from "@standmarket/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Text, View } from "react-native";
import { INTEREST_CATEGORIES } from "../../lib/categories";
import {
  addInterest,
  fetchCurrentExpoId,
  fetchInterestCategories,
  removeInterest,
} from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

const CATEGORY_KEYS = {
  Electronics: "interests.electronics",
  Fashion: "interests.fashion",
  Home: "interests.home",
  Food: "interests.food",
} as const;

export default function InterestsScreen() {
  const { session } = useSession();
  const { t } = useTranslation();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const runQueued = useQueuedAction();

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
      void queryClient.invalidateQueries({
        queryKey: ["interests", userId, expo.data],
      });
    },
  });

  const onToggle = useCallback(
    (category: string, isOn: boolean) => {
      if (!userId || !expo.data) {
        return;
      }
      void runQueued(
        "toggleInterest",
        {
          userId,
          expoId: expo.data,
          category,
          action: isOn ? "remove" : "add",
        },
        async () => {
          await toggle.mutateAsync(category);
        },
        isOn ? t("interests.removed") : t("interests.saved"),
      );
    },
    [expo.data, runQueued, t, toggle, userId],
  );

  return (
    <QueryGate
      loading={expo.isLoading || selected.isLoading}
      error={expo.error ?? selected.error}
      onRetry={() => {
        void expo.refetch();
        void selected.refetch();
      }}
    >
      <View style={screenStyles.root}>
        <Text style={screenStyles.muted}>{t("interests.placeholder")}</Text>
        {INTEREST_CATEGORIES.map((category) => {
          const isOn = selected.data?.includes(category) ?? false;
          const label = t(CATEGORY_KEYS[category]);
          return (
            <A11yButton
              key={category}
              label={label}
              hint={isOn ? t("interests.removeHint") : t("interests.addHint")}
              onPress={() => onToggle(category, isOn)}
              style={[
                screenStyles.card,
                isOn ? { borderWidth: 1, borderColor: colors.accent } : null,
              ]}
            >
              <Text style={screenStyles.body}>{label}</Text>
              <Text style={screenStyles.muted}>
                {isOn ? t("interests.selected") : t("interests.tapToSelect")}
              </Text>
            </A11yButton>
          );
        })}
      </View>
    </QueryGate>
  );
}
