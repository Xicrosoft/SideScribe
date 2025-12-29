import { Storage } from "@plasmohq/storage"

export const storage = new Storage()

export const STORAGE_KEYS = {
    OVERLAY_OPEN: "overlay_open",
    EXPANDED_TURNS: "expanded_turns", // JSON stringified Set
    THEME_PREF: "theme_pref" // 'auto' | 'light' | 'dark'
}

// Helpers for Set serialization
export const saveSet = async (key: string, set: Set<string>) => {
    await storage.set(key, JSON.stringify(Array.from(set)))
}

export const loadSet = async (key: string): Promise<Set<string>> => {
    const val = await storage.get(key)
    if (!val) return new Set()
    try {
        const parsed = JSON.parse(val)
        return new Set(Array.isArray(parsed) ? parsed : [])
    } catch {
        return new Set()
    }
}

// Helper for Boolean
export const saveBoolean = async (key: string, val: boolean) => {
    await storage.set(key, val)
}

export const loadBoolean = async (key: string, defaultVal: boolean = true): Promise<boolean> => {
    const val = await storage.get(key)
    if (val === undefined) return defaultVal
    // Handle both boolean and string types from storage
    if (typeof val === 'boolean') return val
    if (typeof val === 'string') return val === 'true'
    return defaultVal
}
