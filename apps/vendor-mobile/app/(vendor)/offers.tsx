import {
  A11yButton,
  fetchActiveMembership,
  getSupabaseClient,
  LazyImage,
  QueryGate,
  usePostgresChanges,
  useQueuedAction,
  useSession,
} from "@standmarket/supabase-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import {
  createVendorOffer,
  fetchVendorOffers,
  fetchVendorStand,
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
}: {
  item: VendorOffer;
  onEdit: (offer: VendorOffer) => void;
  onToggle: (offer: VendorOffer) => void;
  toggling: boolean;
}) {
  return (
    <View
      accessibilityLabel={`${item.product_name}, ${item.status}`}
      style={screenStyles.card}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <LazyImage label={`Imagine ${item.product_name}`} />
        <View style={{ flex: 1 }}>
          <Text style={screenStyles.body}>{item.product_name}</Text>
          <Text style={screenStyles.muted}>
            {item.discount_percent != null
              ? `${item.discount_percent}%`
              : "Fără discount"}
            {" · "}
            {item.status}
          </Text>
        </View>
      </View>
      <View style={screenStyles.row}>
        <A11yButton
          label={`Editează ${item.product_name}`}
          hint="Deschide formularul de editare"
          onPress={() => onEdit(item)}
          style={[screenStyles.chip, { flex: 1 }]}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>Editează</Text>
        </A11yButton>
        <A11yButton
          disabled={toggling}
          label={
            item.status === "active"
              ? `Pauzează ${item.product_name}`
              : `Activează ${item.product_name}`
          }
          hint="Schimbă statusul ofertei"
          onPress={() => onToggle(item)}
          style={[screenStyles.chip, { flex: 1 }]}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>
            {item.status === "active" ? "Pauzează" : "Activează"}
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
  const userId = session?.user.id ?? "";
  const [form, setForm] = useState<OfferDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      if (editingId) {
        await updateVendorOffer(editingId, form);
      } else {
        await createVendorOffer(
          standId,
          userId,
          form,
          stand.data?.category ?? null,
        );
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
      "Ofertă salvată",
    ).then(() => {
      setForm(null);
      setEditingId(null);
    });
  }, [editingId, form, runQueued, save, stand.data?.category, standId, userId]);

  const onToggle = useCallback(
    (offer: VendorOffer) => {
      void runQueued(
        "toggleOffer",
        { offerId: offer.id, current: offer.status },
        async () => {
          await toggle.mutateAsync(offer);
        },
        offer.status === "active" ? "Ofertă pusă pe pauză" : "Ofertă activată",
      );
    },
    [runQueued, toggle],
  );

  const onEdit = useCallback((offer: VendorOffer) => {
    setEditingId(offer.id);
    setForm(draftFromOffer(offer));
  }, []);

  if (form) {
    return (
      <View style={screenStyles.root}>
        <Text accessibilityRole="header" style={screenStyles.title}>
          {editingId ? "Editează ofertă" : "Adaugă ofertă"}
        </Text>
        <TextInput
          accessibilityLabel="Titlu ofertă"
          accessibilityHint="Numele produsului"
          onChangeText={(product_name) => setForm({ ...form, product_name })}
          placeholder="Titlu"
          placeholderTextColor="#C5CDD6"
          style={screenStyles.input}
          value={form.product_name}
        />
        <TextInput
          accessibilityLabel="Descriere ofertă"
          accessibilityHint="Detalii opționale"
          multiline
          onChangeText={(description) => setForm({ ...form, description })}
          placeholder="Descriere"
          placeholderTextColor="#C5CDD6"
          style={screenStyles.input}
          value={form.description}
        />
        <TextInput
          accessibilityLabel="Discount procent"
          accessibilityHint="Valoare între 0 și 100"
          keyboardType="decimal-pad"
          onChangeText={(discount_percent) =>
            setForm({ ...form, discount_percent })
          }
          placeholder="Discount %"
          placeholderTextColor="#C5CDD6"
          style={screenStyles.input}
          value={form.discount_percent}
        />
        <View style={screenStyles.row}>
          {STATUSES.map((status) => (
            <A11yButton
              key={status}
              label={`Status ${status}`}
              hint="Selectează statusul ofertei"
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
                {status}
              </Text>
            </A11yButton>
          ))}
        </View>
        <A11yButton
          disabled={save.isPending}
          label="Salvează oferta"
          hint="Trimite oferta sau o pune în coadă dacă ești offline"
          onPress={onSave}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>
            {save.isPending ? "Se salvează…" : "Salvează"}
          </Text>
        </A11yButton>
        <A11yButton
          label="Anulează"
          hint="Închide formularul fără salvare"
          onPress={() => {
            setForm(null);
            setEditingId(null);
          }}
          style={screenStyles.buttonSecondary}
        >
          <Text style={screenStyles.buttonLabelOnSurface}>Anulează</Text>
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
          label="Adaugă ofertă"
          hint="Deschide formularul pentru o ofertă nouă"
          onPress={() => {
            setEditingId(null);
            setForm(emptyDraft);
          }}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>Adaugă ofertă</Text>
        </A11yButton>
        <FlatList
          data={offers.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={screenStyles.muted}>Nicio ofertă pe acest stand</Text>
          }
          renderItem={({ item }) => (
            <OfferRow
              item={item}
              onEdit={onEdit}
              onToggle={onToggle}
              toggling={toggle.isPending}
            />
          )}
        />
      </View>
    </QueryGate>
  );
}
