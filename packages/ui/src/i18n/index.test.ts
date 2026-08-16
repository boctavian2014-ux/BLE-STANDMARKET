import { expect, test } from "bun:test";
import {
  LANGUAGE_STORAGE_KEY,
  createMemoryLanguageStore,
  interpolate,
  lookup,
  persistLanguage,
  readStoredLanguage,
} from "./index";

test("t() returns the translation for the active language", () => {
  expect(lookup("ro", "auth.signIn")).toBe("Autentificare");
  expect(lookup("en", "auth.signIn")).toBe("Sign in");
});

test("interpolation replaces named placeholders", () => {
  expect(interpolate("Zone {hall} {zone}", { hall: "A", zone: "1" })).toBe(
    "Zone A 1",
  );
  expect(lookup("ro", "scan.zone", { hall: "A", zone: "1" })).toBe("Zonă A 1");
});

test("missing key in the active language falls back to ro", () => {
  expect(lookup("en", "test.roOnly")).toBe("doar română");
  expect(lookup("en", "missing.only.in.neither")).toBe("missing.only.in.neither");
});

test("persists the selected language in AsyncStorage-compatible store", async () => {
  const store = createMemoryLanguageStore();
  await persistLanguage(store, "en");
  expect(await store.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
  expect(await readStoredLanguage(store)).toBe("en");
});

test("toggle changes the language used by t()", async () => {
  const store = createMemoryLanguageStore({ [LANGUAGE_STORAGE_KEY]: "ro" });
  let language = (await readStoredLanguage(store)) ?? "ro";
  expect(lookup(language, "home.empty")).toBe("Nicio ofertă activă");
  language = "en";
  await persistLanguage(store, language);
  expect(lookup(language, "home.empty")).toBe("No active offers");
  expect(await readStoredLanguage(store)).toBe("en");
});
