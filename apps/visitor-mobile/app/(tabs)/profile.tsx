import {
  A11yButton,
  QueryGate,
  useProfile,
  useSession,
  useToast,
} from "@standmarket/supabase-client";
import { colors, LANGUAGES, spacing, useTranslation } from "@standmarket/ui";
import { useState } from "react";
import { Text, View } from "react-native";
import { screenStyles } from "../../lib/styles";

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const { profile, isLoading, error, refetch } = useProfile();
  const { t, language, setLanguage } = useTranslation();
  const showToast = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const currentLanguage =
    LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  async function onLogOut() {
    setLoggingOut(true);
    try {
      await signOut();
      showToast(t("profile.loggedOut"), "success");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <QueryGate
      loading={isLoading}
      error={error}
      onRetry={() => void refetch()}
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
          <Text style={screenStyles.muted}>{t("profile.language")}</Text>
          <A11yButton
            label={`${t("profile.language")}, ${currentLanguage.nativeName}`}
            hint={t("profile.languageHint")}
            onPress={() => setLanguageOpen((open) => !open)}
            style={[screenStyles.buttonSecondary, { marginTop: spacing.sm }]}
          >
            <Text style={screenStyles.buttonLabelOnSurface}>
              {currentLanguage.nativeName}
            </Text>
          </A11yButton>
          {languageOpen
            ? LANGUAGES.map((item) => {
                const active = language === item.code;
                return (
                  <A11yButton
                    key={item.code}
                    label={
                      active
                        ? `${item.nativeName}, ${t("profile.languageSelected")}`
                        : item.nativeName
                    }
                    hint={t("profile.languageOptionHint", {
                      name: item.nativeName,
                    })}
                    onPress={() => {
                      setLanguage(item.code);
                      setLanguageOpen(false);
                    }}
                    style={[
                      screenStyles.buttonSecondary,
                      {
                        borderWidth: 1,
                        borderColor: active ? colors.accent : "transparent",
                      },
                    ]}
                  >
                    <Text style={screenStyles.buttonLabelOnSurface}>
                      {item.nativeName}
                    </Text>
                  </A11yButton>
                );
              })
            : null}
        </View>
        <A11yButton
          disabled={loggingOut}
          label={t("profile.logOut")}
          hint={t("profile.logOutHintVisitor")}
          onPress={() => void onLogOut()}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>
            {loggingOut ? t("profile.loggingOut") : t("profile.logOut")}
          </Text>
        </A11yButton>
      </View>
    </QueryGate>
  );
}
