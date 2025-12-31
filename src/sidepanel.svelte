<script lang="ts">
  import "./style.css"

  import { onDestroy, onMount } from "svelte"

  import TOCItem from "./components/TOCItem.svelte"
  import { t } from "./lib/i18n"
  import { getCachedConversation } from "./lib/storage"
  import { activeNodeId, expandedTurnStore, tocStore } from "./lib/store"
  import {
    detectHost,
    THEME_TOKENS,
    type HostType,
    type ThemeMode
  } from "./lib/theme-tokens"
  import type { ConversationSource, MessagePayload, TOCNode } from "./lib/types"

  let toc: TOCNode[] = []
  let activeId: string | null = null
  let searchQuery = ""
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
  let chatTitle = ""
  let needsRefresh = false // True when content script is not responding

  // UI State
  let expandedTurnIds = new Set<string>()
  let expandedNodeIds = new Set<string>()
  let allExpanded = true // Default expanded

  // Host detection (from active tab)
  let host: HostType = "generic"
  let currentTabId: number | undefined
  let currentTabUrl: string = ""
  let isFromCache = false // Indicates if current TOC is from cache

  // Check if current site is supported
  $: isSupportedSite =
    currentTabUrl.includes("gemini.google.com") ||
    currentTabUrl.includes("chatgpt.com")

  $: tokens = THEME_TOKENS[host][effectiveTheme]

  // When TOC updates, auto-expand to second level
  tocStore.subscribe((value) => {
    toc = value
    // Default expand all turns (first level)
    if (value.length > 0 && expandedTurnIds.size === 0) {
      const allTurnIds = new Set(value.map((node) => node.id))
      expandedTurnStore.set(allTurnIds)
    }
  })
  activeNodeId.subscribe((val) => (activeId = val))

  expandedTurnStore.subscribe((val) => (expandedTurnIds = val))

  // Filtered View
  $: filteredTOC = searchQuery
    ? filterNodes(toc, searchQuery.toLowerCase())
    : toc

  function filterNodes(nodes: TOCNode[], query: string): TOCNode[] {
    return nodes.reduce<TOCNode[]>((acc, node) => {
      const match = node.text.toLowerCase().includes(query)
      const childMatches = node.children
        ? filterNodes(node.children, query)
        : []

      if (match || childMatches.length > 0) {
        acc.push({ ...node, children: childMatches })
        if (childMatches.length > 0) {
          if (node.type === "turn") expandedTurnStore.add(node.id)
          else expandedNodeIds.add(node.id)
        }
      }
      return acc
    }, [])
  }

  /**
   * Extract conversation ID from URL for cache lookup
   */
  function getConversationId(url: string): string | null {
    // ChatGPT: /c/{id}
    if (url.includes("chatgpt.com")) {
      const match = url.match(/\/c\/([a-f0-9-]+)/i)
      return match ? match[1] : null
    }
    // Gemini: /app/{id}
    if (url.includes("gemini.google.com")) {
      const match = url.match(/\/app\/([a-f0-9]+)/i)
      return match ? match[1] : null
    }
    return null
  }

  async function fetchTOC(clearExisting = false) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.id) {
        const tabId = tabs[0].id
        const isSwitchingTab =
          currentTabId !== undefined && currentTabId !== tabId
        // Clear state immediately if switching tabs to prevent flicker
        if (clearExisting || isSwitchingTab) {
          tocStore.set([])
          chatTitle = ""
          needsRefresh = false
          isFromCache = false
        }
        currentTabId = tabId
        currentTabUrl = tabs[0].url || ""
        host = detectHost(currentTabUrl)

        // Get initial title from tab (will be overwritten by fresh TITLE_UPDATE)
        const tabTitle =
          tabs[0].title
            ?.replace(" | ChatGPT", "")
            .replace(" - ChatGPT", "")
            .replace(" - Gemini", "")
            .trim() || ""

        // Only set if we don't have a title yet (avoid flicker)
        if (!chatTitle && tabTitle) {
          chatTitle = tabTitle
        }

        // Only try to communicate with content script on supported sites
        if (
          !currentTabUrl.includes("gemini.google.com") &&
          !currentTabUrl.includes("chatgpt.com")
        ) {
          // Not a supported site, don't try to communicate
          needsRefresh = false
          return
        }

        // Immediate Load: Try to load from cache first (only for TOC, prefer fresh title)
        const conversationId = getConversationId(currentTabUrl)
        if (conversationId) {
          const cached = await getCachedConversation(conversationId)
          if (cached && cached.toc.length > 0) {
            // Show cached TOC immediately
            tocStore.set(cached.toc)
            // Only use cached title if no tab title available
            if (!chatTitle && cached.title && cached.title !== "Untitled") {
              chatTitle = cached.title
            }
            isFromCache = true
          }
        }

        // Request fresh TOC and title, detect if content script is alive
        chrome.tabs
          .sendMessage(tabId, { type: "REQUEST_TOC" })
          .then(() => {
            // Content script responded, connection is alive
            needsRefresh = false
            isFromCache = false // Fresh data will replace cache
          })
          .catch(() => {
            // Content script not responding - likely extension was reloaded
            needsRefresh = true
          })
        // Request page title (Gemini uses specific element)
        chrome.tabs
          .sendMessage(tabId, { type: "REQUEST_TITLE" })
          .catch(() => {})
      }
    })
  }

  function refreshPage() {
    if (currentTabId) {
      chrome.tabs.reload(currentTabId).then(() => {
        needsRefresh = false
        // Wait for page to reload, then fetch TOC
        setTimeout(fetchTOC, 2000)
        setTimeout(fetchTOC, 4000)
      })
    }
  }

  // Named handler for proper cleanup
  const handleTabActivated = () => fetchTOC(true)
  const handleTabUpdated = (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo
  ) => {
    if (tabId === currentTabId && changeInfo.url) {
      // Reset state immediately on URL change (SPA navigation)
      chatTitle = ""
      isFromCache = false
      // Clear current TOC
      tocStore.set([])
      // Fetch TOC with fresh title
      fetchTOC()
      // Also fetch after a delay to catch SPA DOM updates
      setTimeout(fetchTOC, 500)
      setTimeout(fetchTOC, 1500)
    }
  }

  onMount(() => {
    chrome.runtime.onMessage.addListener((message: MessagePayload) => {
      if (message.type === "TOC_UPDATE") {
        tocStore.set(message.payload)
      } else if (message.type === "ACTIVE_CHANGE") {
        activeNodeId.set(message.payload.activeNodeId)
      } else if (message.type === "THEME_CHANGE") {
        effectiveTheme = message.payload.theme
        localStorage.setItem(THEME_CACHE_KEY, effectiveTheme)
      } else if (message.type === "TITLE_UPDATE") {
        chatTitle = message.payload.title || chatTitle
      }
    })

    // Initial fetch
    fetchTOC()

    // Listen for tab activation changes
    chrome.tabs.onActivated.addListener(handleTabActivated)

    // Listen for URL changes in current tab
    chrome.tabs.onUpdated.addListener(handleTabUpdated)
  })

  onDestroy(() => {
    chrome.tabs.onActivated.removeListener(handleTabActivated)
    chrome.tabs.onUpdated.removeListener(handleTabUpdated)
  })

  function handleJump(event: CustomEvent) {
    const { id } = event.detail
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "SCROLL_TO",
          payload: { targetId: id, type: "node" }
        })
      }
    })
  }

  function handleToggle(event: CustomEvent) {
    const { id, type } = event.detail
    if (type === "turn") {
      expandedTurnStore.toggle(id)
    } else {
      if (expandedNodeIds.has(id)) expandedNodeIds.delete(id)
      else expandedNodeIds.add(id)
      expandedNodeIds = new Set(expandedNodeIds)
    }
  }

  function toggleExpandAll() {
    if (allExpanded) {
      // Collapse all
      expandedTurnStore.set(new Set())
      expandedNodeIds = new Set()
    } else {
      // Expand all
      const allTurnIds = new Set(toc.map((node) => node.id))
      expandedTurnStore.set(allTurnIds)
      const allChildIds = new Set<string>()
      toc.forEach((node) => {
        if (node.children) {
          node.children.forEach((child) => allChildIds.add(child.id))
        }
      })
      expandedNodeIds = allChildIds
    }
    allExpanded = !allExpanded
  }

  function openSettings() {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/settings.html") })
  }

  let isRefreshing = false
  function manualRefresh() {
    isRefreshing = true
    fetchTOC()
    setTimeout(() => {
      isRefreshing = false
    }, 1000)
  }
