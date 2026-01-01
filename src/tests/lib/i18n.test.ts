import { describe, expect, it, vi, beforeEach } from "vitest"

// Mock the storage module
vi.mock("../../lib/storage", () => ({
    storage: {
        get: vi.fn().mockResolvedValue(undefined),
        set: vi.fn().mockResolvedValue(undefined)
    }
}))

// Mock navigator.language
const mockNavigatorLanguage = (lang: string) => {
    Object.defineProperty(navigator, 'language', {
        value: lang,
        writable: true,
        configurable: true
    })
}

describe("i18n", () => {
    describe("Language Resolution", () => {
        // Test the resolveLanguage logic
        function resolveLanguage(lang: string, browserLang: string): string {
            if (lang === "auto") {
                if (browserLang.startsWith("zh")) {
                    if (browserLang === "zh-TW" || browserLang === "zh-HK" || browserLang === "zh-Hant") {
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

        it("should return English for en-US browser", () => {
            expect(resolveLanguage("auto", "en-US")).toBe("en")
        })

        it("should return English for en-GB browser", () => {
            expect(resolveLanguage("auto", "en-GB")).toBe("en")
        })

        it("should return Simplified Chinese for zh-CN", () => {
            expect(resolveLanguage("auto", "zh-CN")).toBe("zh-Hans")
        })

        it("should return Traditional Chinese for zh-TW", () => {
            expect(resolveLanguage("auto", "zh-TW")).toBe("zh-Hant")
        })

        it("should return Traditional Chinese for zh-HK", () => {
            expect(resolveLanguage("auto", "zh-HK")).toBe("zh-Hant")
        })

        it("should return French for fr-FR", () => {
            expect(resolveLanguage("auto", "fr-FR")).toBe("fr")
        })

        it("should return Russian for ru-RU", () => {
            expect(resolveLanguage("auto", "ru-RU")).toBe("ru")
        })

        it("should return Japanese for ja-JP", () => {
            expect(resolveLanguage("auto", "ja-JP")).toBe("ja")
        })

        it("should return Korean for ko-KR", () => {
            expect(resolveLanguage("auto", "ko-KR")).toBe("ko")
        })

        it("should return the explicit language when not auto", () => {
            expect(resolveLanguage("fr", "en-US")).toBe("fr")
            expect(resolveLanguage("zh-Hans", "en-US")).toBe("zh-Hans")
        })

        it("should default to English for unknown languages", () => {
            expect(resolveLanguage("auto", "de-DE")).toBe("en")
            expect(resolveLanguage("auto", "es-ES")).toBe("en")
        })
    })

    describe("Translation Parameter Replacement", () => {
        function replaceParams(text: string, params?: Record<string, string | number>): string {
            if (!params) return text
            let result = text
            Object.entries(params).forEach(([k, v]) => {
                result = result.replace(`{${k}}`, String(v))
            })
            return result
        }

        it("should replace single parameter", () => {
            expect(replaceParams("Hello {name}", { name: "World" })).toBe("Hello World")
        })

        it("should replace multiple parameters", () => {
            expect(replaceParams("{count} items in {place}", { count: 5, place: "cart" }))
                .toBe("5 items in cart")
        })

        it("should handle numeric parameters", () => {
            expect(replaceParams("{count} days ago", { count: 3 })).toBe("3 days ago")
        })

        it("should return original text when no params", () => {
            expect(replaceParams("Hello World")).toBe("Hello World")
        })

        it("should handle empty params object", () => {
            expect(replaceParams("Hello World", {})).toBe("Hello World")
        })

        it("should leave unmatched placeholders", () => {
            expect(replaceParams("Hello {name}", { other: "value" })).toBe("Hello {name}")
        })
    })

    describe("Language Metadata", () => {
        const LANGUAGE_META = {
            auto: { native: "Auto-detect", english: "Auto-detect" },
            en: { native: "English", english: "English" },
            "zh-Hans": { native: "简体中文", english: "Simplified Chinese" },
            "zh-Hant": { native: "繁體中文", english: "Traditional Chinese" },
            fr: { native: "Français", english: "French" },
            ru: { native: "Русский", english: "Russian" },
            ja: { native: "日本語", english: "Japanese" },
            ko: { native: "한국어", english: "Korean" }
        }

        it("should have all required languages", () => {
            expect(Object.keys(LANGUAGE_META)).toHaveLength(8)
        })

        it("should have native and english names for each", () => {
            Object.values(LANGUAGE_META).forEach(meta => {
                expect(meta).toHaveProperty("native")
                expect(meta).toHaveProperty("english")
                expect(meta.native.length).toBeGreaterThan(0)
                expect(meta.english.length).toBeGreaterThan(0)
            })
        })
    })
})
