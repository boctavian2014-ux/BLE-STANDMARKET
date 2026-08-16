import {
  A11yButton,
  fetchActiveMembership,
  getSupabaseClient,
  QueryGate,
  useProfile,
  useSession,
} from "@standmarket/supabase-client";
import { useTranslation } from "@standmarket/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { fetchVendorStand } from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const { profile, isLoading, error } = useProfile();
  const { t, language, setLanguage } = useTranslation();
  const userId = session?.user.id ?? "";
  const [crash, setCrash] = useState(false);
  const membership = useQuery({
    queryKey: ["membership", userId],
    queryFn: () => fetchActiveMembership(getSupabaseClient(), userId),
    enabled: Boolean(userId),
  });
  const standId = membership.data?.stand_id;
  const stand = useQuery({
    queryKey: ["vendor-stand", standId],
    queryFn: () => fetchVendorStand(standId ?? ""),
    enabled: Boolean(standId),
  });

  if (crash) {
    throw new Error("Simulated crash");
  }

  return (
    <QueryGate
      loading={isLoading || membership.isLoading || stand.isLoading}
      error={error ?? membership.error ?? stand.error}
      onRetry={() => {
        void membership.refetch();
        void stand.refetch();
      }}
    >
      <View style={screenStyles.root}>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>{t("profile.email")}</Text>
          <Text style={screenStyles.body}>{session?.user.email ?? "—"}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>{t("profile.name")}</Text>
          <Text style={screenStyles.body}>{profile?.display_name ?? "—"}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>{t("profile.stand")}</Text>
          <Text style={screenStyles.body}>{stand.data?.name ?? "—"}</Text>
        </View>
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>{t("profile.language")}</Text>
          <View style={screenStyles.row}>
            <A11yButton
              label={t("profile.languageRo")}
              hint={t("profile.languageRoHint")}
              onPress={() => setLanguage("ro")}
              style={[
                screenStyles.button,
                language !== "ro" ? screenStyles.buttonSecondary : null,
                { flex: 1, marginTop: 0 },
              ]}
            >
              <Text
                style={
                  language === "ro"
                    ? screenStyles.buttonLabel
                    : screenStyles.buttonLabelOnSurface
                }
              >
                {t("profile.languageRo")}
              </Text>
            </A11yButton>
            <A11yButton
              label={t("profile.languageEn")}
              hint={t("profile.languageEnHint")}
              onPress={() => setLanguage("en")}
              style={[
                screenStyles.button,
                language !== "en" ? screenStyles.buttonSecondary : null,
                { flex: 1, marginTop: 0 },
              ]}
            >
              <Text
                style={
                  language === "en"
                    ? screenStyles.buttonLabel
                    : screenStyles.buttonLabelOnSurface
                }
              >
                {t("profile.languageEn")}
              </Text>
            </A11yButton>
          </View>
        </View>
        <A11yButton
          label={t("profile.logOut")}
          hint={t("profile.logOutHintVendor")}
          onPress={() => void signOut()}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>{t("profile.logOut")}</Text>
        </A11yButton>
        <A11yButton
          label={t("profile.simulateCrash")}
          hint={t("profile.simulateCrashHint")}
          onPress={() => setCrash(true)}
          style={screenStyles.buttonSecondary}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>
            {t("profile.simulateCrash")}
          </Text>
        </A11yButton>
      </View>
    </QueryGate>
  );
}
