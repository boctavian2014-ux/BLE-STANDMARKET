import { expect, test } from "bun:test";
import {
  MAX_OFFER_IMAGE_BYTES,
  OFFER_IMAGE_TOO_LARGE,
  assertOfferImageSize,
  getOfferImageUrl,
  offerImagePath,
} from "./offer-images";

test("offer image path is expo/stand/offer.jpg", () => {
  expect(
    offerImagePath(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "10000000-0000-0000-0000-000000000020",
      "eeeeeeee-1111-0000-0000-000000000001",
    ),
  ).toBe(
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/10000000-0000-0000-0000-000000000020/eeeeeeee-1111-0000-0000-000000000001.jpg",
  );
});

test("offer image size accepts files under 2MB", () => {
  expect(() => assertOfferImageSize(1)).not.toThrow();
  expect(() => assertOfferImageSize(MAX_OFFER_IMAGE_BYTES)).not.toThrow();
});

test("offer image size rejects files over 2MB", () => {
  expect(() => assertOfferImageSize(MAX_OFFER_IMAGE_BYTES + 1)).toThrow(
    OFFER_IMAGE_TOO_LARGE,
  );
});

test("public offer image URL uses the offer-images bucket", () => {
  const path =
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/10000000-0000-0000-0000-000000000020/eeeeeeee-1111-0000-0000-000000000001.jpg";
  expect(getOfferImageUrl(path, "http://127.0.0.1:54321")).toBe(
    `http://127.0.0.1:54321/storage/v1/object/public/offer-images/${path}`,
  );
});
