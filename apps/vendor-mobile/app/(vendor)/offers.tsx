import {
  A11yButton,
  EmptyState,
  fetchActiveMembership,
  getSupabaseClient,
  LazyImage,
  MAX_OFFER_IMAGE_BYTES,
  OFFER_IMAGE_TOO_LARGE,
  QueryGate,
  bytesFromBase64,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { memo, useCallback, useEffect, useState } from "react";
import { AppState, FlatList, Text, TextInput, View } from "react-native";
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

type ParkedForm = {
  form: OfferDraft;
  editingId: string | null;
  photoUri: string | null;
  photoBase64: string | null;
  photoAction: "keep" | "replace" | "remove";
  pickerOpen?: boolean;
};

const PARK_KEY = "sm_vendor_offer_form";
let parkedForm: ParkedForm | null = null;

async function writePark(next: ParkedForm | null): Promise<void> {
  parkedForm = next;
  if (!next) {
    await AsyncStorage.removeItem(PARK_KEY);
    return;
  }
  await AsyncStorage.setItem(PARK_KEY, JSON.stringify(next));
}

async function readPark(): Promise<ParkedForm | null> {
  if (parkedForm) {
    return parkedForm;
  }
  const raw = await AsyncStorage.getItem(PARK_KEY);
  if (!raw) {
    return null;
  }
  parkedForm = JSON.parse(raw) as ParkedForm;
  return parkedForm;
}

function applyPickedAsset(
  asset: ImagePicker.ImagePickerAsset | undefined,
): Pick<ParkedForm, "photoUri" | "photoBase64" | "photoAction"> | "too-big" | null {
  if (!asset) {
    return null;
  }
  if (asset.fileSize != null && asset.fileSize > MAX_OFFER_IMAGE_BYTES) {
    return "too-big";
  }
  if (
    asset.base64 &&
    Math.floor((asset.base64.length * 3) / 4) > MAX_OFFER_IMAGE_BYTES
  ) {
    return "too-big";
  }
  return {
    photoUri: asset.uri,
    photoBase64: asset.base64 ?? null,
    photoAction: "replace",
  };
}

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
  const [form, setForm] = useState<OfferDraft | null>(
    () => parkedForm?.form ?? null,
  );
  const [editingId, setEditingId] = useState<string | null>(
    () => parkedForm?.editingId ?? null,
  );
  const [photoUri, setPhotoUri] = useState<string | null>(
    () => parkedForm?.photoUri ?? null,
  );
  const [photoAction, setPhotoAction] = useState<"keep" | "replace" | "remove">(
    () => parkedForm?.photoAction ?? "keep",
  );
  const [photoBase64, setPhotoBase64] = useState<string | null>(
    () => parkedForm?.photoBase64 ?? null,
  );
  const [pickerOpen, setPickerOpen] = useState(
    () => parkedForm?.pickerOpen ?? false,
  );
  const [pickerGuard, setPickerGuard] = useState(false);
  const [uploading, setUploading] = useState(false);

  const armPickerGuard = useCallback(() => {
    setPickerGuard(true);
    setTimeout(() => setPickerGuard(false), 1000);
  }, []);

  const applyParked = useCallback((next: ParkedForm) => {
    setForm(next.form);
    setEditingId(next.editingId);
    setPhotoUri(next.photoUri);
    setPhotoBase64(next.photoBase64);
    setPhotoAction(next.photoAction);
    setPickerOpen(Boolean(next.pickerOpen));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const parked = await readPark();
      if (cancelled) {
        return;
      }
      if (parked) {
        applyParked(parked);
      }
      if (!parked?.pickerOpen) {
        return;
      }
      const pending = await ImagePicker.getPendingResultAsync();
      if (cancelled || !pending || !("canceled" in pending)) {
        return;
      }
      if (pending.canceled) {
        await writePark({ ...parked, pickerOpen: false });
        armPickerGuard();
        return;
      }
      const picked = applyPickedAsset(pending.assets?.[0]);
      if (picked === "too-big") {
        await writePark({ ...parked, pickerOpen: false });
        armPickerGuard();
        showToast(t("offers.photoTooBig"), "error");
        return;
      }
      const base = parkedForm ?? parked;
      if (!picked || !base) {
        return;
      }
      const next = { ...base, ...picked, pickerOpen: false };
      await writePark(next);
      if (!cancelled) {
        applyParked(next);
        armPickerGuard();
      }
    };
    void hydrate();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void hydrate();
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [applyParked, armPickerGuard, showToast, t]);

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
      if (photoAction === "replace" && (photoBase64 || photoUri)) {
        setUploading(true);
        try {
          const url = await uploadOfferImage(
            offerId,
            standId,
            expoId,
            photoUri ?? "offer.jpg",
            undefined,
            photoBase64
              ? async () => bytesFromBase64(photoBase64)
              : undefined,
          );
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
      void writePark(null);
      setForm(null);
      setEditingId(null);
      setPhotoUri(null);
      setPhotoBase64(null);
      setPhotoAction("keep");
      setPickerOpen(false);
    });
  }, [
    editingId,
    form,
    photoAction,
    photoBase64,
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
    const next: ParkedForm = {
      form: draftFromOffer(offer),
      editingId: offer.id,
      photoUri: offer.image_url,
      photoBase64: null,
      photoAction: "keep",
    };
    void writePark(next);
    applyParked(next);
  }, [applyParked]);

  const resetForm = useCallback(() => {
    void writePark(null);
    setForm(null);
    setEditingId(null);
    setPhotoUri(null);
    setPhotoBase64(null);
    setPhotoAction("keep");
    setPickerOpen(false);
  }, []);

  const parkFields = useCallback(
    (nextForm: OfferDraft) => {
      void writePark({
        form: nextForm,
        editingId,
        photoUri,
        photoBase64,
        photoAction,
      });
    },
    [editingId, photoAction, photoBase64, photoUri],
  );

  const onPickPhoto = useCallback(async () => {
    if (!form) {
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast(t("offers.photoLibraryPermission"), "error");
      return;
    }
    setPickerOpen(true);
    await writePark({
      form,
      editingId,
      photoUri,
      photoBase64,
      photoAction,
      pickerOpen: true,
    });
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      base64: true,
    });
    if (result.canceled) {
      const parked = {
        form,
        editingId,
        photoUri,
        photoBase64,
        photoAction,
        pickerOpen: false,
      };
      await writePark(parked);
      applyParked(parked);
      armPickerGuard();
      return;
    }
    const next = applyPickedAsset(result.assets[0]);
    if (next === "too-big") {
      const parked = {
        form,
        editingId,
        photoUri,
        photoBase64,
        photoAction,
        pickerOpen: false,
      };
      await writePark(parked);
      applyParked(parked);
      armPickerGuard();
      showToast(t("offers.photoTooBig"), "error");
      return;
    }
    if (!next) {
      return;
    }
    const parked = { form, editingId, ...next, pickerOpen: false };
    await writePark(parked);
    applyParked(parked);
    armPickerGuard();
  }, [applyParked, armPickerGuard, editingId, form, photoAction, photoBase64, photoUri, showToast, t]);

  if (form) {
    return (
      <View style={screenStyles.root}>
        <Text accessibilityRole="header" style={screenStyles.title}>
          {editingId ? t("offers.edit") : t("offers.add")}
        </Text>
        <TextInput
          accessibilityLabel={t("offers.titleLabel")}
          accessibilityHint={t("offers.titleHint")}
          onChangeText={(product_name) => {
            const next = { ...form, product_name };
            setForm(next);
            parkFields(next);
          }}
          placeholder={t("offers.title")}
          placeholderTextColor={colors.mutedAA}
          style={screenStyles.input}
          value={form.product_name}
        />
        <TextInput
          accessibilityLabel={t("offers.descriptionLabel")}
          accessibilityHint={t("offers.descriptionHint")}
          multiline
          onChangeText={(description) => {
            const next = { ...form, description };
            setForm(next);
            parkFields(next);
          }}
          placeholder={t("offers.description")}
          placeholderTextColor={colors.mutedAA}
          style={screenStyles.input}
          value={form.description}
        />
        <TextInput
          accessibilityLabel={t("offers.discountLabel")}
          accessibilityHint={t("offers.discountHint")}
          keyboardType="decimal-pad"
          onChangeText={(discount_percent) => {
            const next = { ...form, discount_percent };
            setForm(next);
            parkFields(next);
          }}
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
              onPress={() => {
                const next = { ...form, status };
                setForm(next);
                parkFields(next);
              }}
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
          disabled={uploading || save.isPending || pickerOpen || pickerGuard}
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
            disabled={uploading || save.isPending || pickerOpen || pickerGuard}
            label={t("offers.removePhoto")}
            onPress={() => {
              const next: ParkedForm = {
                form,
                editingId,
                photoUri: null,
                photoBase64: null,
                photoAction: "remove",
              };
              void writePark(next);
              applyParked(next);
            }}
            style={screenStyles.buttonSecondary}
          >
            <Text style={screenStyles.buttonLabelOnSurface}>
              {t("offers.removePhoto")}
            </Text>
          </A11yButton>
        ) : null}
        <A11yButton
          disabled={save.isPending || uploading || pickerOpen || pickerGuard}
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
          disabled={pickerOpen || pickerGuard}
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
            const next: ParkedForm = {
              form: emptyDraft,
              editingId: null,
              photoUri: null,
              photoBase64: null,
              photoAction: "keep",
            };
            void writePark(next);
            applyParked(next);
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
