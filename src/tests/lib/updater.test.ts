import { describe, expect, it } from "vitest"

import { compareVersions } from "../../lib/updater"

describe("compareVersions", () => {
    describe("Basic Version Comparison", () => {
        it("should return 1 when first version is greater", () => {
            expect(compareVersions("1.0.0", "0.9.0")).toBe(1)
            expect(compareVersions("2.0.0", "1.0.0")).toBe(1)
            expect(compareVersions("1.1.0", "1.0.0")).toBe(1)
            expect(compareVersions("1.0.1", "1.0.0")).toBe(1)
        })

        it("should return -1 when first version is less", () => {
            expect(compareVersions("0.9.0", "1.0.0")).toBe(-1)
            expect(compareVersions("1.0.0", "2.0.0")).toBe(-1)
            expect(compareVersions("1.0.0", "1.1.0")).toBe(-1)
            expect(compareVersions("1.0.0", "1.0.1")).toBe(-1)
        })

        it("should return 0 when versions are equal", () => {
            expect(compareVersions("1.0.0", "1.0.0")).toBe(0)
            expect(compareVersions("0.1.0", "0.1.0")).toBe(0)
            expect(compareVersions("10.20.30", "10.20.30")).toBe(0)
        })

        it("should handle versions with v prefix", () => {
            expect(compareVersions("v1.0.0", "1.0.0")).toBe(0)
            expect(compareVersions("v2.0.0", "v1.0.0")).toBe(1)
            expect(compareVersions("1.0.0", "v1.0.1")).toBe(-1)
        })
    })

    describe("Pre-release Version Comparison", () => {
        it("should treat stable version as greater than pre-release", () => {
            expect(compareVersions("1.0.0", "1.0.0-alpha")).toBe(1)
            expect(compareVersions("1.0.0", "1.0.0-beta")).toBe(1)
            expect(compareVersions("1.0.0", "1.0.0-rc")).toBe(1)
            expect(compareVersions("1.0.0", "1.0.0-rc.1")).toBe(1)
        })

        it("should treat pre-release as less than stable", () => {
            expect(compareVersions("1.0.0-alpha", "1.0.0")).toBe(-1)
            expect(compareVersions("1.0.0-beta", "1.0.0")).toBe(-1)
            expect(compareVersions("1.0.0-rc", "1.0.0")).toBe(-1)
        })

        it("should compare pre-release identifiers alphabetically", () => {
            // alpha < beta < rc (alphabetical order)
            expect(compareVersions("1.0.0-alpha", "1.0.0-beta")).toBe(-1)
            expect(compareVersions("1.0.0-beta", "1.0.0-alpha")).toBe(1)
            expect(compareVersions("1.0.0-beta", "1.0.0-rc")).toBe(-1)
        })

        it("should compare numeric pre-release identifiers", () => {
            expect(compareVersions("1.0.0-1", "1.0.0-2")).toBe(-1)
            expect(compareVersions("1.0.0-2", "1.0.0-1")).toBe(1)
            expect(compareVersions("1.0.0-10", "1.0.0-2")).toBe(1)
        })

        it("should prefer numeric over alphanumeric (SemVer spec)", () => {
            // Numeric identifiers have lower precedence
            expect(compareVersions("1.0.0-1", "1.0.0-alpha")).toBe(-1)
            expect(compareVersions("1.0.0-alpha", "1.0.0-1")).toBe(1)
        })

        it("should handle equal pre-releases", () => {
            expect(compareVersions("1.0.0-beta", "1.0.0-beta")).toBe(0)
            expect(compareVersions("v1.0.0-alpha", "1.0.0-alpha")).toBe(0)
        })

        it("should handle complex pre-release identifiers", () => {
            expect(compareVersions("1.0.0-alpha.1", "1.0.0-alpha.2")).toBe(-1)
            expect(compareVersions("1.0.0-alpha.2", "1.0.0-alpha.10")).toBe(-1)
            expect(compareVersions("1.0.0-alpha", "1.0.0-alpha.1")).toBe(-1)
        })
    })

    describe("Real-world Scenarios", () => {
        it("should correctly compare SideScribe version progression", () => {
            // Expected progression: 0.1.0 < 0.1.1-beta < 0.1.1 < 0.1.2-alpha < 0.1.2-beta < 0.1.2
            expect(compareVersions("0.1.0", "0.1.1-beta")).toBe(-1)
            expect(compareVersions("0.1.1-beta", "0.1.1")).toBe(-1)
            expect(compareVersions("0.1.1", "0.1.2-alpha")).toBe(-1)
            expect(compareVersions("0.1.2-alpha", "0.1.2-beta")).toBe(-1)
            expect(compareVersions("0.1.2-beta", "0.1.2")).toBe(-1)
        })

        it("should handle version with v prefix in tag format", () => {
            expect(compareVersions("v0.1.1-beta", "v0.1.2-beta")).toBe(-1)
            expect(compareVersions("v0.1.2-beta", "v0.1.1-beta")).toBe(1)
        })
    })

    describe("Edge Cases", () => {
        it("should handle missing patch version", () => {
            expect(compareVersions("1.0", "1.0.0")).toBe(0)
            expect(compareVersions("1", "1.0.0")).toBe(0)
        })

        it("should handle versions with different segment lengths", () => {
            expect(compareVersions("1.0.0", "1.0")).toBe(0)
            expect(compareVersions("1.1", "1.0.5")).toBe(1)
        })
    })
})
