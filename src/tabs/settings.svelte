<script lang="ts">
  import "../style.css"

  import { onMount } from "svelte"

  import logo from "../../assets/icon.svg"
  import {
    effectiveLanguage,
    LANGUAGE_META,
    languageStore,
    t,
    type Language
  } from "../lib/i18n"
  import {
    clearAllCachedConversations,
    getAllCachedConversations,
    storage,
    STORAGE_KEYS
  } from "../lib/storage"
  import { THEME_TOKENS, type ThemeMode } from "../lib/theme-tokens"

  // Detect theme BEFORE any render to prevent flash
  // Theme persistence to prevent flash
  const THEME_CACHE_KEY = "side_scribe_theme_cache"
  const getInitialTheme = (): ThemeMode => {
    // Try synchronous local storage first
    if (typeof localStorage !== "undefined") {
      const cached = localStorage.getItem(THEME_CACHE_KEY)
      if (cached === "dark" || cached === "light") return cached as ThemeMode
    }
    // Fallback to media query
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }

  let effectiveTheme: ThemeMode = getInitialTheme()

  let currentLang: Language = "auto"
  let tocCacheEnabled = true
  let cacheCleared = false
  let isLoaded = false
  let cachedCount = 0
  let langDropdownOpen = false

  $: tokens = THEME_TOKENS.generic[effectiveTheme]
  $: isDark = effectiveTheme === "dark"

  languageStore.subscribe((val) => (currentLang = val))

  onMount(async () => {
    // Load TOC cache setting
    const savedTocCache = await storage.get(STORAGE_KEYS.TOC_CACHE_ENABLED)
    if (typeof savedTocCache === "boolean") {
      tocCacheEnabled = savedTocCache
    }

    // Get cached conversation count
    const cached = await getAllCachedConversations()
    cachedCount = Object.keys(cached).length

    // Mark as loaded
    isLoaded = true

    // Close dropdown on outside click
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".lang-dropdown")) {
        langDropdownOpen = false
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  })

  async function clearCache() {
    await storage.remove(STORAGE_KEYS.EXPANDED_TURNS)
    await clearAllCachedConversations()
    cachedCount = 0
    cacheCleared = true
    setTimeout(() => (cacheCleared = false), 2000)
  }

  function toggleTocCache() {
    tocCacheEnabled = !tocCacheEnabled
    storage.set(STORAGE_KEYS.TOC_CACHE_ENABLED, tocCacheEnabled)
  }

  function setLanguage(lang: Language) {
    languageStore.set(lang)
    langDropdownOpen = false
  }

  function openCacheManager() {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/history.html") })
  }

  // Languages for dropdown - Auto and English at top, others below divider
  const topLanguages: Language[] = ["auto", "en"]
  const otherLanguages: Language[] = [
    "zh-Hans",
    "zh-Hant",
    "fr",
    "ru",
    "ja",
    "ko"
  ]
</script>

