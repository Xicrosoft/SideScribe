import type { ISiteAdapter } from "./interface"
import { GeminiAdapter } from "./gemini"
import { ChatGPTAdapter } from "./chatgpt"

export class AdapterRegistry {
    private adapters: ISiteAdapter[] = []
    private activeAdapter: ISiteAdapter | null = null

    constructor() {
        // Register available adapters here
        this.adapters.push(new GeminiAdapter())
        this.adapters.push(new ChatGPTAdapter())
    }

    public init(url: string, onUpdate: (result: any) => void, onActive?: (id: string) => void) {
        // Find matching adapter
        const adapter = this.adapters.find(a =>
            a.meta.matches.some(pattern => this.matchPattern(url, pattern))
        )

        if (adapter) {
            if (this.activeAdapter !== adapter) {
                this.activeAdapter?.destroy()
                this.activeAdapter = adapter
                console.log(`[SideScribe] Activating adapter: ${adapter.meta.name}`)
                adapter.init(onUpdate, onActive)
            }
        } else {
            console.log(`[SideScribe] No adapter found for URL: ${url}`)
            this.activeAdapter?.destroy()
            this.activeAdapter = null
        }
    }

    public getActiveAdapter(): ISiteAdapter | null {
        return this.activeAdapter
    }

    private matchPattern(url: string, pattern: string): boolean {
        // Simple glob matching logic
        // Convert glob * to regex .*
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        return regex.test(url)
    }
}
