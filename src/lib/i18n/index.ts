import { derived, writable } from "svelte/store"
import { storage } from "../storage"

// Supported Languages
export type Language = 'auto' | 'en' | 'zh-Hans' | 'zh-Hant' | 'fr' | 'ru' | 'ja' | 'ko'

// Language metadata for UI display
export const LANGUAGE_META: Record<Language, { native: string; english: string }> = {
    'auto': { native: 'Auto-detect', english: 'Auto-detect' },
    'en': { native: 'English', english: 'English' },
    'zh-Hans': { native: '简体中文', english: 'Simplified Chinese' },
    'zh-Hant': { native: '繁體中文', english: 'Traditional Chinese' },
    'fr': { native: 'Français', english: 'French' },
    'ru': { native: 'Русский', english: 'Russian' },
    'ja': { native: '日本語', english: 'Japanese' },
    'ko': { native: '한국어', english: 'Korean' }
}

// Excluding 'auto' for dictionary lookup
type DictionaryLanguage = Exclude<Language, 'auto'>

const dictionaries: Record<DictionaryLanguage, Record<string, string>> = {
    en: {
        "toc.title": "Table of Contents",
        "toc.empty": "No headings yet...",
        "toc.empty.hint": "Chat to generate structure",
        "search.placeholder": "Search headings...",
        "settings.title": "Settings",
        "settings.theme": "Theme",
        "settings.language": "Language",
        "settings.language.desc": "Interface language",
        "settings.cache": "Outline Cache",
        "settings.cache.desc": "Cache outlines for faster loading",
        "settings.cache.clear": "Clear Cache",
        "settings.cache.cleared": "Cleared!",
        "settings.cache.conversations": "Cached Conversations",
        "settings.cache.count": "{count} conversation(s) cached",
        "settings.behavior": "Behavior",
        "settings.autoExpand": "Auto-expand Turns",
        "settings.about": "About",
        "settings.version": "v0.0.1 · Table of Contents for AI Chats",
        "theme.auto": "Auto",
        "theme.light": "Light",
        "theme.dark": "Dark",
        "lang.auto": "Auto-detect",
        "history.title": "Cached Conversations",
        "history.search": "Search conversations...",
        "history.sort.date": "Sort: Date",
        "history.sort.title": "Sort: Title",
        "history.sort.length": "Sort: Length",
        "history.filter.all": "All Sources",
        "history.filter.chatgpt": "ChatGPT",
        "history.filter.gemini": "Gemini",
        "history.clear.all": "Clear All Cache",
        "history.clear.confirm": "Click again to confirm",
        "history.empty": "No cached conversations",
        "history.empty.search": "No matches found",
        "history.select": "Select a conversation",
        "history.select.hint": "Choose a cached conversation from the sidebar to preview its outline",
        "history.turns": "{count} turns",
        "history.cached": "Cached {date}",
        "history.updated": "Updated {date}",
        "date.today": "Today",
        "date.yesterday": "Yesterday",
        "date.days": "{count} days ago",
        "error.generic": "Unable to read content. This might be a restricted page or the chat hasn't loaded yet.",
        "footer.made": "Made with ❤️ for AI conversations"
    },
    'zh-Hans': {
        "toc.title": "目录",
        "toc.empty": "暂无标题...",
        "toc.empty.hint": "开始对话以生成结构",
        "search.placeholder": "搜索标题...",
        "settings.title": "设置",
        "settings.theme": "主题",
        "settings.language": "语言",
        "settings.language.desc": "界面语言",
        "settings.cache": "大纲缓存",
        "settings.cache.desc": "缓存大纲以加快加载",
        "settings.cache.clear": "清除缓存",
        "settings.cache.cleared": "已清除！",
        "settings.cache.conversations": "已缓存对话",
        "settings.cache.count": "已缓存 {count} 个对话",
        "settings.behavior": "行为",
        "settings.autoExpand": "自动展开对话",
        "settings.about": "关于",
        "settings.version": "v0.0.1 · AI对话目录",
        "theme.auto": "自动",
        "theme.light": "亮色",
        "theme.dark": "暗色",
        "lang.auto": "自动检测",
        "history.title": "已缓存对话",
        "history.search": "搜索对话...",
        "history.sort.date": "排序：日期",
        "history.sort.title": "排序：标题",
        "history.sort.length": "排序：长度",
        "history.filter.all": "所有来源",
        "history.filter.chatgpt": "ChatGPT",
        "history.filter.gemini": "Gemini",
        "history.clear.all": "清除所有缓存",
        "history.clear.confirm": "再次点击确认",
        "history.empty": "无已缓存对话",
        "history.empty.search": "未找到匹配项",
        "history.select": "选择对话",
        "history.select.hint": "从侧边栏选择已缓存的对话以预览其大纲",
        "history.turns": "{count} 轮对话",
        "history.cached": "缓存于 {date}",
        "history.updated": "更新于 {date}",
        "date.today": "今天",
        "date.yesterday": "昨天",
        "date.days": "{count} 天前",
        "error.generic": "无法读取内容。可能是受限页面或对话尚未加载。",
        "footer.made": "用 ❤️ 为 AI 对话打造"
    },
    'zh-Hant': {
        "toc.title": "目錄",
        "toc.empty": "暫無標題...",
        "toc.empty.hint": "開始對話以生成結構",
        "search.placeholder": "搜尋標題...",
        "settings.title": "設定",
        "settings.theme": "主題",
        "settings.language": "語言",
        "settings.language.desc": "介面語言",
        "settings.cache": "大綱快取",
        "settings.cache.desc": "快取大綱以加快載入",
        "settings.cache.clear": "清除快取",
        "settings.cache.cleared": "已清除！",
        "settings.cache.conversations": "已快取對話",
        "settings.cache.count": "已快取 {count} 個對話",
        "settings.behavior": "行為",
        "settings.autoExpand": "自動展開對話",
        "settings.about": "關於",
        "settings.version": "v0.0.1 · AI對話目錄",
        "theme.auto": "自動",
        "theme.light": "亮色",
        "theme.dark": "暗色",
        "lang.auto": "自動偵測",
        "history.title": "已快取對話",
        "history.search": "搜尋對話...",
        "history.sort.date": "排序：日期",
        "history.sort.title": "排序：標題",
        "history.sort.length": "排序：長度",
        "history.filter.all": "所有來源",
        "history.filter.chatgpt": "ChatGPT",
        "history.filter.gemini": "Gemini",
        "history.clear.all": "清除所有快取",
        "history.clear.confirm": "再次點擊確認",
        "history.empty": "無已快取對話",
        "history.empty.search": "未找到匹配項",
        "history.select": "選擇對話",
        "history.select.hint": "從側邊欄選擇已快取的對話以預覽其大綱",
        "history.turns": "{count} 輪對話",
        "history.cached": "快取於 {date}",
        "history.updated": "更新於 {date}",
        "date.today": "今天",
        "date.yesterday": "昨天",
        "date.days": "{count} 天前",
        "error.generic": "無法讀取內容。可能是受限頁面或對話尚未載入。",
        "footer.made": "用 ❤️ 為 AI 對話打造"
    },
    fr: {
        "toc.title": "Table des matières",
        "toc.empty": "Pas encore de titres...",
        "toc.empty.hint": "Discutez pour générer la structure",
        "search.placeholder": "Rechercher des titres...",
        "settings.title": "Paramètres",
        "settings.theme": "Thème",
        "settings.language": "Langue",
        "settings.language.desc": "Langue de l'interface",
        "settings.cache": "Cache des plans",
        "settings.cache.desc": "Mettre en cache pour un chargement rapide",
        "settings.cache.clear": "Vider le cache",
        "settings.cache.cleared": "Vidé !",
        "settings.cache.conversations": "Conversations en cache",
        "settings.cache.count": "{count} conversation(s) en cache",
        "settings.behavior": "Comportement",
        "settings.autoExpand": "Étendre automatiquement",
        "settings.about": "À propos",
        "settings.version": "v0.0.1 · Table des matières pour chats IA",
        "theme.auto": "Auto",
        "theme.light": "Clair",
        "theme.dark": "Sombre",
        "lang.auto": "Détection auto",
        "history.title": "Conversations en cache",
        "history.search": "Rechercher des conversations...",
        "history.sort.date": "Trier : Date",
        "history.sort.title": "Trier : Titre",
        "history.sort.length": "Trier : Longueur",
        "history.filter.all": "Toutes sources",
        "history.filter.chatgpt": "ChatGPT",
        "history.filter.gemini": "Gemini",
        "history.clear.all": "Vider tout le cache",
        "history.clear.confirm": "Cliquez à nouveau pour confirmer",
        "history.empty": "Aucune conversation en cache",
        "history.empty.search": "Aucun résultat",
        "history.select": "Sélectionnez une conversation",
        "history.select.hint": "Choisissez une conversation en cache dans la barre latérale",
        "history.turns": "{count} tours",
        "history.cached": "En cache {date}",
        "history.updated": "Mis à jour {date}",
        "date.today": "Aujourd'hui",
        "date.yesterday": "Hier",
        "date.days": "Il y a {count} jours",
        "error.generic": "Impossible de lire le contenu. Page restreinte ou chat non chargé.",
        "footer.made": "Fait avec ❤️ pour les conversations IA"
    },
    ru: {
        "toc.title": "Содержание",
        "toc.empty": "Пока нет заголовков...",
        "toc.empty.hint": "Начните чат для создания структуры",
        "search.placeholder": "Поиск заголовков...",
        "settings.title": "Настройки",
        "settings.theme": "Тема",
        "settings.language": "Язык",
        "settings.language.desc": "Язык интерфейса",
        "settings.cache": "Кэш структуры",
        "settings.cache.desc": "Кэшировать структуру для быстрой загрузки",
        "settings.cache.clear": "Очистить кэш",
        "settings.cache.cleared": "Очищено!",
        "settings.cache.conversations": "Кэшированные чаты",
        "settings.cache.count": "{count} чат(ов) в кэше",
        "settings.behavior": "Поведение",
        "settings.autoExpand": "Авто-раскрытие",
        "settings.about": "О программе",
        "settings.version": "v0.0.1 · Содержание для ИИ-чатов",
        "theme.auto": "Авто",
        "theme.light": "Светлая",
        "theme.dark": "Тёмная",
        "lang.auto": "Автоопределение",
        "history.title": "Кэшированные чаты",
        "history.search": "Поиск чатов...",
        "history.sort.date": "Сортировка: Дата",
        "history.sort.title": "Сортировка: Название",
        "history.sort.length": "Сортировка: Длина",
        "history.filter.all": "Все источники",
        "history.filter.chatgpt": "ChatGPT",
        "history.filter.gemini": "Gemini",
        "history.clear.all": "Очистить весь кэш",
        "history.clear.confirm": "Нажмите снова для подтверждения",
        "history.empty": "Нет кэшированных чатов",
        "history.empty.search": "Ничего не найдено",
        "history.select": "Выберите чат",
        "history.select.hint": "Выберите кэшированный чат на боковой панели",
        "history.turns": "{count} сообщений",
        "history.cached": "Кэшировано {date}",
        "history.updated": "Обновлено {date}",
        "date.today": "Сегодня",
        "date.yesterday": "Вчера",
        "date.days": "{count} дней назад",
        "error.generic": "Не удалось прочитать содержимое. Ограниченная страница или чат не загружен.",
        "footer.made": "Сделано с ❤️ для ИИ-бесед"
    },
    ja: {
        "toc.title": "目次",
        "toc.empty": "まだ見出しがありません...",
        "toc.empty.hint": "チャットして構造を生成",
        "search.placeholder": "見出しを検索...",
        "settings.title": "設定",
        "settings.theme": "テーマ",
        "settings.language": "言語",
        "settings.language.desc": "インターフェース言語",
        "settings.cache": "アウトラインキャッシュ",
        "settings.cache.desc": "高速読み込みのためにキャッシュ",
        "settings.cache.clear": "キャッシュをクリア",
        "settings.cache.cleared": "クリア済み！",
        "settings.cache.conversations": "キャッシュされた会話",
        "settings.cache.count": "{count} 件の会話がキャッシュ済み",
        "settings.behavior": "動作",
        "settings.autoExpand": "自動展開",
        "settings.about": "このアプリについて",
        "settings.version": "v0.0.1 · AIチャット用目次",
        "theme.auto": "自動",
        "theme.light": "ライト",
        "theme.dark": "ダーク",
        "lang.auto": "自動検出",
        "history.title": "キャッシュされた会話",
        "history.search": "会話を検索...",
        "history.sort.date": "並べ替え：日付",
        "history.sort.title": "並べ替え：タイトル",
        "history.sort.length": "並べ替え：長さ",
        "history.filter.all": "すべてのソース",
        "history.filter.chatgpt": "ChatGPT",
        "history.filter.gemini": "Gemini",
        "history.clear.all": "すべてのキャッシュをクリア",
        "history.clear.confirm": "確認のためにもう一度クリック",
        "history.empty": "キャッシュされた会話はありません",
        "history.empty.search": "一致するものが見つかりません",
        "history.select": "会話を選択",
        "history.select.hint": "サイドバーからキャッシュされた会話を選択してプレビュー",
        "history.turns": "{count} ターン",
        "history.cached": "{date} にキャッシュ",
        "history.updated": "{date} に更新",
        "date.today": "今日",
        "date.yesterday": "昨日",
        "date.days": "{count} 日前",
        "error.generic": "コンテンツを読み取れません。制限されたページまたはチャットがまだ読み込まれていません。",
        "footer.made": "❤️ を込めてAI会話用に作成"
    },
    ko: {
        "toc.title": "목차",
        "toc.empty": "아직 제목이 없습니다...",
        "toc.empty.hint": "채팅하여 구조 생성",
        "search.placeholder": "제목 검색...",
        "settings.title": "설정",
        "settings.theme": "테마",
        "settings.language": "언어",
        "settings.language.desc": "인터페이스 언어",
        "settings.cache": "개요 캐시",
        "settings.cache.desc": "빠른 로딩을 위해 캐시",
        "settings.cache.clear": "캐시 지우기",
        "settings.cache.cleared": "삭제됨!",
        "settings.cache.conversations": "캐시된 대화",
        "settings.cache.count": "{count}개 대화 캐시됨",
        "settings.behavior": "동작",
        "settings.autoExpand": "자동 확장",
        "settings.about": "정보",
        "settings.version": "v0.0.1 · AI 채팅용 목차",
        "theme.auto": "자동",
        "theme.light": "라이트",
        "theme.dark": "다크",
        "lang.auto": "자동 감지",
        "history.title": "캐시된 대화",
        "history.search": "대화 검색...",
        "history.sort.date": "정렬: 날짜",
        "history.sort.title": "정렬: 제목",
        "history.sort.length": "정렬: 길이",
        "history.filter.all": "모든 소스",
        "history.filter.chatgpt": "ChatGPT",
        "history.filter.gemini": "Gemini",
        "history.clear.all": "모든 캐시 지우기",
        "history.clear.confirm": "확인을 위해 다시 클릭",
        "history.empty": "캐시된 대화 없음",
        "history.empty.search": "일치하는 항목 없음",
        "history.select": "대화 선택",
        "history.select.hint": "사이드바에서 캐시된 대화를 선택하여 미리보기",
        "history.turns": "{count}개 턴",
        "history.cached": "{date}에 캐시됨",
        "history.updated": "{date}에 업데이트됨",
        "date.today": "오늘",
        "date.yesterday": "어제",
        "date.days": "{count}일 전",
        "error.generic": "콘텐츠를 읽을 수 없습니다. 제한된 페이지이거나 채팅이 아직 로드되지 않았습니다.",
        "footer.made": "❤️로 AI 대화를 위해 제작"
    }
}

