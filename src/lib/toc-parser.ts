import type { TOCNode } from "./types"

export class TOCParser {
    /**
     * Parses a single turn element to extract TOC nodes.
     * @param turnElement The DOM element representing a single chat turn/response.
     * @param turnIndex The index of this turn in the conversation (0-based) for stable IDs.
     * @returns A list of TOCNodes found in this turn.
     */
    static parseTurn(turnElement: HTMLElement, turnIndex: number): TOCNode[] {
        const nodes: TOCNode[] = []

        // Strategy 1: Explicit Headings (h1-h6)
        const headings = Array.from(turnElement.querySelectorAll('h1, h2, h3, h4, h5, h6'))

        if (headings.length > 0) {
            headings.forEach((heading, hIndex) => {
                const text = heading.textContent?.trim() || "Untitled Section"
                const level = parseInt(heading.tagName.substring(1))

                nodes.push({
                    id: `ext-turn-${turnIndex}-heading-${hIndex}`,
                    text: text.substring(0, 60),
                    level: level,
                    type: 'heading',
                    children: []
                })
            })
            return TOCParser.buildHierarchy(nodes)
        }

        // Strategy 2: Heuristic Fallback (Bold text as headers)
        const bolds = Array.from(turnElement.querySelectorAll('strong, b'))
        const significantBolds = bolds.filter(b => {
            const text = b.textContent?.trim() || ""
            // Check if bold text is a standalone line or significant enough
            const parentBlock = b.parentElement
            const isStandalone = parentBlock && parentBlock.textContent?.trim() === text
            return text.length > 3 && text.length < 50 && (isStandalone || text.endsWith(':'))
        })

        if (significantBolds.length > 0) {
            significantBolds.forEach((bold, bIndex) => {
                nodes.push({
                    id: `ext-turn-${turnIndex}-bold-${bIndex}`,
                    text: (bold.textContent?.trim() || "").substring(0, 50),
                    level: 6, // Treat as low-level heading
                    type: 'heading',
                    children: []
                })
            })
            return TOCParser.buildHierarchy(nodes)
        }

        // Strategy 3: Long Text Fallback (Paragraph splitting)
        // If text content is long, split by logical paragraphs
        const textContent = turnElement.textContent || ""
        if (textContent.length > 500) {
            const paragraphs = Array.from(turnElement.querySelectorAll('p'))
            if (paragraphs.length > 0) {
                paragraphs.forEach((p, pIndex) => {
                    const text = p.textContent?.trim() || ""
                    if (text.length > 20) {
                        nodes.push({
                            id: `ext-turn-${turnIndex}-para-${pIndex}`,
                            text: text.substring(0, 40) + "...",
                            level: 7,
                            type: 'paragraph',
                            children: []
                        })
                    }
                })
                return nodes // Flat structure for paragraphs
            }
        }

        // Default: No detailed structure
        return []
    }

    /**
     * Converts a flat list of nodes with levels into a nested hierarchy.
     */
    private static buildHierarchy(flatNodes: TOCNode[]): TOCNode[] {
        const rootNodes: TOCNode[] = []
        const stack: TOCNode[] = []

        flatNodes.forEach(node => {
            // Initialize children array
            node.children = []

            // Find the correct parent in the stack
            // We look for a node in the stack with level < node.level
            while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
                stack.pop()
            }

            if (stack.length === 0) {
                rootNodes.push(node)
            } else {
                const parent = stack[stack.length - 1]
                // Explicit check to satisfy TypeScript
                if (!parent.children) parent.children = []
                parent.children.push(node)
                node.parentId = parent.id
            }

            stack.push(node)
        })

        return rootNodes
    }
}
