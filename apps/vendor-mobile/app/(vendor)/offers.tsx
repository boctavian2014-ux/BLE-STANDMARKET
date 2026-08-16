import {
  A11yButton,
  EmptyState,
  fetchActiveMembership,
  getSupabaseClient,
  LazyImage,
  MAX_OFFER_IMAGE_BYTES,
  OFFER_IMAGE_TOO_LARGE,
  QueryGate,
  deleteOfferImage,
  offerImagePath,
  uploadOfferImage,
  usePostgresChanges,
  useQueuedAction,
  useSession,
  useToast,
} from "@standmarket/supabase-client";
import { colors, useTranslation } from "@standmarket/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { memo, useCallback, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import {
  createVendorOffer,
  fetchVendorOffers,
  fetchVendorStand,
  setVendorOfferImage,
  toggleVendorOfferStatus,
  updateVendorOffer,
  type OfferDraft,
  type OfferStatus,
  type VendorOffer,
} from "../../lib/queries";
import { screenStyles } from "../../lib/styles";

const STATUSES: OfferStatus[] = ["draft", "active", "paused"];

const emptyDraft: OfferDraft = {
  product_name: "",
  description: "",
  discount_percent: "",
  status: "draft",
};

function draftFromOffer(offer: VendorOffer): OfferDraft {
  return {
    product_name: offer.product_name,
    description: offer.description ?? "",
    discount_percent:
      offer.discount_percent != null ? String(offer.discount_percent) : "",
    status: offer.status,
  };
}

const OfferRow = memo(function OfferRow({
  item,
  onEdit,
  onToggle,
  toggling,
  labels,
}: {
  item: VendorOffer;
  onEdit: (offer: VendorOffer) => void;
  onToggle: (offer: VendorOffer) => void;
  toggling: boolean;
  labels: {
    row: string;
    image: string;
    discount: string;
    status: string;
    edit: string;
    editNamed: string;
    editHint: string;
    toggle: string;
    toggleNamed: string;
    toggleHint: string;
    saving: string;
  };
}) {
  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={labels.row}
      style={screenStyles.card}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <LazyImage uri={item.image_url} label={labels.image} />
        <View style={{ flex: 1 }}>
          <Text style={screenStyles.body}>{item.product_name}</Text>
          <Text style={screenStyles.muted}>
            {labels.discount}
            {" · "}
            {labels.status}
          </Text>
        </View>
      </View>
      <View style={screenStyles.row}>
        <A11yButton
          label={labels.editNamed}
          hint={labels.editHint}
          onPress={() => onEdit(item)}
          style={[screenStyles.chip, { flex: 1 }]}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>{labels.edit}</Text>
        </A11yButton>
        <A11yButton
          disabled={toggling}
          label={labels.toggleNamed}
          hint={labels.toggleHint}
          onPress={() => onToggle(item)}
          style={[screenStyles.chip, { flex: 1 }]}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>
            {toggling ? labels.saving : labels.toggle}
          </Text>
        </A11yButton>
      </View>
    </View>
  );
});

