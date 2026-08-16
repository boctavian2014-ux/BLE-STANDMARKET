import {
  createVendorOffer,
  toggleVendorOfferStatus,
  updateVendorOffer,
  type OfferDraft,
  type OfferStatus,
} from "./queries";
import { queryClient } from "./query-client";

export const vendorOfflineHandlers: Record<
  string,
  (payload: unknown) => Promise<void>
> = {
  async createOffer(payload) {
    const item = payload as {
      standId: string;
      userId: string;
      draft: OfferDraft;
      category: string | null;
    };
    await createVendorOffer(item.standId, item.userId, item.draft, item.category);
    await queryClient.invalidateQueries({ queryKey: ["vendor-offers"] });
  },
  async updateOffer(payload) {
    const item = payload as { offerId: string; draft: OfferDraft };
    await updateVendorOffer(item.offerId, item.draft);
    await queryClient.invalidateQueries({ queryKey: ["vendor-offers"] });
  },
  async toggleOffer(payload) {
    const item = payload as { offerId: string; current: OfferStatus };
    await toggleVendorOfferStatus(item.offerId, item.current);
    await queryClient.invalidateQueries({ queryKey: ["vendor-offers"] });
    await queryClient.invalidateQueries({ queryKey: ["vendor-stand-stats"] });
  },
};
