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
        // Thresholds: Monitor when elements enter/exit significantly
        // RootMargin: -10% from top (sticky header space), -50% from bottom (focus on top half)
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersect(entries),
            {
                root: null, // viewport
                rootMargin: '-10% 0px -50% 0px',
                threshold: [0, 0.1, 0.5, 1.0]
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
        // Inefficient to iterate map, but reliable. 
        // Optimized way: store ID on element dataset if possible, but minimal DOM intrusion preferred.
        // Or use a reverse map.
        for (const [key, val] of this.elements.entries()) {
            if (val === el || val.contains(el)) return key
        }
        return undefined
    }

    private determineActive() {
        // Heuristic: Pick the element with highest intersection ratio, 
        // or if equal, the one that appears first in DOM order (not tracked here, but usually consistent).
        // Or simply: The first one in our map that is visible? No, map order is insertion order.

        let maxRatio = 0
        let candidate: string | null = null

        // Filter for currently visible
        if (this.visibilityMap.size === 0) return

        // Logic: Pick the top-most visible element (closest to top of viewport)
        // IntersectionObserver entries don't give absolute position easily without bounding client rect.
        // So, let's refine:
        // We want the element that is "reading" - usually top of the viewport.

        // Let's iterate tracked elements and check BoundingRect for those in visibilityMap
        let minTop = Infinity

        for (const [id, _] of this.visibilityMap) {
            const el = this.elements.get(id)
            if (!el) continue
            const rect = el.getBoundingClientRect()

            // We prefer positive top (it's in view) but close to 0.
            // Or negative top (it's spanning the viewport).
            // Simple "ScrollSpy" logic: Closest to top-offset.
            if (rect.top < minTop) {
                minTop = rect.top
                candidate = id
            }
        }

        if (candidate && candidate !== this.activeId) {
            this.activeId = candidate
            this.onActive(candidate)
        }
    }
}
