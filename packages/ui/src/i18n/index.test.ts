import { expect, test } from "bun:test";
import { en } from "./en";
import { fr } from "./fr";
import { it } from "./it";
import { ro } from "./ro";
import { zhCN } from "./zh-CN";
import {
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  createMemoryLanguageStore,
  interpolate,
  lookup,
  persistLanguage,
  readStoredLanguage,
} from "./index";

function dictionaryKeys(dictionary: object): string[] {
  return Object.keys(dictionary).sort();
}

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
  expect(lookup("fr", "test.roOnly")).toBe("doar română");
  expect(lookup("it", "test.roOnly")).toBe("doar română");
  expect(lookup("zh-CN", "test.roOnly")).toBe("doar română");
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

test("translated dictionaries match ro minus test.roOnly", () => {
  const expected = dictionaryKeys(ro).filter((key) => key !== "test.roOnly");
  expect(dictionaryKeys(en)).toEqual(expected);
  expect(dictionaryKeys(fr)).toEqual(expected);
  expect(dictionaryKeys(it)).toEqual(expected);
  expect(dictionaryKeys(zhCN)).toEqual(expected);
});

test("t() works in every supported language", () => {
  expect(lookup("ro", "auth.signIn")).toBe("Autentificare");
  expect(lookup("en", "auth.signIn")).toBe("Sign in");
  expect(lookup("fr", "auth.signIn")).toBe("Connexion");
  expect(lookup("it", "auth.signIn")).toBe("Accedi");
  expect(lookup("zh-CN", "auth.signIn")).toBe("登录");
  expect(LANGUAGES.map((item) => item.code)).toEqual([
    "ro",
    "en",
    "fr",
    "it",
    "zh-CN",
  ]);
});

test("zh-CN interpolation keeps named placeholders", () => {
  expect(lookup("zh-CN", "scan.zone", { hall: "A", zone: "1" })).toBe(
    "区域 A 1",
  );
  expect(lookup("zh-CN", "home.discount", { n: 20 })).toBe("20%");
  expect(lookup("zh-CN", "home.image", { name: "PR11" })).toBe("PR11的图片");
});

test("persists zh-CN in the language store", async () => {
  const store = createMemoryLanguageStore();
  await persistLanguage(store, "zh-CN");
  expect(await store.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh-CN");
  expect(await readStoredLanguage(store)).toBe("zh-CN");
});
