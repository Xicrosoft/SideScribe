import { derived, writable } from "svelte/store"

import { storage } from "../storage"

// Import locale files (using standard locale codes for Crowdin)
import enUS from "./locales/en-US.json"
import zhCN from "./locales/zh-CN.json"
import zhTW from "./locales/zh-TW.json"
import frFR from "./locales/fr-FR.json"
import ruRU from "./locales/ru-RU.json"
import jaJP from "./locales/ja-JP.json"
import koKR from "./locales/ko-KR.json"

// Supported Languages (shown in UI)
export type Language =
  | "auto"
  | "en"
  | "zh-Hans"
  | "zh-Hant"
  | "fr"
  | "ru"
  | "ja"
  | "ko"

// Language metadata for UI display
export const LANGUAGE_META: Record<
  Language,
  { native: string; english: string }
> = {
  auto: { native: "Auto-detect", english: "Auto-detect" },
  en: { native: "English", english: "English" },
  "zh-Hans": { native: "简体中文", english: "Simplified Chinese" },
  "zh-Hant": { native: "繁體中文", english: "Traditional Chinese" },
  fr: { native: "Français", english: "French" },
  ru: { native: "Русский", english: "Russian" },
  ja: { native: "日本語", english: "Japanese" },
  ko: { native: "한국어", english: "Korean" }
}

// Excluding 'auto' for dictionary lookup
type DictionaryLanguage = Exclude<Language, "auto">

// Map language codes to imported locale files
const dictionaries: Record<DictionaryLanguage, Record<string, string>> = {
  en: enUS,
  "zh-Hans": zhCN,
  "zh-Hant": zhTW,
  fr: frFR,
  ru: ruRU,
  ja: jaJP,
  ko: koKR
}

// Get effective language (resolve 'auto' to actual language)
function resolveLanguage(lang: Language): DictionaryLanguage {
  if (lang === "auto") {
    const browserLang = navigator.language
    if (browserLang.startsWith("zh")) {
      // Differentiate Traditional vs Simplified
      if (
        browserLang === "zh-TW" ||
        browserLang === "zh-HK" ||
        browserLang === "zh-Hant"
      ) {
        return "zh-Hant"
      }
      return "zh-Hans"
    }
    if (browserLang.startsWith("fr")) return "fr"
    if (browserLang.startsWith("ru")) return "ru"
    if (browserLang.startsWith("ja")) return "ja"
    if (browserLang.startsWith("ko")) return "ko"
    return "en"
  }
  return lang
}

// Persisted Language Store
function createLanguageStore() {
  const { subscribe, set, update } = writable<Language>("auto")

  // Load from storage
  storage.get("language").then((val) => {
    const validLangs = Object.keys(LANGUAGE_META)
    if (val && validLangs.includes(val as string)) {
      set(val as Language)
    }
  })

  return {
    subscribe,
    set: (lang: Language) => {
      set(lang)
      storage.set("language", lang)
    }
  }
}

export const languageStore = createLanguageStore()

// Derived store that resolves 'auto' to actual language
export const effectiveLanguage = derived(languageStore, ($lang) =>
  resolveLanguage($lang)
)

// Derived store for simple usage: $t('key')
export const t = derived(
  effectiveLanguage,
  ($lang) => (key: string, params?: Record<string, string | number>) => {
    let text = dictionaries[$lang][key] || dictionaries.en[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }
)
