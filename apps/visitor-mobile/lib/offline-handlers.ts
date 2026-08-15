import {
  addInterest,
  redeemOffer,
  removeInterest,
  type OfferListItem,
} from "./queries";
import { queryClient } from "./query-client";

export const visitorOfflineHandlers: Record<
  string,
  (payload: unknown) => Promise<void>
> = {
  async redeem(payload) {
    const item = payload as { userId: string; offer: OfferListItem };
    await redeemOffer(item.userId, item.offer);
    await queryClient.invalidateQueries({ queryKey: ["offers"] });
  },
  async toggleInterest(payload) {
    const item = payload as {
      userId: string;
      expoId: string;
      category: string;
      action: "add" | "remove";
    };
    if (item.action === "remove") {
      await removeInterest(item.userId, item.expoId, item.category);
    } else {
      await addInterest(item.userId, item.expoId, item.category);
    }
    await queryClient.invalidateQueries({ queryKey: ["interests"] });
  },
};