export default function OffersScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const runQueued = useQueuedAction();
  const { t } = useTranslation();
  const showToast = useToast();
  const userId = session?.user.id ?? "";
  const [form, setForm] = useState<OfferDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoAction, setPhotoAction] = useState<"keep" | "replace" | "remove">(
    "keep",
  );
  const [uploading, setUploading] = useState(false);

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

  const offers = useQuery({
    queryKey: ["vendor-offers", standId],
    queryFn: () => fetchVendorOffers(standId ?? ""),
    enabled: Boolean(standId),
  });

  usePostgresChanges(
    Boolean(standId),
    `vendor-offers-${standId ?? "none"}`,
    {
      table: "offers",
      event: "*",
      filter: standId ? `stand_id=eq.${standId}` : undefined,
    },
    () => {
      void queryClient.invalidateQueries({ queryKey: ["vendor-offers", standId] });
      void queryClient.invalidateQueries({
        queryKey: ["vendor-stand-stats", standId],
      });
    },
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!form || !standId || !userId) {
        throw new Error("Missing stand");
      }
      if (!form.product_name.trim()) {
        throw new Error("Title is required");
      }
      const expoId = stand.data?.expo_id;
      let offerId = editingId;
      if (editingId) {
        await updateVendorOffer(editingId, form);
      } else {
        offerId = await createVendorOffer(
          standId,
          userId,
          form,
          stand.data?.category ?? null,
        );
      }
      if (!offerId || !expoId) {
        return;
      }
      if (photoAction === "replace" && photoUri) {
        setUploading(true);
        try {
          const url = await uploadOfferImage(offerId, standId, expoId, photoUri);
          await setVendorOfferImage(offerId, url);
        } catch (error) {
          const tooBig =
            error instanceof Error && error.message === OFFER_IMAGE_TOO_LARGE;
          showToast(
            tooBig ? t("offers.photoTooBig") : t("offers.uploadFailed"),
            "error",
          );
        } finally {
          setUploading(false);
        }
      }
      if (photoAction === "remove") {
        try {
          await deleteOfferImage(offerImagePath(expoId, standId, offerId));
        } catch {
          // Best effort if the object is already missing.
        }
        await setVendorOfferImage(offerId, null);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vendor-offers", standId] });
    },
  });

  const toggle = useMutation({
    mutationFn: (offer: VendorOffer) =>
      toggleVendorOfferStatus(offer.id, offer.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vendor-offers", standId] });
    },
  });

  const onSave = useCallback(() => {
    if (!form || !standId || !userId) {
      return;
    }
    void runQueued(
      editingId ? "updateOffer" : "createOffer",
      editingId
        ? { offerId: editingId, draft: form }
        : {
            standId,
            userId,
            draft: form,
            category: stand.data?.category ?? null,
          },
      async () => {
        await save.mutateAsync();
      },
      t("offers.saved"),
    ).then(() => {
      setForm(null);
      setEditingId(null);
      setPhotoUri(null);
      setPhotoAction("keep");
    });
  }, [
    editingId,
    form,
    photoAction,
    photoUri,
    runQueued,
    save,
    stand.data?.category,
    stand.data?.expo_id,
    standId,
    t,
    userId,
  ]);

  const onToggle = useCallback(
    (offer: VendorOffer) => {
      void runQueued(
        "toggleOffer",
        { offerId: offer.id, current: offer.status },
        async () => {
          await toggle.mutateAsync(offer);
        },
        offer.status === "active" ? t("offers.paused") : t("offers.activated"),
      );
    },
    [runQueued, t, toggle],
  );

  const onEdit = useCallback((offer: VendorOffer) => {
    setEditingId(offer.id);
    setForm(draftFromOffer(offer));
    setPhotoUri(offer.image_url);
    setPhotoAction("keep");
  }, []);

  const resetForm = useCallback(() => {
    setForm(null);
    setEditingId(null);
    setPhotoUri(null);
    setPhotoAction("keep");
  }, []);

  const onPickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    if (!asset) {
      return;
    }
    if (asset.fileSize != null && asset.fileSize > MAX_OFFER_IMAGE_BYTES) {
      showToast(t("offers.photoTooBig"), "error");
      return;
    }
    setPhotoUri(asset.uri);
    setPhotoAction("replace");
  }, [showToast, t]);

  if (form) {
    return (
      <View style={screenStyles.root}>
        <Text accessibilityRole="header" style={screenStyles.title}>
          {editingId ? t("offers.edit") : t("offers.add")}
        </Text>
        <TextInput
          accessibilityLabel={t("offers.titleLabel")}
          accessibilityHint={t("offers.titleHint")}
          onChangeText={(product_name) => setForm({ ...form, product_name })}
          placeholder={t("offers.title")}
          placeholderTextColor={colors.mutedAA}
          style={screenStyles.input}
          value={form.product_name}
        />
        <TextInput
          accessibilityLabel={t("offers.descriptionLabel")}
          accessibilityHint={t("offers.descriptionHint")}
          multiline
          onChangeText={(description) => setForm({ ...form, description })}
          placeholder={t("offers.description")}
          placeholderTextColor={colors.mutedAA}
          style={screenStyles.input}
          value={form.description}
        />
        <TextInput
          accessibilityLabel={t("offers.discountLabel")}
          accessibilityHint={t("offers.discountHint")}
          keyboardType="decimal-pad"
          onChangeText={(discount_percent) =>
            setForm({ ...form, discount_percent })
          }
          placeholder={t("offers.discount")}
          placeholderTextColor={colors.mutedAA}
          style={screenStyles.input}
          value={form.discount_percent}
        />
        <View style={screenStyles.row}>
          {STATUSES.map((status) => (
            <A11yButton
              key={status}
              label={t("offers.statusLabel", {
                status: t(`offers.status.${status}`),
              })}
              hint={t("offers.statusHint")}
              onPress={() => setForm({ ...form, status })}
              style={[
                screenStyles.chip,
                form.status === status ? screenStyles.chipActive : null,
              ]}
            >
              <Text
                style={
                  form.status === status
                    ? screenStyles.buttonLabel
                    : screenStyles.buttonLabelOnSurface
                }
              >
                {t(`offers.status.${status}`)}
              </Text>
            </A11yButton>
          ))}
        </View>
        <LazyImage
          uri={photoUri}
          label={t("offers.image", { name: form.product_name || t("offers.title") })}
          size="lg"
          initial={form.product_name.trim().slice(0, 1).toUpperCase() || "?"}
        />
        <A11yButton
          disabled={uploading || save.isPending}
          label={photoUri ? t("offers.changePhoto") : t("offers.addPhoto")}
          onPress={() => void onPickPhoto()}
          style={screenStyles.buttonSecondary}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>
            {uploading
              ? t("offers.uploading")
              : photoUri
                ? t("offers.changePhoto")
                : t("offers.addPhoto")}
          </Text>
        </A11yButton>
        {photoUri ? (
          <A11yButton
            disabled={uploading || save.isPending}
            label={t("offers.removePhoto")}
            onPress={() => {
              setPhotoUri(null);
              setPhotoAction("remove");
            }}
            style={screenStyles.buttonSecondary}
          >
            <Text style={screenStyles.buttonLabelOnSurface}>
              {t("offers.removePhoto")}
            </Text>
          </A11yButton>
        ) : null}
        <A11yButton
          disabled={save.isPending || uploading}
          label={t("offers.saveLabel")}
          hint={t("offers.saveHint")}
          onPress={onSave}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>
            {save.isPending || uploading ? t("offers.saving") : t("offers.save")}
          </Text>
        </A11yButton>
        <A11yButton
          label={t("offers.cancel")}
          hint={t("offers.cancelHint")}
          onPress={resetForm}
          style={screenStyles.buttonSecondary}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>{t("offers.cancel")}</Text>
        </A11yButton>
      </View>
    );
  }

  return (
    <QueryGate
      loading={membership.isLoading || offers.isLoading}
      error={membership.error ?? offers.error}
      onRetry={() => {
        void membership.refetch();
        void offers.refetch();
      }}
    >
      <View style={screenStyles.root}>
        <A11yButton
          label={t("offers.add")}
          hint={t("offers.addHint")}
          onPress={() => {
            setEditingId(null);
            setForm(emptyDraft);
            setPhotoUri(null);
            setPhotoAction("keep");
          }}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>{t("offers.add")}</Text>
        </A11yButton>
        <FlatList
          data={offers.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              icon="🏷️"
              title={t("empty.offersTitle")}
              message={t("empty.offersMessage")}
            />
          }
          renderItem={({ item }) => (
            <OfferRow
              item={item}
              onEdit={onEdit}
              onToggle={onToggle}
              toggling={toggle.isPending}
              labels={{
                row: t("offers.rowLabel", {
                  name: item.product_name,
                  status: t(`offers.status.${item.status}`),
                }),
                image: t("offers.image", { name: item.product_name }),
                discount:
                  item.discount_percent != null
                    ? `${item.discount_percent}%`
                    : t("offers.noDiscount"),
                status: t(`offers.status.${item.status}`),
                edit: t("offers.editAction"),
                editNamed: t("offers.editNamed", { name: item.product_name }),
                editHint: t("offers.editHint"),
                toggle:
                  item.status === "active"
                    ? t("offers.pause")
                    : t("offers.activate"),
                toggleNamed:
                  item.status === "active"
                    ? t("offers.pauseNamed", { name: item.product_name })
                    : t("offers.activateNamed", { name: item.product_name }),
                toggleHint: t("offers.toggleHint"),
                saving: t("offers.saving"),
              }}
            />
          )}
        />
      </View>
    </QueryGate>
  );
}