<svelte:head>
  <script>
    // Inline script to prevent theme flash - runs before render
    ;(function () {
      let theme = "light"
      try {
        const cached = localStorage.getItem("side_scribe_theme_cache")
        if (cached === "dark" || cached === "light") {
          theme = cached
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          theme = "dark"
        }
      } catch (e) {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches)
          theme = "dark"
      }

      if (theme === "dark") {
        document.documentElement.style.setProperty("--bg-color", "#212121")
        document.documentElement.style.background = "#212121"
      } else {
        document.documentElement.style.setProperty("--bg-color", "#ffffff")
        document.documentElement.style.background = "#ffffff"
      }
    })()
  </script>
  <style>
    html,
    body {
      background: var(--bg-color, #ffffff);
      margin: 0;
      padding: 0;
    }
    @media (prefers-color-scheme: dark) {
      html,
      body {
        background: #212121;
        --bg-color: #212121;
      }
    }
  </style>
</svelte:head>

<div
  class="min-h-screen transition-all duration-300"
  style="--bg-color: {tokens.bg}; background: {tokens.bg}; color: {tokens.text}; font-family: {tokens.font};"
  class:opacity-0={!isLoaded}
  class:opacity-100={isLoaded}>
  <div class="max-w-xl mx-auto px-6 py-12">
    <!-- Header -->
    <header class="mb-10 animate-fadeIn">
      <div class="flex items-center gap-3 mb-3">
        <img src={logo} alt="SideScribe Logo" class="w-10 h-10" />
        <div>
          <h1 class="text-xl font-semibold tracking-tight">
            {$t("settings.title")}
          </h1>
          <p class="text-xs" style="color: {tokens.textSecondary};">v0.0.1</p>
        </div>
      </div>
    </header>

    <!-- Settings Cards -->
    <div class="space-y-4">
      <!-- Language Card with Dropdown -->
      <div
        class="settings-card p-4 rounded-2xl transition-all duration-200 animate-slideUp"
        style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border}; animation-delay: 0.1s; position: relative; z-index: {langDropdownOpen
          ? 100
          : 1};">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="icon-box"
              style="background: {isDark
                ? 'rgba(2,133,255,0.15)'
                : 'rgba(2,133,255,0.1)'}; color: #0285ff;">
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-sm">{$t("settings.language")}</div>
              <div class="text-xs" style="color: {tokens.textSecondary};">
                {$t("settings.language.desc")}
              </div>
            </div>
          </div>

          <!-- ChatGPT-style Dropdown -->
          <div class="lang-dropdown relative">
            <button
              on:click|stopPropagation={() =>
                (langDropdownOpen = !langDropdownOpen)}
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
              style="background: {tokens.bg}; border: 1px solid {tokens.border};">
              <span>{LANGUAGE_META[currentLang].native}</span>
              <svg
                class="w-3 h-3 transition-transform"
                class:rotate-180={langDropdownOpen}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {#if langDropdownOpen}
              <div
                class="dropdown-menu absolute right-0 top-full mt-1 py-1 rounded-xl shadow-lg z-50 min-w-[180px]"
                style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border};">
                <!-- Top languages -->
                {#each topLanguages as lang}
                  <button
                    on:click={() => setLanguage(lang)}
                    class="dropdown-item w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors"
                    style="color: {tokens.text};">
                    <span>{LANGUAGE_META[lang].native}</span>
                    {#if currentLang === lang}
                      <svg
                        class="w-4 h-4"
                        style="color: {tokens.text};"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7" />
                      </svg>
                    {/if}
                  </button>
                {/each}

                <!-- Divider -->
                <div
                  class="my-1 mx-3 border-t"
                  style="border-color: {tokens.border};">
                </div>

                <!-- Other languages -->
                {#each otherLanguages as lang}
                  <button
                    on:click={() => setLanguage(lang)}
                    class="dropdown-item w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors"
                    style="color: {tokens.text};">
                    <span>{LANGUAGE_META[lang].native}</span>
                    {#if currentLang === lang}
                      <svg
                        class="w-4 h-4"
                        style="color: {tokens.text};"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7" />
                      </svg>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- TOC Cache Toggle Card -->
      <div
        class="settings-card p-4 rounded-2xl transition-all duration-200 animate-slideUp"
        style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border}; animation-delay: 0.15s;">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="icon-box"
              style="background: {isDark
                ? 'rgba(34,197,94,0.15)'
                : 'rgba(34,197,94,0.1)'}; color: #22c55e;">
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-sm">{$t("settings.cache")}</div>
              <div class="text-xs" style="color: {tokens.textSecondary};">
                {$t("settings.cache.desc")}
              </div>
            </div>
          </div>
          <button
            on:click={toggleTocCache}
            class="toggle-switch"
            style="background: {tocCacheEnabled ? '#0285ff' : '#676767'};">
            <div
              class="toggle-knob"
              style="left: {tocCacheEnabled ? '22px' : '2px'};">
            </div>
          </button>
        </div>
      </div>

      <!-- Cached Conversations Card -->
      <div
        class="settings-card p-4 rounded-2xl transition-all duration-200 cursor-pointer animate-slideUp"
        style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border}; animation-delay: 0.2s;"
        on:click={openCacheManager}
        on:keydown={(e) => e.key === "Enter" && openCacheManager()}
        role="button"
        tabindex="0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="icon-box"
              style="background: {isDark
                ? 'rgba(249,115,22,0.15)'
                : 'rgba(249,115,22,0.1)'}; color: #f97316;">
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-sm">
                {$t("settings.cache.conversations")}
              </div>
              <div class="text-xs" style="color: {tokens.textSecondary};">
                {$t("settings.cache.count", { count: cachedCount })}
              </div>
            </div>
          </div>
          <svg
            class="w-4 h-4"
            style="color: {tokens.textSecondary};"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <!-- Clear Cache Card (at bottom to prevent accidental clicks) -->
      <div
        class="settings-card p-4 rounded-2xl transition-all duration-200 animate-slideUp"
        style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border}; animation-delay: 0.25s;">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="icon-box"
              style="background: {isDark
                ? 'rgba(239,68,68,0.15)'
                : 'rgba(239,68,68,0.1)'}; color: #ef4444;">
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <div class="font-medium text-sm">
                {$t("settings.cache.clear")}
              </div>
              <div class="text-xs" style="color: {tokens.textSecondary};">
                {$t("settings.cache.clear.desc")}
              </div>
            </div>
          </div>
          <button
            on:click={clearCache}
            class="px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
            style="background: {cacheCleared
              ? '#22c55e'
              : isDark
                ? 'rgba(239,68,68,0.15)'
                : 'rgba(239,68,68,0.1)'}; color: {cacheCleared
              ? 'white'
              : '#ef4444'};">
            {cacheCleared
              ? $t("settings.cache.cleared")
              : $t("settings.cache.clear")}
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer
      class="mt-12 text-center animate-fadeIn"
      style="animation-delay: 0.4s;">
      <p class="text-xs" style="color: {tokens.textSecondary};">
        {$t("footer.made")}
      </p>
    </footer>
  </div>
</div>

<style>
  .settings-card {
    backdrop-filter: blur(10px);
  }

  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .toggle-switch {
    position: relative;
    width: 44px;
    height: 24px;
    border-radius: 12px;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }

  .toggle-knob {
    position: absolute;
    top: 2px;
    width: 20px;
    height: 20px;
    border-radius: 10px;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .dropdown-menu {
    animation: dropdownIn 0.15s ease;
  }

  .dropdown-item:hover {
    background: var(--hover-bg, rgba(128, 128, 128, 0.1));
  }

  @keyframes dropdownIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.4s ease forwards;
  }

  .animate-slideUp {
    opacity: 0;
    animation: slideUp 0.4s ease forwards;
  }
</style>
