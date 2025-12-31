import { describe, expect, it } from "vitest"

import { mergeTOC } from "../../lib/storage"
import type { TOCNode } from "../../lib/types"

// Helper to create a simple TOCNode
function createNode(id: string, text: string): TOCNode {
    return {
        id,
        text,
        level: 1,
        type: "turn",
        children: []
    }
}

describe("mergeTOC", () => {
    describe("Basic Merge Operations", () => {
        it("should return fresh when cached is empty", () => {
            const cached: TOCNode[] = []
            const fresh: TOCNode[] = [createNode("turn-0", "First"), createNode("turn-1", "Second")]

            const result = mergeTOC(cached, fresh)

            expect(result).toHaveLength(2)
            expect(result[0].id).toBe("turn-0")
            expect(result[1].id).toBe("turn-1")
        })

        it("should return cached when fresh is empty", () => {
            const cached: TOCNode[] = [createNode("turn-0", "First"), createNode("turn-1", "Second")]
            const fresh: TOCNode[] = []

            const result = mergeTOC(cached, fresh)

            expect(result).toHaveLength(2)
        })

        it("should handle both empty arrays", () => {
            const result = mergeTOC([], [])

            expect(result).toHaveLength(0)
        })
    })

    describe("Contiguous Range Merge", () => {
        it("should preserve cached turns before visible range", () => {
            const cached: TOCNode[] = [
                createNode("turn-0", "Cached First"),
                createNode("turn-1", "Cached Second"),
                createNode("turn-2", "Cached Third")
            ]
            const fresh: TOCNode[] = [
                createNode("turn-2", "Fresh Third"),
                createNode("turn-3", "Fresh Fourth")
            ]

            const result = mergeTOC(cached, fresh)

            expect(result).toHaveLength(4)
            expect(result[0].text).toBe("Cached First")
            expect(result[1].text).toBe("Cached Second")
            expect(result[2].text).toBe("Fresh Third") // Updated from fresh
            expect(result[3].text).toBe("Fresh Fourth")
        })

        it("should preserve cached turns after visible range", () => {
            const cached: TOCNode[] = [
                createNode("turn-5", "Cached Fifth"),
                createNode("turn-6", "Cached Sixth")
            ]
            const fresh: TOCNode[] = [createNode("turn-0", "Fresh First"), createNode("turn-1", "Fresh Second")]

            const result = mergeTOC(cached, fresh)

            expect(result).toHaveLength(4)
            expect(result[0].text).toBe("Fresh First")
            expect(result[1].text).toBe("Fresh Second")
            expect(result[2].text).toBe("Cached Fifth")
            expect(result[3].text).toBe("Cached Sixth")
        })
    })

    describe("Edit Detection", () => {
        it("should use fresh content when same ID has different content", () => {
            const cached: TOCNode[] = [createNode("turn-0", "Original Content")]
            const fresh: TOCNode[] = [createNode("turn-0", "Edited Content")]

            const result = mergeTOC(cached, fresh)

            expect(result).toHaveLength(1)
            expect(result[0].text).toBe("Edited Content")
        })
    })

    describe("Delete Detection", () => {
        it("should remove cached turns that are in visible range but not in fresh", () => {
            const cached: TOCNode[] = [
                createNode("turn-0", "First"),
                createNode("turn-1", "Second (will be deleted)"),
                createNode("turn-2", "Third")
            ]
            const fresh: TOCNode[] = [
                createNode("turn-0", "First"),
                createNode("turn-2", "Third") // turn-1 is missing
            ]

            const result = mergeTOC(cached, fresh)

            expect(result).toHaveLength(2)
            expect(result.find((n) => n.id === "turn-1")).toBeUndefined()
        })
    })

    describe("Sort Order", () => {
        it("should sort merged results by turn index", () => {
            const cached: TOCNode[] = [createNode("turn-5", "Fifth")]
            const fresh: TOCNode[] = [
                createNode("turn-3", "Third"),
                createNode("turn-1", "First"),
                createNode("turn-4", "Fourth")
            ]

            const result = mergeTOC(cached, fresh)

            expect(result[0].id).toBe("turn-1")
            expect(result[1].id).toBe("turn-3")
            expect(result[2].id).toBe("turn-4")
            expect(result[3].id).toBe("turn-5")
        })
    })

    describe("Edge Cases", () => {
        it("should handle non-turn nodes gracefully", () => {
            const cached: TOCNode[] = [createNode("custom-node", "Custom")]
            const fresh: TOCNode[] = [createNode("turn-0", "Turn")]

            const result = mergeTOC(cached, fresh)

            expect(result).toHaveLength(2)
        })

        it("should handle single node arrays", () => {
            const cached: TOCNode[] = [createNode("turn-0", "Only Cached")]
            const fresh: TOCNode[] = [createNode("turn-1", "Only Fresh")]

            const result = mergeTOC(cached, fresh)

            expect(result).toHaveLength(2)
        })
    })
})
