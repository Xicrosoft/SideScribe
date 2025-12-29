import type { ISiteAdapter, AdapterMeta, ParseResult } from "./interface"
import type { TOCNode } from "../lib/types"
import { TOCParser } from "../lib/toc-parser"
import { ScrollSpy } from "../lib/scroll-spy"

export class ChatGPTAdapter implements ISiteAdapter {
    meta: AdapterMeta = {
        name: "ChatGPT",
        matches: ["https://chatgpt.com/*"],
        primaryColor: "#10a37f" // ChatGPT Green
    }

    private observer: MutationObserver | null = null
    private onUpdate: ((result: ParseResult) => void) | null = null
    private debounceTimer: number | null = null
    private scrollSpy: ScrollSpy | null = null

    // Store references to turn elements for scrolling
    private turnMap: Map<number, HTMLElement> = new Map()
    // Store references to specific intra-turn elements if needed (parser generates IDs)
    // For simplicity, we might just scroll to the turn or try to find the element by ID if we mark them.
    // Ideally, the Parser would physically mark the DOM elements with the ID, or we keep a map.
    // For Phase 1, let's map IDs to elements during parse time.
    private nodeElementMap: Map<string, HTMLElement> = new Map()
    // Track active highlight animations to prevent style conflicts on rapid clicks
    private activeHighlightCleanup: WeakMap<HTMLElement, { cleanup: () => void; timers: number[] }> = new WeakMap()

    init(onUpdate: (result: ParseResult) => void, onActive?: (id: string) => void): void {
        this.onUpdate = onUpdate
        if (onActive) {
            this.scrollSpy = new ScrollSpy(onActive)
        }

        this.initialLoop()

        const container = document.querySelector('body')
        if (container) {
            this.observer = new MutationObserver(() => this.parseWithDebounce())
            this.observer.observe(container, { childList: true, subtree: true, characterData: true })
        }
    }

    // ChatGPT loads dynamically. Sometimes we need to wait a bit or re-check.
    private initialLoop() {
        this.parseWithDebounce()
        setTimeout(() => this.parseWithDebounce(), 2000)
    }

    destroy(): void {
        this.observer?.disconnect()
        if (this.debounceTimer) clearTimeout(this.debounceTimer)
        this.nodeElementMap.clear()
        this.turnMap.clear()
    }

    parse(): ParseResult {
        const rootNodes: TOCNode[] = []
        this.nodeElementMap.clear()
        this.turnMap.clear()

        // Selector for ChatGPT turns (User and Assistant)
        const turns = Array.from(document.querySelectorAll('article'))

        let pendingUserPrompt: string | null = null

        turns.forEach((turn, index) => {
            const isUser = turn.querySelector('[data-message-author-role="user"]') !== null

            if (isUser) {
                // Store user prompt text to use as turn title
                // ChatGPT structure: the user message is in a div.whitespace-pre-wrap inside the article
                // The "You said" label is in a separate sibling element
                const userMessageDiv = turn.querySelector('.whitespace-pre-wrap')
                let text = ""

                if (userMessageDiv) {
                    text = userMessageDiv.textContent?.trim() || ""
                } else {
                    // Fallback: try to get text from the content area
                    const contentArea = turn.querySelector('[data-message-author-role="user"]')
                    if (contentArea) {
                        // Get only direct text content, skip child elements with UI labels
                        const walker = document.createTreeWalker(
                            contentArea,
                            NodeFilter.SHOW_TEXT,
                            null
                        )
                        const texts: string[] = []
                        let node: Text | null
                        while ((node = walker.nextNode() as Text | null)) {
                            const t = node.textContent?.trim()
                            // Skip "You said" and empty text
                            if (t && t !== "You said" && t !== "You") {
                                texts.push(t)
                            }
                        }
                        text = texts.join(" ").trim()
                    }
                }

                pendingUserPrompt = text.substring(0, 50) + (text.length > 50 ? "..." : "")
                // Store mapping for scroll
                this.turnMap.set(index, turn)
            } else {
                // AI Response - create the turn node
                const turnId = `ext-turn-${index}`
                this.turnMap.set(index, turn)

                // Use user prompt as turn text, fallback to "AI RESPONSE"
                const turnNode: TOCNode = {
                    id: turnId,
                    text: pendingUserPrompt || "AI RESPONSE",
                    level: 1,
                    type: 'turn',
                    speaker: 'ai',
                    children: []
                }

                // Store reference to user's turn element for click-to-scroll
                if (pendingUserPrompt) {
                    const userTurnElement = this.turnMap.get(index - 1)
                    if (userTurnElement) {
                        // Try to find the specific user bubble element for precise highlighting
                        const userBubble = userTurnElement.querySelector('.user-message-bubble-color') as HTMLElement
                        // Map the turn node to the bubble (or fallback to turn element)
                        this.nodeElementMap.set(turnId, userBubble || userTurnElement)
                    }
                    pendingUserPrompt = null
                }

                // Parse AI response content
                const contentDiv = turn.querySelector('.markdown') as HTMLElement
                if (contentDiv) {
                    const children = TOCParser.parseTurn(contentDiv, index)
                    this.mapChildrenElements(contentDiv, children)
                    turnNode.children = children
                }

                rootNodes.push(turnNode)
            }
        })

        return { toc: rootNodes }
    }

