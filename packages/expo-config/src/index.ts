export type AppIdentity = {
  slug: string;
  scheme: string;
  iosBundleId: string;
  androidPackage: string;
};

/** Production identity. `.dev` / `.preview` suffixes are reserved, not active. */
export const VISITOR_IDENTITY: AppIdentity = {
  slug: "standmarket-visitor",
  scheme: "standmarket",
  iosBundleId: "com.standmarket.visitor",
  androidPackage: "com.standmarket.visitor",
};

/** Production identity. `.dev` / `.preview` suffixes are reserved, not active. */
export const VENDOR_IDENTITY: AppIdentity = {
  slug: "standmarket-vendor",
  scheme: "standmarket-vendor",
  iosBundleId: "com.standmarket.vendor",
  androidPackage: "com.standmarket.vendor",
};

const PRODUCTION_BUNDLE = /^com\.standmarket\.(visitor|vendor)$/;
const PRODUCTION_SLUG = /^standmarket-(visitor|vendor)$/;
const PRODUCTION_SCHEME = /^(standmarket|standmarket-vendor)$/;

export function assertAppIdentity(identity: AppIdentity): AppIdentity {
  if (!PRODUCTION_SLUG.test(identity.slug)) {
    throw new Error(`Invalid production slug: ${identity.slug}`);
  }
  if (!PRODUCTION_SCHEME.test(identity.scheme)) {
    throw new Error(`Invalid production scheme: ${identity.scheme}`);
  }
  if (!PRODUCTION_BUNDLE.test(identity.iosBundleId)) {
    throw new Error(`Invalid iOS bundle ID: ${identity.iosBundleId}`);
  }
  if (identity.androidPackage !== identity.iosBundleId) {
    throw new Error("Android package must match the iOS bundle ID");
  }
  if (
    identity.iosBundleId.endsWith(".dev") ||
    identity.iosBundleId.endsWith(".preview")
  ) {
    throw new Error("Internal .dev / .preview IDs must not be used in production config");
  }
  return identity;
}
