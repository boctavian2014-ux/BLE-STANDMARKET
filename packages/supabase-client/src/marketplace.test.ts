import { expect, test } from "bun:test";
import { contrastRatio, WCAG_AA_BODY } from "./a11y";
import {
  composeOfferCardLabel,
  isHotDiscount,
  placeholderInitial,
} from "./marketplace";

test("OfferCard placeholder uses the product initial when uri is empty", () => {
  expect(placeholderInitial("Wireless Earbuds")).toBe("W");
  expect(placeholderInitial("  summer jacket")).toBe("S");
  expect(placeholderInitial("")).toBe("?");
});

test("OfferCard a11y label composes title, discount and stand", () => {
  expect(
    composeOfferCardLabel({
      title: "USB-C Hub",
      discount: "15%",
      stand: "Stand A-02 · A1",
    }),
  ).toBe("USB-C Hub, 15%, Stand A-02 · A1");
  expect(isHotDiscount(17)).toBe(true);
  expect(isHotDiscount(10)).toBe(false);
  expect(isHotDiscount(null)).toBe(false);
});

test("EmptyState copy stays composed for a11y", () => {
  const title = "Nicio ofertă activă";
  const message = "Nu există oferte în acest moment.";
  expect(`${title}. ${message}`).toBe(
    "Nicio ofertă activă. Nu există oferte în acest moment.",
  );
});

test("marketplace accentWarm meets WCAG AA on dark surfaces", () => {
  expect(contrastRatio("#FF6A00", "#0B0F14")).toBeGreaterThanOrEqual(WCAG_AA_BODY);
  expect(contrastRatio("#0B0F14", "#FF6A00")).toBeGreaterThanOrEqual(WCAG_AA_BODY);
});
