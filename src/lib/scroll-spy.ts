export class ScrollSpy {
    private observer: IntersectionObserver | null = null
    private activeId: string | null = null
    private onActive: (id: string) => void
    private elements: Map<string, HTMLElement> = new Map()

    // Track visibility ratios to pick the "best" active element
    private visibilityMap: Map<string, number> = new Map()

    constructor(onActive: (id: string) => void) {
        this.onActive = onActive
        this.initObserver()
    }

    private initObserver() {
        // Monitor a larger portion of the viewport to ensure we track elements
        // as they approach the "active line" (top ~15-20%)
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersect(entries),
            {
                root: null, // viewport
                // Expansion: allow tracking slightly above/below, but focus on top area
                // -80% bottom means we ignore the bottom 80%? No, rootMargin shrinks the box.
                // '0px 0px -80% 0px' -> Top 20% of viewport.
                // We want to track elements that are *potentially* active.
                // Active = top <= threshold (approx 15-20%).
                // So we need to see well below the threshold to detect incoming items.
                // Let's watch the whole viewport to be safe and filter in logic.
                rootMargin: '0px 0px 0px 0px',
                threshold: [0, 0.1]
            }
        )
    }

    public register(id: string, element: HTMLElement) {
        if (!element) return
        this.elements.set(id, element)
        this.observer?.observe(element)
    }

    public clear() {
        this.observer?.disconnect()
        this.elements.clear()
        this.visibilityMap.clear()
        this.initObserver()
    }

    public destroy() {
        this.observer?.disconnect()
        this.elements.clear()
    }

    private handleIntersect(entries: IntersectionObserverEntry[]) {
        entries.forEach(entry => {
            // Find key for this element
            const id = this.getIdForElement(entry.target as HTMLElement)
            if (id) {
                if (entry.isIntersecting) {
                    this.visibilityMap.set(id, entry.intersectionRatio)
                } else {
                    this.visibilityMap.delete(id)
                }
            }
        })

        this.determineActive()
    }

    public getIdForElement(el: HTMLElement): string | undefined {
        for (const [key, val] of this.elements.entries()) {
            if (val === el || val.contains(el)) return key
        }
        return undefined
    }

    private determineActive() {
        if (this.visibilityMap.size === 0) return

        // New Logic: "Highest candidate below threshold"
        // We look for elements that have "started" (top <= threshold)
        // Among those, we pick the one that started *latest* (highest top value).
        // This corresponds to the section header we most recently scrolled past.

        const viewportHeight = window.innerHeight
        const threshold = viewportHeight * 0.15 // 15% from top

        let bestCandidate: string | null = null
        let maxTop = -Infinity

        for (const [id, _] of this.visibilityMap) {
            const el = this.elements.get(id)
            if (!el) continue

            const rect = el.getBoundingClientRect()

            // Candidate must be "started" (top <= threshold)
            if (rect.top <= threshold) {
                // Pick the one closest to the threshold from the top side
                if (rect.top > maxTop) {
                    maxTop = rect.top
                    bestCandidate = id
                }
            }
        }

        // Fallback: If no element satisfies top <= threshold (e.g., fast scroll to very top, 
        // or large gap before first item), check if there's *any* visible item,
        // and pick the top-most one.
        if (!bestCandidate && this.activeId === null) {
            // Only apply fallback if we have nothing active yet. 
            // Otherwise, stick to last active (user might be in empty space between turns).
            // Actually, if we are scrolling UP and the current active item goes below threshold,
            // bestCandidate becomes null. logic should switch to PREVIOUS item?
            // But previous item should be in visibilityMap and satisfy top <= threshold 
            // (it would be above the current one).

            // If we are at the very top of page, the first item might be at top=200 > threshold.
            // In this case, we might want to highlight it if it's the *only* thing visible?
            // Let's stick to strict threshold for now.
        }

        if (bestCandidate && bestCandidate !== this.activeId) {
            this.activeId = bestCandidate
            this.onActive(bestCandidate)
        }
    }
}
