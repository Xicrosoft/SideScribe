import type { TOCNode } from "../lib/types"

export interface AdapterMeta {
    name: string
    matches: string[] // glob patterns or regex strings
    primaryColor?: string // for theming
}

export interface ParseResult {
    toc: TOCNode[]
}

export interface ISiteAdapter {
    meta: AdapterMeta

    // Lifecycle
    init(onUpdate: (result: ParseResult) => void, onActive?: (id: string) => void): void
    destroy(): void

    // Core functionality
    parse(): ParseResult
    scrollTo(id: string): boolean
    scrollToHash?(hash: string): void
    getNodeId?(element: HTMLElement): string | null
}
