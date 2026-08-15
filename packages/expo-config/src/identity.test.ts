import { expect, test } from "bun:test";
import {
  VISITOR_IDENTITY,
  VENDOR_IDENTITY,
  assertAppIdentity,
} from "./index";

test("visitor production identity matches the ADR", () => {
  const identity = assertAppIdentity(VISITOR_IDENTITY);
  expect(identity.slug).toBe("standmarket-visitor");
  expect(identity.scheme).toBe("standmarket");
  expect(identity.iosBundleId).toBe("com.standmarket.visitor");
  expect(identity.androidPackage).toBe("com.standmarket.visitor");
});

test("vendor production identity matches the ADR", () => {
  const identity = assertAppIdentity(VENDOR_IDENTITY);
  expect(identity.slug).toBe("standmarket-vendor");
  expect(identity.scheme).toBe("standmarket-vendor");
  expect(identity.iosBundleId).toBe("com.standmarket.vendor");
  expect(identity.androidPackage).toBe("com.standmarket.vendor");
});

test("rejects reserved internal suffixes", () => {
  expect(() =>
    assertAppIdentity({
      slug: "standmarket-visitor",
      scheme: "standmarket",
      iosBundleId: "com.standmarket.visitor.dev",
      androidPackage: "com.standmarket.visitor.dev",
    }),
  ).toThrow();
});