    private mapChildrenElements(container: HTMLElement, nodes: TOCNode[]) {
        // We know TOCParser uses Strategy 1 (Headings) -> Strategy 2 (Bolds) -> Strategy 3 (Paras)
        // We can re-run the queries to get the lists, then map indices.

        // 1. Headings
        const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        if (headings.length > 0) {
            // Strategy 1 active
            // Map flat list
            const flatten = (n: TOCNode[]) => n.flatMap(x => [x, ...(x.children ? flatten(x.children) : [])])
            const flatNodes = flatten(nodes)

            flatNodes.forEach(node => {
                if (node.type === 'heading') {
                    // ID: ...-heading-{index}
                    const match = node.id.match(/-heading-(\d+)$/)
                    if (match) {
                        const idx = parseInt(match[1])
                        if (headings[idx]) this.nodeElementMap.set(node.id, headings[idx] as HTMLElement)
                    }
                }
            })
            return
        }

        // 2. Bolds
        const bolds = Array.from(container.querySelectorAll('strong, b'))
        const significantBolds = bolds.filter(b => {
            const text = b.textContent?.trim() || ""
            const parentBlock = b.parentElement
            const isStandalone = parentBlock && parentBlock.textContent?.trim() === text
            return text.length > 3 && text.length < 50 && (isStandalone || text.endsWith(':'))
        })

        if (significantBolds.length > 0) {
            const flatten = (n: TOCNode[]) => n.flatMap(x => [x, ...(x.children ? flatten(x.children) : [])])
            const flatNodes = flatten(nodes)
            flatNodes.forEach(node => {
                if (node.type === 'heading') {
                    const match = node.id.match(/-bold-(\d+)$/) // Parser uses -bold- for bolds?
                    // Wait, TOCParser lines 44-46: id: `ext-turn-${turnIndex}-bold-${bIndex}`
                    if (match) {
                        const idx = parseInt(match[1])
                        if (significantBolds[idx]) this.nodeElementMap.set(node.id, significantBolds[idx] as HTMLElement)
                    }
                }
            })
            return
        }

        // 3. Paras
        // ... (Similar logic for paras if needed)
    }

    private parseWithDebounce() {
        if (this.debounceTimer) clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(() => {
            const result = this.parse()
            this.registerScrollSpyElements()
            if (this.onUpdate) this.onUpdate(result)
        }, 1000)
    }

