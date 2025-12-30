import { Storage } from "@plasmohq/storage"
import type { CachedConversation, TOCNode } from "./types"

export const storage = new Storage()

export const STORAGE_KEYS = {
    EXPANDED_TURNS: "expanded_turns", // JSON stringified Set
    THEME_PREF: "theme_pref", // 'auto' | 'light' | 'dark'
    TOC_CACHE_ENABLED: "toc_cache_enabled",
    CACHED_CONVERSATIONS: "cached_conversations" // Record<id, CachedConversation>
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
    if (typeof val === 'boolean') return val
    if (typeof val === 'string') return val === 'true'
    return defaultVal
}

// ============================================
// TOC Cache Functions
// ============================================

/**
 * Extract numeric turn index from turn ID (e.g., "turn-5" -> 5)
 */
function getTurnIndex(id: string): number | null {
    const match = id.match(/^turn-(\d+)$/)
    return match ? parseInt(match[1], 10) : null
}

/**
 * Heuristic Contiguous Merge with Edit/Delete Detection
 * 
 * Merges cached TOC with freshly parsed TOC, handling:
 * - Lazy-loaded conversations (preserve cached turns outside visible range)
 * - Edits (same ID, different content -> use fresh)
 * - Deletions (ID in cache + visible range, but not in fresh -> remove)
 */
export function mergeTOC(cached: TOCNode[], fresh: TOCNode[]): TOCNode[] {
    if (cached.length === 0) return fresh
    if (fresh.length === 0) return cached

    // Build maps for quick lookup
    const freshMap = new Map(fresh.map(n => [n.id, n]))
    const freshIndices = fresh.map(n => getTurnIndex(n.id)).filter((i): i is number => i !== null)

    if (freshIndices.length === 0) {
        // No valid turn indices in fresh, fallback to simple replace
        return fresh
    }

    const minFreshIdx = Math.min(...freshIndices)
    const maxFreshIdx = Math.max(...freshIndices)

    const merged: TOCNode[] = []

    // Process cached turns
    for (const cachedNode of cached) {
        const idx = getTurnIndex(cachedNode.id)

        if (idx === null) {
            // Non-turn node (shouldn't happen at top level, but handle gracefully)
            if (!freshMap.has(cachedNode.id)) {
                merged.push(cachedNode)
            }
            continue
        }

        if (idx < minFreshIdx) {
            // Before visible range: keep from cache
            merged.push(cachedNode)
        } else if (idx > maxFreshIdx) {
            // After visible range: keep from cache (may be above viewport)
            merged.push(cachedNode)
        } else {
            // Within visible range: check if still exists in fresh
            // If exists in fresh, it will be added when processing fresh
            // If not in fresh, it was deleted - skip
        }
    }

    // Add all fresh turns (they override cached in visible range)
    for (const freshNode of fresh) {
        const idx = getTurnIndex(freshNode.id)
        if (idx !== null) {
            // Remove any existing node with same ID (will be replaced)
            const existingIdx = merged.findIndex(n => n.id === freshNode.id)
            if (existingIdx !== -1) {
                merged.splice(existingIdx, 1)
            }
        }
        merged.push(freshNode)
    }

    // Sort by turn index
    merged.sort((a, b) => {
        const idxA = getTurnIndex(a.id) ?? Infinity
        const idxB = getTurnIndex(b.id) ?? Infinity
        return idxA - idxB
    })

    return merged
}

/**
 * Get all cached conversations
 */
export async function getAllCachedConversations(): Promise<Record<string, CachedConversation>> {
    const data = await storage.get(STORAGE_KEYS.CACHED_CONVERSATIONS)
    if (!data) return {}
    try {
        return typeof data === 'string' ? JSON.parse(data) : data
    } catch {
        return {}
    }
}

/**
 * Get a specific cached conversation
 */
export async function getCachedConversation(id: string): Promise<CachedConversation | null> {
    const all = await getAllCachedConversations()
    return all[id] || null
}

/**
 * Save a cached conversation (with merge if exists)
 */
export async function saveCachedConversation(conversation: CachedConversation): Promise<void> {
    const all = await getAllCachedConversations()
    const existing = all[conversation.id]

    if (existing) {
        // Merge TOC with existing cache
        const mergedToc = mergeTOC(existing.toc, conversation.toc)
        all[conversation.id] = {
            ...conversation,
            toc: mergedToc,
            cachedAt: existing.cachedAt, // Preserve original cache time
            lastUpdated: Date.now(),
            messageCount: mergedToc.length
        }
    } else {
        all[conversation.id] = {
            ...conversation,
            cachedAt: Date.now(),
            lastUpdated: Date.now()
        }
    }

    await storage.set(STORAGE_KEYS.CACHED_CONVERSATIONS, all)
}

/**
 * Delete a cached conversation
 */
export async function deleteCachedConversation(id: string): Promise<void> {
    const all = await getAllCachedConversations()
    delete all[id]
    await storage.set(STORAGE_KEYS.CACHED_CONVERSATIONS, all)
}

/**
 * Clear all cached conversations
 */
export async function clearAllCachedConversations(): Promise<void> {
    await storage.remove(STORAGE_KEYS.CACHED_CONVERSATIONS)
}

// ============================================
// Debounce Helper
// ============================================

const debounceTimers: Record<string, number> = {}

/**
 * Debounced save for TOC cache (800ms)
 */
export function debouncedSaveCachedConversation(conversation: CachedConversation): void {
    const key = `cache_${conversation.id}`

    if (debounceTimers[key]) {
        clearTimeout(debounceTimers[key])
    }

    debounceTimers[key] = setTimeout(() => {
        saveCachedConversation(conversation)
        delete debounceTimers[key]
    }, 800) as unknown as number
}