// Get effective language (resolve 'auto' to actual language)
function resolveLanguage(lang: Language): DictionaryLanguage {
    if (lang === 'auto') {
        const browserLang = navigator.language
        if (browserLang.startsWith('zh')) {
            // Differentiate Traditional vs Simplified
            if (browserLang === 'zh-TW' || browserLang === 'zh-HK' || browserLang === 'zh-Hant') {
                return 'zh-Hant'
            }
            return 'zh-Hans'
        }
        if (browserLang.startsWith('fr')) return 'fr'
        if (browserLang.startsWith('ru')) return 'ru'
        if (browserLang.startsWith('ja')) return 'ja'
        if (browserLang.startsWith('ko')) return 'ko'
        return 'en'
    }
    return lang
}

// Persisted Language Store
function createLanguageStore() {
    const { subscribe, set, update } = writable<Language>('auto')

    // Load from storage
    storage.get("language").then((val) => {
        if (val && Object.keys(LANGUAGE_META).includes(val as Language)) {
            set(val as Language)
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

// Derived store that resolves 'auto' to actual language
export const effectiveLanguage = derived(languageStore, ($lang) => resolveLanguage($lang))

// Derived store for simple usage: $t('key')
export const t = derived(effectiveLanguage, ($lang) => (key: string, params?: Record<string, string | number>) => {
    let text = dictionaries[$lang][key] || dictionaries.en[key] || key
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, String(v))
        })
    }
    return text
})
