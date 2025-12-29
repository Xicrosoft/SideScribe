import { derived, writable } from "svelte/store"
import { loadBoolean, saveBoolean, storage } from "../storage"

// Types
export type Language = 'en' | 'zh'

const dictionaries: Record<Language, Record<string, string>> = {
    en: {
        "toc.title": "Table of Contents",
        "toc.empty": "No headings yet...",
        "toc.empty.hint": "Chat to generate structure",
        "search.placeholder": "Search headings...",
        "settings.title": "Settings",
        "settings.theme": "Theme",
        "settings.language": "Language",
        "settings.cache": "Cache",
        "settings.cache.clear": "Clear Cache",
        "settings.cache.cleared": "Cache Cleared!",
        "settings.behavior": "Behavior",
        "settings.autoExpand": "Auto-expand Turns",
        "theme.auto": "Auto",
        "theme.light": "Light",
        "theme.dark": "Dark",
        "lang.auto": "Auto",
        "error.generic": "Unable to read content. This might be a restricted page or the chat hasn't loaded yet."
    },
    zh: {
        "toc.title": "目录",
        "toc.empty": "暂无标题...",
        "toc.empty.hint": "开始对话以生成结构",
        "search.placeholder": "搜索标题...",
        "settings.title": "设置",
        "settings.theme": "主题",
        "settings.language": "语言",
        "settings.cache": "缓存",
        "settings.cache.clear": "清除缓存",
        "settings.cache.cleared": "缓存已清除！",
        "settings.behavior": "行为",
        "settings.autoExpand": "自动展开对话",
        "theme.auto": "自动",
        "theme.light": "亮色",
        "theme.dark": "暗色",
        "lang.auto": "自动",
        "error.generic": "无法读取内容。可能是受限页面或对话尚未加载。"
    }
}

// Persisted Language Store
function createLanguageStore() {
    const { subscribe, set, update } = writable<Language>('en')

    // Load from storage
    storage.get("language").then((val) => {
        if (val && (val === 'en' || val === 'zh')) {
            set(val)
        } else {
            // Auto detect
            const lang = navigator.language.startsWith('zh') ? 'zh' : 'en'
            set(lang)
        }
    })

    return {
        subscribe,
        set: (lang: Language) => {
            set(lang)
            storage.set("language", lang)
        }
    }
}

export const languageStore = createLanguageStore()

// Derived store for simple usage: $t('key')
export const t = derived(languageStore, ($lang) => (key: string) => {
    return dictionaries[$lang][key] || key
})
