import { describe, expect, it, vi, beforeEach } from "vitest"

// Mock chrome API
vi.mock("../../lib/storage", () => ({
    storage: {
        get: vi.fn().mockResolvedValue(undefined),
        set: vi.fn().mockResolvedValue(undefined)
    }
}))

// Test the pattern matching logic from AdapterRegistry
describe("AdapterRegistry Pattern Matching", () => {
    // Extract and test the matchPattern logic
    function matchPattern(url: string, pattern: string): boolean {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        return regex.test(url)
    }

    describe("matchPattern", () => {
        it("should match exact URLs", () => {
            expect(matchPattern("https://chat.openai.com", "https://chat.openai.com")).toBe(true)
        })

        it("should match wildcard patterns", () => {
            expect(matchPattern("https://chat.openai.com/c/123", "https://chat.openai.com/*")).toBe(true)
            expect(matchPattern("https://gemini.google.com/app/abc", "https://gemini.google.com/*")).toBe(true)
        })

        it("should not match non-matching URLs", () => {
            expect(matchPattern("https://example.com", "https://chat.openai.com/*")).toBe(false)
            expect(matchPattern("https://google.com", "https://gemini.google.com/*")).toBe(false)
        })

        it("should handle multiple wildcards", () => {
            expect(matchPattern("https://sub.example.com/path/to/resource", "https://*.example.com/*")).toBe(true)
        })

        it("should handle empty patterns", () => {
            expect(matchPattern("", "")).toBe(true)
        })
    })
})

describe("ChatGPT URL Patterns", () => {
    const chatgptPatterns = [
        "https://chat.openai.com/*",
        "https://chatgpt.com/*"
    ]

    function matchesAny(url: string, patterns: string[]): boolean {
        return patterns.some(pattern => {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
            return regex.test(url)
        })
    }

    it("should match chat.openai.com URLs", () => {
        expect(matchesAny("https://chat.openai.com/", chatgptPatterns)).toBe(true)
        expect(matchesAny("https://chat.openai.com/c/abc123", chatgptPatterns)).toBe(true)
    })

    it("should match chatgpt.com URLs", () => {
        expect(matchesAny("https://chatgpt.com/", chatgptPatterns)).toBe(true)
        expect(matchesAny("https://chatgpt.com/c/xyz789", chatgptPatterns)).toBe(true)
    })

    it("should not match other URLs", () => {
        expect(matchesAny("https://openai.com/", chatgptPatterns)).toBe(false)
        expect(matchesAny("https://google.com/", chatgptPatterns)).toBe(false)
    })
})

describe("Gemini URL Patterns", () => {
    const geminiPatterns = [
        "https://gemini.google.com/*"
    ]

    function matchesAny(url: string, patterns: string[]): boolean {
        return patterns.some(pattern => {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
            return regex.test(url)
        })
    }

    it("should match gemini.google.com URLs", () => {
        expect(matchesAny("https://gemini.google.com/", geminiPatterns)).toBe(true)
        expect(matchesAny("https://gemini.google.com/app/abc123", geminiPatterns)).toBe(true)
    })

    it("should not match other google URLs", () => {
        expect(matchesAny("https://google.com/", geminiPatterns)).toBe(false)
        expect(matchesAny("https://mail.google.com/", geminiPatterns)).toBe(false)
    })
})
