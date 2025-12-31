import type { ISiteAdapter, AdapterMeta, ParseResult } from "./interface"
import type { TOCNode } from "../lib/types"
import { TOCParser } from "../lib/toc-parser"
import { ScrollSpy } from "../lib/scroll-spy"

export class GeminiAdapter implements ISiteAdapter {
    meta: AdapterMeta = {
        name: "Gemini",
        matches: ["https://gemini.google.com/*"],
        primaryColor: "#1d4ed8" // Blue-700
    }

    private observer: MutationObserver | null = null
    private onUpdate: ((result: ParseResult) => void) | null = null
    private debounceTimer: number | null = null
    private scrollSpy: ScrollSpy | null = null

    // Store references for scrolling (like ChatGPT adapter)
    private turnMap: Map<number, HTMLElement> = new Map()
    private nodeElementMap: Map<string, HTMLElement> = new Map()
    // Track active highlight animations to prevent style conflicts on rapid clicks
    private activeHighlightCleanup: WeakMap<HTMLElement, { cleanup: () => void; timers: number[] }> = new WeakMap()

    init(onUpdate: (result: ParseResult) => void, onActive?: (id: string) => void): void {
        this.onUpdate = onUpdate
        if (onActive) {
            this.scrollSpy = new ScrollSpy(onActive)
        }

        // Initial parse with delay for dynamic loading
        this.initialLoop()

        // Setup MutationObserver
        const container = document.querySelector('body')
        if (container) {
            this.observer = new MutationObserver(() => {
                this.parseWithDebounce()
            })
            this.observer.observe(container, {
                childList: true,
                subtree: true,
                characterData: true
            })
        }
    }

    private initialLoop() {
        this.parseWithDebounce()
        setTimeout(() => this.parseWithDebounce(), 2000)
    }

    destroy(): void {
        if (this.observer) {
            this.observer.disconnect()
            this.observer = null
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
        }
        this.scrollSpy?.destroy()
        this.nodeElementMap.clear()
        this.turnMap.clear()
    }

    parse(): ParseResult {
        const rootNodes: TOCNode[] = []
        this.nodeElementMap.clear()
        this.turnMap.clear()

        // Gemini uses custom elements: <user-query> and <model-response>
        // Primary strategy: Use these tags directly
        const userQueries = Array.from(document.querySelectorAll('user-query'))
        const modelResponses = Array.from(document.querySelectorAll('model-response'))

        // Fallback: If custom elements not found, try class-based selectors
        if (userQueries.length === 0 && modelResponses.length === 0) {
            // Try alternative selectors
            const altUserQueries = Array.from(document.querySelectorAll('.user-query-bubble-with-background, .query-content'))
            const altResponses = Array.from(document.querySelectorAll('.response-content, .markdown'))
                .filter(el => {
                    if (el.closest('.cdk-visually-hidden')) return false
                    if (el.closest('.thoughts-container')) return false
                    return true
                })

            if (altUserQueries.length === 0 && altResponses.length === 0) {
                return { toc: [] }
            }

            // Use fallback
            return this.parseWithSelectors(altUserQueries, altResponses)
        }

        return this.parseWithSelectors(userQueries, modelResponses)
    }

    private parseWithSelectors(userQueries: Element[], responses: Element[]): ParseResult {
        const rootNodes: TOCNode[] = []

        // Build a combined list sorted by DOM order
        interface TurnInfo {
            element: Element
            isUser: boolean
        }

        const allTurns: TurnInfo[] = []

        userQueries.forEach(el => allTurns.push({ element: el, isUser: true }))
        responses.forEach(el => allTurns.push({ element: el, isUser: false }))

        // Sort by document position
        allTurns.sort((a, b) => {
            const pos = a.element.compareDocumentPosition(b.element)
            if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
            return 0
        })

        let pendingUserPrompt: string | null = null
        let pendingUserElement: Element | null = null

        allTurns.forEach((turn, index) => {
            this.turnMap.set(index, turn.element as HTMLElement)

            if (turn.isUser) {
                // Store user prompt text to use as turn title
                const text = turn.element.textContent?.trim() || ""
                pendingUserPrompt = text.substring(0, 50) + (text.length > 50 ? "..." : "")
                pendingUserElement = turn.element
            } else {
                // AI Response
                const turnId = `ext-turn-${index}`

                // Use user prompt as turn text, fallback to "AI RESPONSE"
                const turnNode: TOCNode = {
                    id: turnId,
                    text: pendingUserPrompt || "AI RESPONSE",
                    level: 1,
                    type: 'turn',
                    speaker: 'ai',
                    children: []
                }

                // Store reference to user's bubble element for click-to-scroll
                if (pendingUserPrompt && pendingUserElement) {
                    // Try to find the specific user bubble for precise highlighting
                    const userBubble = (pendingUserElement as HTMLElement).querySelector('.user-query-bubble-with-background') as HTMLElement
                    // Map to bubble (or fallback to element)
                    this.nodeElementMap.set(turnId, userBubble || (pendingUserElement as HTMLElement))
                    pendingUserPrompt = null
                    pendingUserElement = null
                }

                // Parse AI response content for headings
                const contentEl = turn.element as HTMLElement
                const children = TOCParser.parseTurn(contentEl, index)
                this.mapChildrenElements(contentEl, children, index)
                turnNode.children = children

                rootNodes.push(turnNode)
            }
        })

        return { toc: rootNodes }
    }

