/** Placeholder until a categories table exists. Matches seed offer/stand values. */
export const INTEREST_CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home",
  "Food",
] as const;

export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];
