import {
  fetchActiveMembership,
  getSupabaseClient,
  usePostgresChanges,
  useSession,
} from "@standmarket/supabase-client";
import { colors } from "@standmarket/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
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

export default function OffersScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? "";
  const [form, setForm] = useState<OfferDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
        await createVendorOffer(standId, userId, form, stand.data?.category ?? null);
      }
    },
    onSuccess: async () => {
      setForm(null);
      setEditingId(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["vendor-offers", standId] });
    },
    onError: (caught) => {
      setFormError(caught instanceof Error ? caught.message : "Save failed");
    },
  });

  const toggle = useMutation({
    mutationFn: (offer: VendorOffer) =>
      toggleVendorOfferStatus(offer.id, offer.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vendor-offers", standId] });
    },
  });

  if (membership.isLoading || offers.isLoading) {
    return (
      <View style={screenStyles.root}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (membership.isError || offers.isError) {
    return (
      <View style={screenStyles.root}>
        <Text style={screenStyles.error}>
          {membership.error instanceof Error
            ? membership.error.message
            : offers.error instanceof Error
              ? offers.error.message
              : "Could not load offers"}
        </Text>
      </View>
    );
  }

  if (form) {
    return (
      <View style={screenStyles.root}>
        <Text style={screenStyles.title}>
          {editingId ? "Editează ofertă" : "Adaugă ofertă"}
        </Text>
        <TextInput
          onChangeText={(product_name) => setForm({ ...form, product_name })}
          placeholder="Titlu"
          placeholderTextColor="#9AA4B2"
          style={screenStyles.input}
          value={form.product_name}
        />
        <TextInput
          multiline
          onChangeText={(description) => setForm({ ...form, description })}
          placeholder="Descriere"
          placeholderTextColor="#9AA4B2"
          style={screenStyles.input}
          value={form.description}
        />
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(discount_percent) =>
            setForm({ ...form, discount_percent })
          }
          placeholder="Discount %"
          placeholderTextColor="#9AA4B2"
          style={screenStyles.input}
          value={form.discount_percent}
        />
        <View style={screenStyles.row}>
          {STATUSES.map((status) => (
            <Pressable
              key={status}
              onPress={() => setForm({ ...form, status })}
              style={[
                screenStyles.chip,
                form.status === status ? screenStyles.chipActive : null,
              ]}
            >
              <Text style={screenStyles.buttonLabel}>{status}</Text>
            </Pressable>
          ))}
        </View>
        {formError ? <Text style={screenStyles.error}>{formError}</Text> : null}
        <Pressable
          disabled={save.isPending}
          onPress={() => void save.mutate()}
          style={screenStyles.button}
        >
          <Text style={screenStyles.buttonLabel}>
            {save.isPending ? "Se salvează…" : "Salvează"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setForm(null);
            setEditingId(null);
            setFormError(null);
          }}
          style={screenStyles.buttonSecondary}
        >
          <Text style={screenStyles.buttonLabel}>Anulează</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={screenStyles.root}>
      <Pressable
        onPress={() => {
          setEditingId(null);
          setFormError(null);
          setForm(emptyDraft);
        }}
        style={screenStyles.button}
      >
        <Text style={screenStyles.buttonLabel}>Adaugă ofertă</Text>
      </Pressable>
      {toggle.isError ? (
        <Text style={screenStyles.error}>
          {toggle.error instanceof Error
            ? toggle.error.message
            : "Could not update offer"}
        </Text>
      ) : null}
      <FlatList
        data={offers.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={screenStyles.muted}>Nicio ofertă pe acest stand</Text>
        }
        renderItem={({ item }) => (
          <View style={screenStyles.card}>
            <Text style={screenStyles.body}>{item.product_name}</Text>
            <Text style={screenStyles.muted}>
              {item.discount_percent != null ? `${item.discount_percent}%` : "Fără discount"}
              {" · "}
              {item.status}
            </Text>
            <View style={screenStyles.row}>
              <Pressable
                onPress={() => {
                  setEditingId(item.id);
                  setFormError(null);
                  setForm(draftFromOffer(item));
                }}
                style={[screenStyles.chip, { flex: 1 }]}
              >
                <Text style={screenStyles.buttonLabel}>Editează</Text>
              </Pressable>
              <Pressable
                disabled={toggle.isPending}
                onPress={() => void toggle.mutate(item)}
                style={[screenStyles.chip, { flex: 1 }]}
              >
                <Text style={screenStyles.buttonLabel}>
                  {item.status === "active" ? "Pauzează" : "Activează"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}
