<script lang="ts">
  import "../style.css"

  import { onMount } from "svelte"

  import { languageStore, t, type Language } from "../lib/i18n"
  import {
    clearAllCachedConversations,
    getAllCachedConversations,
    storage,
    STORAGE_KEYS
  } from "../lib/storage"
  import { THEME_TOKENS, type ThemeMode } from "../lib/theme-tokens"

  let effectiveTheme: ThemeMode = "light"
  let currentLang: Language = "en"
  let tocCacheEnabled = true
  let cacheCleared = false
  let isLoaded = false
  let showCacheManager = false
  let cachedCount = 0

  $: tokens = THEME_TOKENS.generic[effectiveTheme]
  $: isDark = effectiveTheme === "dark"

  languageStore.subscribe((val) => (currentLang = val))

  onMount(async () => {
    // Detect theme FIRST to prevent flash
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      effectiveTheme = "dark"
    }

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
  }

  function openCacheManager() {
    // Open cache manager in new tab
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/history.html") })
  }
</script>

<svelte:head>
  <style>
    html,
    body {
      background: var(--bg-color);
      margin: 0;
      padding: 0;
    }
  </style>
</svelte:head>

<div
  class="min-h-screen transition-all duration-300"
  style="--bg-color: {tokens.bg}; background: {tokens.bg}; color: {tokens.text}; font-family: {tokens.font};"
  class:opacity-0={!isLoaded}
  class:opacity-100={isLoaded}>
  <div class="max-w-xl mx-auto px-6 py-12">
    <!-- Header with animation -->
    <header class="mb-10 animate-fadeIn">
      <div class="flex items-center gap-3 mb-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105"
          style="background: linear-gradient(135deg, {tokens.accent}, {isDark
            ? '#818cf8'
            : '#4f46e5'});">
          <svg
            class="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-semibold tracking-tight">
            {$t("settings.title")}
          </h1>
          <p class="text-xs" style="color: {tokens.textSecondary};">v0.0.1</p>
        </div>
      </div>
    </header>

    <!-- Settings Cards with stagger animation -->
    <div class="space-y-4">
      <!-- Language Card -->
      <div
        class="settings-card p-4 rounded-2xl transition-all duration-200 hover:shadow-lg animate-slideUp"
        style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border}; animation-delay: 0.1s;">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="icon-box"
              style="background: {isDark
                ? 'rgba(99,102,241,0.15)'
                : 'rgba(99,102,241,0.1)'}; color: {tokens.accent};">
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
                Interface language
              </div>
            </div>
          </div>
          <div
            class="flex gap-1 p-1 rounded-lg"
            style="background: {tokens.bg};">
            <button
              on:click={() => setLanguage("en")}
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
              style="background: {currentLang === 'en'
                ? tokens.accent
                : 'transparent'}; color: {currentLang === 'en'
                ? isDark
                  ? '#000'
                  : '#fff'
                : tokens.textSecondary};">
              EN
            </button>
            <button
              on:click={() => setLanguage("zh")}
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
              style="background: {currentLang === 'zh'
                ? tokens.accent
                : 'transparent'}; color: {currentLang === 'zh'
                ? isDark
                  ? '#000'
                  : '#fff'
                : tokens.textSecondary};">
              中文
            </button>
          </div>
        </div>
      </div>

      <!-- TOC Cache Toggle Card -->
      <div
        class="settings-card p-4 rounded-2xl transition-all duration-200 hover:shadow-lg animate-slideUp"
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
                Cache outlines for faster loading
              </div>
            </div>
          </div>
          <button
            on:click={toggleTocCache}
            class="toggle-switch"
            class:active={tocCacheEnabled}
            style="background: {tocCacheEnabled
              ? tokens.accent
              : tokens.border};">
            <div
              class="toggle-knob"
              style="left: {tocCacheEnabled ? '22px' : '2px'};">
            </div>
          </button>
        </div>
      </div>

      <!-- Cached Conversations Card -->
      <div
        class="settings-card p-4 rounded-2xl transition-all duration-200 hover:shadow-lg animate-slideUp cursor-pointer"
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
              <div class="font-medium text-sm">Cached Conversations</div>
              <div class="text-xs" style="color: {tokens.textSecondary};">
                {cachedCount} conversation{cachedCount !== 1 ? "s" : ""} cached
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

      <!-- Clear Cache Card -->
      <div
        class="settings-card p-4 rounded-2xl transition-all duration-200 hover:shadow-lg animate-slideUp"
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
                Remove all cached data
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
            {cacheCleared ? "✓ Cleared" : "Clear All"}
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer
      class="mt-12 text-center animate-fadeIn"
      style="animation-delay: 0.4s;">
      <p class="text-xs" style="color: {tokens.textSecondary};">
        Made with ❤️ for AI conversations
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
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
