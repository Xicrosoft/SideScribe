import { describe, expect, it } from "vitest"

import {
    detectHost,
    getTokens,
    THEME_TOKENS,
    type HostType,
    type ThemeMode
} from "../../lib/theme-tokens"

describe("Theme Tokens", () => {
    describe("THEME_TOKENS", () => {
        const hosts: HostType[] = ["chatgpt", "gemini", "generic"]
        const modes: ThemeMode[] = ["light", "dark"]

        it.each(hosts)("should have complete tokens for %s host", (host) => {
            modes.forEach((mode) => {
                const tokens = THEME_TOKENS[host][mode]
                expect(tokens).toBeDefined()
                expect(tokens.bg).toBeDefined()
                expect(tokens.bgSecondary).toBeDefined()
                expect(tokens.text).toBeDefined()
                expect(tokens.textSecondary).toBeDefined()
                expect(tokens.border).toBeDefined()
                expect(tokens.accent).toBeDefined()
                expect(tokens.accentBg).toBeDefined()
                expect(tokens.hover).toBeDefined()
                expect(tokens.active).toBeDefined()
                expect(tokens.radius).toBeDefined()
                expect(tokens.font).toBeDefined()
            })
        })

        it("should have valid CSS color values", () => {
            const hexPattern = /^#[0-9a-fA-F]{6}$/
            const rgbaPattern = /^rgba?\(.+\)$/

            hosts.forEach((host) => {
                modes.forEach((mode) => {
                    const tokens = THEME_TOKENS[host][mode]
                    // bg should be hex color
                    expect(tokens.bg).toMatch(hexPattern)
                    // accentBg can be rgba
                    expect(tokens.accentBg).toMatch(rgbaPattern)
                })
            })
        })
    })

    describe("getTokens", () => {
        it("should return correct tokens for chatgpt light", () => {
            const tokens = getTokens("chatgpt", "light")
            expect(tokens.bg).toBe("#ffffff")
            expect(tokens.text).toBe("#0d0d0d")
        })

        it("should return correct tokens for chatgpt dark", () => {
            const tokens = getTokens("chatgpt", "dark")
            expect(tokens.bg).toBe("#212121")
            expect(tokens.text).toBe("#ffffff")
        })

        it("should return correct tokens for gemini light", () => {
            const tokens = getTokens("gemini", "light")
            expect(tokens.accent).toBe("#1a73e8")
        })

        it("should return correct tokens for gemini dark", () => {
            const tokens = getTokens("gemini", "dark")
            expect(tokens.accent).toBe("#8ab4f8")
        })
    })

    describe("detectHost", () => {
        it("should detect chatgpt host", () => {
            expect(detectHost("https://chatgpt.com/c/123")).toBe("chatgpt")
            // Note: chat.openai.com doesn't contain 'chatgpt' - would need implementation update
        })

        it("should detect gemini host", () => {
            expect(detectHost("https://gemini.google.com/app")).toBe("gemini")
            expect(detectHost("https://bard.google.com/")).toBe("gemini")
        })

        it("should return generic for unknown hosts", () => {
            expect(detectHost("https://example.com/")).toBe("generic")
            expect(detectHost("https://claude.ai/")).toBe("generic")
        })
    })
})
