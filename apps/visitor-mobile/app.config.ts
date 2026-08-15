import { assertAppIdentity, VISITOR_IDENTITY } from "@standmarket/expo-config";

const identity = assertAppIdentity(VISITOR_IDENTITY);

/**
 * Production IDs only.
 * Reserved, not configured in this PR:
 *   com.standmarket.visitor.dev
 *   com.standmarket.visitor.preview
 */
export default {
  expo: {
    name: "StandMarket",
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
      permissions: [
        "android.permission.CAMERA",
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.NFC",
      ],
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: "Allow StandMarket to scan offer QR codes.",
        },
      ],
    ],
  },
};
