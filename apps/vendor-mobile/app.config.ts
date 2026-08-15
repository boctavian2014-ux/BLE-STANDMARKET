import { assertAppIdentity, VENDOR_IDENTITY } from "@standmarket/expo-config";

const identity = assertAppIdentity(VENDOR_IDENTITY);

/**
 * Production IDs only.
 * Reserved, not configured in this PR:
 *   com.standmarket.vendor.dev
 *   com.standmarket.vendor.preview
 */
export default {
  expo: {
    name: "StandMarket Vendor",
    slug: identity.slug,
    scheme: identity.scheme,
    version: "0.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#0B0F14",
    },
    ios: {
      bundleIdentifier: identity.iosBundleId,
      supportsTablet: false,
    },
    android: {
      package: identity.androidPackage,
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#0B0F14",
      },
    },
  },
};
