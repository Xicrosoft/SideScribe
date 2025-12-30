<script lang="ts">
  import "../style.css"

  import { onMount } from "svelte"

  import { languageStore, t, type Language } from "../lib/i18n"
  import { storage, STORAGE_KEYS } from "../lib/storage"
  import { THEME_TOKENS, type ThemeMode } from "../lib/theme-tokens"

  let effectiveTheme: ThemeMode = "light"
  let currentLang: Language = "en"
  let tocCacheEnabled = true
  let cacheCleared = false
  let isLoaded = false

  $: tokens = THEME_TOKENS.generic[effectiveTheme]

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

    // Mark as loaded
    isLoaded = true
  })

  async function clearCache() {
    await storage.remove(STORAGE_KEYS.EXPANDED_TURNS)
    await storage.remove(STORAGE_KEYS.CACHED_CONVERSATIONS)
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
</script>

<div
  class="min-h-screen p-8 transition-opacity duration-200"
  style="background: {tokens.bg}; color: {tokens.text}; font-family: {tokens.font}; opacity: {isLoaded
    ? 1
    : 0};">
  <div class="max-w-2xl mx-auto">
    <header class="mb-8">
      <h1 class="text-2xl font-bold mb-2">SideScribe Settings</h1>
      <p class="text-sm" style="color: {tokens.textSecondary};">
        Configure your SideScribe experience
      </p>
    </header>

    <!-- Appearance Section -->
    <section class="mb-8">
      <h2
        class="text-sm font-semibold uppercase tracking-wider mb-4"
        style="color: {tokens.textSecondary};">
        Appearance
      </h2>
      <div
        class="space-y-4 p-4 rounded-lg"
        style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border};">
        <!-- Language -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">{$t("settings.language")}</div>
            <div class="text-xs" style="color: {tokens.textSecondary};">
              Select your preferred language
            </div>
          </div>
          <div
            class="flex gap-1 p-1 rounded-lg"
            style="background: {tokens.bg};">
            <button
              on:click={() => setLanguage("en")}
              class="px-3 py-1.5 text-sm rounded-md transition-colors"
              style="background: {currentLang === 'en'
                ? tokens.accent
                : 'transparent'}; color: {currentLang === 'en'
                ? tokens.bg
                : tokens.text};">
              English
            </button>
            <button
              on:click={() => setLanguage("zh")}
              class="px-3 py-1.5 text-sm rounded-md transition-colors"
              style="background: {currentLang === 'zh'
                ? tokens.accent
                : 'transparent'}; color: {currentLang === 'zh'
                ? tokens.bg
                : tokens.text};">
              中文
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Behavior Section -->
    <section class="mb-8">
      <h2
        class="text-sm font-semibold uppercase tracking-wider mb-4"
        style="color: {tokens.textSecondary};">
        Behavior
      </h2>
      <div
        class="space-y-4 p-4 rounded-lg"
        style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border};">
        <!-- TOC Cache Toggle -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">{$t("settings.cache")}</div>
            <div class="text-xs" style="color: {tokens.textSecondary};">
              Cache conversation outlines for faster loading
            </div>
          </div>
          <button
            on:click={toggleTocCache}
            class="relative w-12 h-6 rounded-full transition-colors"
            style="background: {tocCacheEnabled
              ? tokens.accent
              : tokens.border};">
            <div
              class="absolute top-1 w-4 h-4 rounded-full transition-transform"
              style="
                background: {tokens.bg};
                left: {tocCacheEnabled ? '26px' : '4px'};
              ">
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- Data Section -->
    <section class="mb-8">
      <h2
        class="text-sm font-semibold uppercase tracking-wider mb-4"
        style="color: {tokens.textSecondary};">
        Data
      </h2>
      <div
        class="p-4 rounded-lg"
        style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border};">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">{$t("settings.cache.clear")}</div>
            <div class="text-xs" style="color: {tokens.textSecondary};">
              Remove all cached expansion states
            </div>
          </div>
          <button
            on:click={clearCache}
            class="px-4 py-2 text-sm rounded-lg transition-colors"
            style="
              background: {cacheCleared ? tokens.accent : tokens.hover};
              color: {cacheCleared ? tokens.bg : tokens.text};
            ">
            {cacheCleared
              ? $t("settings.cache.cleared")
              : $t("settings.cache.clear")}
          </button>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section>
      <h2
        class="text-sm font-semibold uppercase tracking-wider mb-4"
        style="color: {tokens.textSecondary};">
        About
      </h2>
      <div
        class="p-4 rounded-lg"
        style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border};">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            style="background: {tokens.accentBg}; color: {tokens.accent};">
            <svg
              class="w-6 h-6"
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
            <div class="font-semibold">SideScribe</div>
            <div class="text-xs" style="color: {tokens.textSecondary};">
              v0.0.1 · Table of Contents for AI Chats
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>
