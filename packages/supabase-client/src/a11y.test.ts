import { expect, test } from "bun:test";
import { WCAG_AA_BODY, contrastRatio } from "./a11y";

test("app color pairs meet WCAG AA 4.5:1", () => {
  expect(contrastRatio("#F4F6F8", "#0B0F14")).toBeGreaterThanOrEqual(WCAG_AA_BODY);
  expect(contrastRatio("#C5CDD6", "#0B0F14")).toBeGreaterThanOrEqual(WCAG_AA_BODY);
  expect(contrastRatio("#F97066", "#0B0F14")).toBeGreaterThanOrEqual(WCAG_AA_BODY);
  expect(contrastRatio("#F4F6F8", "#151B23")).toBeGreaterThanOrEqual(WCAG_AA_BODY);
  expect(contrastRatio("#0B0F14", "#3D8BFF")).toBeGreaterThanOrEqual(WCAG_AA_BODY);
});
