import { describe, expect, it, beforeEach } from "vitest"

import { TOCParser } from "../../lib/toc-parser"

describe("TOCParser", () => {
    let container: HTMLElement

    beforeEach(() => {
        container = document.createElement("div")
    })

    describe("parseTurn - Strategy 1: Explicit Headings", () => {
        it("should parse h1-h6 headings", () => {
            container.innerHTML = `
        <h1>Introduction</h1>
        <p>Some content</p>
        <h2>Getting Started</h2>
        <p>More content</p>
        <h3>Prerequisites</h3>
      `

            const result = TOCParser.parseTurn(container, 0)

            expect(result).toHaveLength(1) // Root node (h1)
            expect(result[0].text).toBe("Introduction")
            expect(result[0].level).toBe(1)
            expect(result[0].children).toHaveLength(1) // h2
            expect(result[0].children![0].text).toBe("Getting Started")
            expect(result[0].children![0].children).toHaveLength(1) // h3
        })

        it("should generate correct IDs based on turn index", () => {
            container.innerHTML = `<h2>Test Heading</h2>`

            const result = TOCParser.parseTurn(container, 5)

            expect(result[0].id).toBe("ext-turn-5-heading-0")
        })

        it("should truncate long heading text", () => {
            const longText = "A".repeat(100)
            container.innerHTML = `<h2>${longText}</h2>`

            const result = TOCParser.parseTurn(container, 0)

            expect(result[0].text.length).toBeLessThanOrEqual(60)
        })

        it("should handle empty headings", () => {
            container.innerHTML = `<h2></h2>`

            const result = TOCParser.parseTurn(container, 0)

            expect(result[0].text).toBe("Untitled Section")
        })
    })

    describe("parseTurn - Strategy 2: Bold Text Heuristic", () => {
        it("should use bold text as headings when no explicit headings exist", () => {
            container.innerHTML = `
        <p><strong>Step 1: Setup</strong></p>
        <p>Install the dependencies</p>
        <p><strong>Step 2: Configure</strong></p>
        <p>Edit the config file</p>
      `

            const result = TOCParser.parseTurn(container, 0)

            expect(result.length).toBeGreaterThanOrEqual(2)
            expect(result[0].type).toBe("heading")
            expect(result[0].level).toBe(6)
        })

        it("should filter out insignificant bold text", () => {
            container.innerHTML = `
        <p><strong>OK</strong></p>
        <p><strong>This is a very long bold text that exceeds the maximum length limit for a heading</strong></p>
        <p><strong>Valid Heading:</strong></p>
      `

            const result = TOCParser.parseTurn(container, 0)

            // Only "Valid Heading:" should be picked (ends with :)
            expect(result.length).toBe(1)
            expect(result[0].text).toContain("Valid Heading")
        })
    })

    describe("parseTurn - Strategy 3: Long Text Fallback", () => {
        it("should split long content into paragraph nodes", () => {
            // Create content longer than 500 characters
            const longParagraph = "A".repeat(100)
            container.innerHTML = `
        <p>${longParagraph}</p>
        <p>${longParagraph}</p>
        <p>${longParagraph}</p>
        <p>${longParagraph}</p>
        <p>${longParagraph}</p>
        <p>${longParagraph}</p>
      `

            const result = TOCParser.parseTurn(container, 0)

            expect(result.length).toBeGreaterThanOrEqual(1)
            result.forEach((node) => {
                expect(node.type).toBe("paragraph")
                expect(node.level).toBe(7)
            })
        })
    })

    describe("parseTurn - Default Case", () => {
        it("should return empty array for short content without structure", () => {
            container.innerHTML = `<p>Short text</p>`

            const result = TOCParser.parseTurn(container, 0)

            expect(result).toHaveLength(0)
        })
    })

    describe("buildHierarchy", () => {
        it("should build nested hierarchy from flat nodes", () => {
            container.innerHTML = `
        <h1>Level 1</h1>
        <h2>Level 2</h2>
        <h3>Level 3</h3>
        <h2>Another Level 2</h2>
      `

            const result = TOCParser.parseTurn(container, 0)

            expect(result).toHaveLength(1) // One root
            expect(result[0].level).toBe(1)
            expect(result[0].children).toHaveLength(2) // Two h2
            expect(result[0].children![0].children).toHaveLength(1) // One h3
        })

        it("should handle non-sequential heading levels", () => {
            container.innerHTML = `
        <h1>Root</h1>
        <h3>Skipped h2</h3>
        <h4>Even deeper</h4>
      `

            const result = TOCParser.parseTurn(container, 0)

            expect(result).toHaveLength(1)
            expect(result[0].children).toHaveLength(1)
            expect(result[0].children![0].level).toBe(3)
        })

        it("should handle sibling headings at same level", () => {
            container.innerHTML = `
        <h2>First</h2>
        <h2>Second</h2>
        <h2>Third</h2>
      `

            const result = TOCParser.parseTurn(container, 0)

            expect(result).toHaveLength(3)
            result.forEach((node) => {
                expect(node.level).toBe(2)
                expect(node.children).toHaveLength(0)
            })
        })
    })
})