</script>

<div
  class="flex flex-col h-screen"
  style="background: {tokens.bg}; color: {tokens.text}; font-family: {tokens.font};">
  <!-- Header -->
  <header
    class="flex-none p-4 z-10 sticky top-0"
    style="border-bottom: 1px solid {tokens.border}; background: {tokens.bgSecondary};">
    <div class="flex items-center justify-between mb-3">
      <h1
        class="text-base font-semibold tracking-tight truncate flex-1 mr-2"
        style="color: {tokens.text};"
        title={chatTitle || $t("toc.title")}>
        {chatTitle || $t("toc.title")}
      </h1>
      <div class="flex items-center gap-0.5">
        <button
          on:click={manualRefresh}
          class="p-1.5 rounded transition-colors hover:opacity-80"
          style="color: {tokens.textSecondary};"
          title="Refresh">
          <svg
            class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}"
            class:animate-spin={isRefreshing}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          on:click={toggleExpandAll}
          class="p-1.5 rounded transition-colors hover:opacity-80"
          style="color: {tokens.textSecondary};"
          title={allExpanded ? "Collapse All" : "Expand All"}>
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            {#if allExpanded}
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7" />
            {:else}
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7" />
            {/if}
          </svg>
        </button>
        <button
          on:click={openSettings}
          class="p-1.5 rounded transition-colors hover:opacity-80"
          style="color: {tokens.textSecondary};"
          title={$t("settings.title")}>
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="relative">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder={$t("search.placeholder")}
        class="search-input w-full pl-9 pr-3 py-2 text-sm transition-all"
        style="
          background: {tokens.bg};
          --border-color: {tokens.border};
          --focus-border-color: {tokens.accent};
          border-radius: 8px;
          color: {tokens.text};
        " />
      <svg
        class="w-4 h-4 absolute left-3 top-2.5"
        style="color: {tokens.textSecondary};"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  </header>

  <!-- TOC List -->
  <main class="flex-1 overflow-y-auto p-2">
    {#if !isSupportedSite}
      <div
        class="flex flex-col items-center justify-center h-64 text-sm"
        style="color: {tokens.textSecondary};">
        <span class="mb-2 text-2xl">👋</span>
        <p class="mb-2 font-medium">Unsupported Page</p>
        <p class="text-xs text-center px-4" style="opacity: 0.6;">
          SideScribe works on ChatGPT and Gemini. Navigate to a supported site
          to use this extension.
        </p>
      </div>
    {:else if needsRefresh}
      <div
        class="flex flex-col items-center justify-center h-64 text-sm"
        style="color: {tokens.textSecondary};">
        <span class="mb-2 text-2xl">⚠️</span>
        <p class="mb-2">Connection Error</p>
        <p class="text-xs mb-4" style="opacity: 0.6;">
          Please refresh the page to restore connection
        </p>
        <button
          on:click={refreshPage}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style="background: {tokens.accent}; color: {tokens.bg};">
          Refresh Page
        </button>
      </div>
    {:else if filteredTOC.length === 0}
      <div
        class="flex flex-col items-center justify-center h-64 text-sm"
        style="color: {tokens.textSecondary};">
        <span class="mb-2 text-2xl">📭</span>
        <p>{$t("toc.empty")}</p>
        {#if !searchQuery}
          <p class="text-xs mt-1" style="opacity: 0.6;">
            {$t("toc.empty.hint")}
          </p>
        {/if}
      </div>
    {:else}
      <div class="space-y-0.5">
        {#each filteredTOC as item (item.id)}
          <TOCItem
            node={item}
            {expandedTurnIds}
            {expandedNodeIds}
            activeNodeId={activeId}
            themeTokens={tokens}
            on:toggle={handleToggle}
            on:jump={handleJump} />
        {/each}
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer
    class="flex-none p-2 text-xs text-center"
    style="border-top: 1px solid {tokens.border}; color: {tokens.textSecondary};">
    SideScribe v0.0.1
  </footer>
</div>

<style>
  :global(.overflow-y-auto::-webkit-scrollbar) {
    width: 6px;
  }
  :global(.overflow-y-auto::-webkit-scrollbar-track) {
    background: transparent;
  }
  :global(.overflow-y-auto::-webkit-scrollbar-thumb) {
    background-color: rgba(128, 128, 128, 0.3);
    border-radius: 3px;
  }
  .search-input {
    border: 1px solid var(--border-color);
    outline: none;
  }
  .search-input:focus {
    border-color: var(--focus-border-color);
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