    private mapChildrenElements(container: HTMLElement, nodes: TOCNode[], turnIndex: number) {
        // Map headings
        const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        if (headings.length > 0) {
            const flatten = (n: TOCNode[]): TOCNode[] => n.flatMap(x => [x, ...(x.children ? flatten(x.children) : [])])
            const flatNodes = flatten(nodes)

            flatNodes.forEach(node => {
                if (node.type === 'heading') {
                    const match = node.id.match(/-heading-(\d+)$/)
                    if (match) {
                        const idx = parseInt(match[1])
                        if (headings[idx]) this.nodeElementMap.set(node.id, headings[idx] as HTMLElement)
                    }
                }
            })
            return
        }

        // Map bolds (fallback)
        const bolds = Array.from(container.querySelectorAll('strong, b'))
        const significantBolds = bolds.filter(b => {
            const text = b.textContent?.trim() || ""
            const parentBlock = b.parentElement
            const isStandalone = parentBlock && parentBlock.textContent?.trim() === text
            return text.length > 3 && text.length < 50 && (isStandalone || text.endsWith(':'))
        })

        if (significantBolds.length > 0) {
            const flatten = (n: TOCNode[]): TOCNode[] => n.flatMap(x => [x, ...(x.children ? flatten(x.children) : [])])
            const flatNodes = flatten(nodes)
            flatNodes.forEach(node => {
                if (node.type === 'heading') {
                    const match = node.id.match(/-bold-(\d+)$/)
                    if (match) {
                        const idx = parseInt(match[1])
                        if (significantBolds[idx]) this.nodeElementMap.set(node.id, significantBolds[idx] as HTMLElement)
                    }
                }
            })
        }
    }

    private parseWithDebounce() {
        if (this.debounceTimer) clearTimeout(this.debounceTimer)
        this.debounceTimer = window.setTimeout(() => {
            if (this.onUpdate) {
                const result = this.parse()
                this.registerScrollSpyElements()
                this.onUpdate(result)
            }
        }, 1000)
    }

    private getScrollParent(node: HTMLElement): HTMLElement {
        let parent = node.parentElement
        while (parent) {
            const style = window.getComputedStyle(parent)
            if (['scroll', 'auto'].includes(style.overflowY)) {
                return parent
            }
            parent = parent.parentElement
        }
        return document.documentElement
    }

    private scrollWithOffset(el: HTMLElement) {
        const offset = window.innerHeight * 0.15
        const container = this.getScrollParent(el)

        if (container === document.documentElement || container === document.body) {
            const elementPosition = el.getBoundingClientRect().top + window.pageYOffset
            const offsetPosition = elementPosition - offset

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            })
        } else {
            const elRect = el.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()
            const currentScroll = container.scrollTop
            const diff = elRect.top - containerRect.top
            const target = currentScroll + diff - offset

            container.scrollTo({
                top: target,
                behavior: "smooth"
            })
        }
    }

    scrollTo(id: string): boolean {
        // Try cached element first
        const cachedEl = this.nodeElementMap.get(id)
        if (cachedEl && document.contains(cachedEl)) {
            this.scrollWithOffset(cachedEl)
            this.highlight(cachedEl)
            return true
        }

        // Fallback to index-based lookup
        const parts = id.split('-')
        if (parts.length < 3) return false

        const turnIndex = parseInt(parts[2])
        const turnElement = this.turnMap.get(turnIndex)

        if (!turnElement) return false

        if (parts.length === 3) {
            // Just the turn
            this.scrollWithOffset(turnElement)
            this.highlight(turnElement)
            return true
        }

        // Deep node
        const type = parts[3]
        const subIndex = parseInt(parts[4])
        let target: HTMLElement | null = null

        if (type === 'heading') {
            const headings = Array.from(turnElement.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            if (headings.length > subIndex) {
                target = headings[subIndex] as HTMLElement
            } else if (headings.length === 0) {
                // Check bolds
                const bolds = Array.from(turnElement.querySelectorAll('strong, b'))
                const significantBolds = bolds.filter(b => {
                    const text = b.textContent?.trim() || ""
                    const parentBlock = b.parentElement
                    const isStandalone = parentBlock && parentBlock.textContent?.trim() === text
                    return text.length > 3 && text.length < 50 && (isStandalone || text.endsWith(':'))
                })
                if (significantBolds.length > subIndex) target = significantBolds[subIndex] as HTMLElement
            }
        } else if (type === 'para') {
            const paras = Array.from(turnElement.querySelectorAll('p'))
            const validParas = paras.filter(p => (p.textContent?.trim().length || 0) > 20)
            if (validParas.length > subIndex) target = validParas[subIndex] as HTMLElement
        }

        if (target) {
            this.scrollWithOffset(target)
            this.highlight(target)
            return true
        } else {
            this.scrollWithOffset(turnElement)
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
        const originalBorderRadius = el.style.borderRadius

        // Check if element already has significant border-radius (e.g., user bubbles)
        // If so, don't override it; otherwise apply our own for nicer highlights
        const computedRadius = window.getComputedStyle(el).borderRadius
        const hasExistingRadius = computedRadius && parseFloat(computedRadius) > 4
        const shouldApplyRadius = !hasExistingRadius

        const timers: number[] = []

        const cleanup = () => {
            el.style.outline = originalOutline
            el.style.outlineOffset = originalOutlineOffset
            el.style.boxShadow = originalBoxShadow
            el.style.transition = originalTransition
            if (shouldApplyRadius) {
                el.style.borderRadius = originalBorderRadius
            }
            this.activeHighlightCleanup.delete(el)
        }

        // Store cleanup function and timer references
        this.activeHighlightCleanup.set(el, { cleanup, timers })

        // Apply highlight styles
        el.style.transition = 'outline 0.2s ease, box-shadow 0.2s ease, outline-offset 0.2s ease'
        el.style.outlineOffset = '4px' // Add spacing between text and outline

        // Only apply border-radius if element doesn't already have one (preserve bubble shapes)
        if (shouldApplyRadius) {
            el.style.borderRadius = '6px'
        }

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