    scrollTo(id: string): boolean {
        // Method 1: Try using cached element reference (Most Robust)
        const cachedEl = this.nodeElementMap.get(id)
        if (cachedEl && document.contains(cachedEl)) {
            // Check if hidden (collapsed parent) - naive check
            // If offsetParent is null, it might be hidden.
            if (cachedEl.offsetParent === null) {
                // Try to find parent details/button to click? 
                // Too risky to automate clicking in ChatGPT. 
                // Just try scrolling parent?
                cachedEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else {
                cachedEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            this.highlight(cachedEl)
            return true
        }

        // Method 2: Fallback to Index-based (if cache miss)
        // ID format: ext-turn-{index}-{type}-{subIndex}
        const parts = id.split('-')
        if (parts.length < 3) return false // Invalid

        const turnIndex = parseInt(parts[2])
        const turnElement = this.turnMap.get(turnIndex)

        if (!turnElement) return false

        if (parts.length === 3) {
            // Just the turn: ext-turn-5
            turnElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
            this.highlight(turnElement)
            return true
        }

        // Deep node: ext-turn-5-heading-2
        const type = parts[3]
        const subIndex = parseInt(parts[4])

        let target: HTMLElement | null = null

        // Must match TOCParser logic EXACTLY
        if (type === 'heading') {
            const headings = Array.from(turnElement.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            if (headings.length > subIndex) {
                target = headings[subIndex] as HTMLElement
            } else {
                // Fallback to bolds if headings exhausted (though TOCParser usually exclusive)
                // If ID says 'heading', TOCParser usually found a heading.
                // But TOCParser Strategy 2 uses 'heading' type for bolds too!
                // We need to check if we are in Strategy 2 territory.
                // TOCParser uses headings OR bolds.
                if (headings.length === 0) {
                    const bolds = Array.from(turnElement.querySelectorAll('strong, b'))
                    // Filter same as TOCParser? 
                    // Ideally we replicate strict filtering or just grab all. 
                    // Let's grab specific one.
                    const significantBolds = bolds.filter(b => {
                        const text = b.textContent?.trim() || ""
                        const parentBlock = b.parentElement
                        const isStandalone = parentBlock && parentBlock.textContent?.trim() === text
                        return text.length > 3 && text.length < 50 && (isStandalone || text.endsWith(':'))
                    })
                    if (significantBolds.length > subIndex) target = significantBolds[subIndex] as HTMLElement
                }
            }
        } else if (type === 'para') {
            const paras = Array.from(turnElement.querySelectorAll('p'))
            if (paras.length > subIndex) {
                // TOCParser adds filter > 20 chars
                // We must filter too to match indices
                const validParas = paras.filter(p => (p.textContent?.trim().length || 0) > 20)
                if (validParas.length > subIndex) target = validParas[subIndex] as HTMLElement
            }
        }

        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' })
            this.highlight(target)
            return true
        } else {
            // Fallback to turn
            turnElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
            return true
        }
    }

    private highlight(el: HTMLElement) {
        // Cancel any existing animation on this element to prevent style conflicts
        const existing = this.activeHighlightCleanup.get(el)
        if (existing) {
            existing.timers.forEach(t => clearTimeout(t))
            existing.cleanup()
        }

        // Save original styles ONLY if not already in an animation
        // This ensures we always restore to the true original state
        const originalOutline = el.style.outline
        const originalOutlineOffset = el.style.outlineOffset
        const originalTransition = el.style.transition
        const originalBoxShadow = el.style.boxShadow

        const timers: number[] = []

        const cleanup = () => {
            el.style.outline = originalOutline
            el.style.outlineOffset = originalOutlineOffset
            el.style.boxShadow = originalBoxShadow
            el.style.transition = originalTransition
            this.activeHighlightCleanup.delete(el)
        }

        // Store cleanup function and timer references
        this.activeHighlightCleanup.set(el, { cleanup, timers })

        // Apply highlight styles - don't modify borderRadius to preserve bubble shape
        el.style.transition = 'outline 0.2s ease, box-shadow 0.2s ease, outline-offset 0.2s ease'
        el.style.outlineOffset = '4px' // Add spacing between text and outline

        // Blink animation - multiple pulses
        const pulseOn = () => {
            el.style.outline = '2px solid rgba(59, 130, 246, 0.9)'
            el.style.boxShadow = '0 0 0 6px rgba(59, 130, 246, 0.15)'
        }
        const pulseOff = () => {
            el.style.outline = '2px solid rgba(59, 130, 246, 0.4)'
            el.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.05)'
        }

        // Initial pulse
        pulseOn()

        // Blink 3 times - track all timers for cleanup
        timers.push(setTimeout(pulseOff, 200) as unknown as number)
        timers.push(setTimeout(pulseOn, 400) as unknown as number)
        timers.push(setTimeout(pulseOff, 600) as unknown as number)
        timers.push(setTimeout(pulseOn, 800) as unknown as number)
        timers.push(setTimeout(pulseOff, 1000) as unknown as number)
        timers.push(setTimeout(pulseOn, 1200) as unknown as number)

        // Fade out
        timers.push(setTimeout(() => {
            el.style.outline = 'none'
            el.style.boxShadow = 'none'
            timers.push(setTimeout(() => {
                cleanup()
            }, 300) as unknown as number)
        }, 1800) as unknown as number)
    }

    private registerScrollSpyElements() {
        if (!this.scrollSpy) return
        this.scrollSpy.clear()

        // Register all mapped elements with ScrollSpy
        for (const [id, element] of this.nodeElementMap) {
            this.scrollSpy.register(id, element)
        }

        // Also register turns
        for (const [index, element] of this.turnMap) {
            const turnId = `ext-turn-${index}`
            this.scrollSpy.register(turnId, element)
        }
    }

    scrollToHash(hash: string): void {
        if (hash.startsWith('#')) hash = hash.substring(1)
        this.scrollTo(hash)
    }

    getNodeId(element: HTMLElement): string | null {
        return this.scrollSpy?.getIdForElement(element) || null
    }
}
