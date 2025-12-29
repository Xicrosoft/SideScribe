import { writable } from "svelte/store"
import type { TOCNode } from "./types"
import { storage, STORAGE_KEYS, loadSet, saveSet, loadBoolean, saveBoolean } from "./storage"
import { languageStore } from "./i18n"

export const tocStore = writable<TOCNode[]>([])
export const activeNodeId = writable<string | null>(null)
export type AppStatus = 'loading' | 'success' | 'empty' | 'error'
export const statusStore = writable<AppStatus>('loading')

// Persisted Stores
function createPersistedSet(key: string) {
    const { subscribe, set, update } = writable<Set<string>>(new Set())

    // Load initial
    loadSet(key).then(val => set(val))

    // Subscribe to changes and save
    subscribe(val => {
        if (val.size > 0) saveSet(key, val)
    })

    return {
        subscribe,
        set,
        add: (id: string) => update(s => {
            const n = new Set(s); n.add(id); saveSet(key, n); return n
        }),
        delete: (id: string) => update(s => {
            const n = new Set(s); n.delete(id); saveSet(key, n); return n
        }),
        toggle: (id: string) => update(s => {
            const n = new Set(s)
            if (n.has(id)) n.delete(id)
            else n.add(id)
            saveSet(key, n)
            return n
        })
    }
}

// Persisted Boolean Store
function createPersistedBoolean(key: string, defaultVal: boolean = true) {
    const { subscribe, set, update } = writable<boolean>(defaultVal)

    // Load
    loadBoolean(key, defaultVal).then(val => set(val))

    // Save on change
    subscribe(val => saveBoolean(key, val))

    return {
        subscribe,
        set,
        toggle: () => update(v => {
            const newVal = !v
            saveBoolean(key, newVal)
            return newVal
        })
    }
}

// Persisted Value Store (Generic)
function createPersistedValue<T>(key: string, defaultVal: T) {
    const { subscribe, set, update } = writable<T>(defaultVal)

    // Load
    storage.get(key).then(val => {
        if (val !== undefined) set(val as T)
    })

    // Save on change
    subscribe(val => {
        if (val !== undefined) storage.set(key, val)
    })

    return {
        subscribe,
        set,
        update
    }
}

export const expandedTurnStore = createPersistedSet(STORAGE_KEYS.EXPANDED_TURNS)
export const overlayOpenStore = createPersistedBoolean(STORAGE_KEYS.OVERLAY_OPEN, true)
export const themeStore = createPersistedValue<'auto' | 'light' | 'dark'>(STORAGE_KEYS.THEME_PREF, 'auto')
export const settingsStore = createPersistedValue('settings', {
    autoExpand: true
})

export { languageStore }
