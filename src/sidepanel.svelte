<script lang="ts">
  import "./style.css"

  import { onDestroy, onMount } from "svelte"

  import TOCItem from "./components/TOCItem.svelte"
  import { t } from "./lib/i18n"
  import {
    activeNodeId,
    expandedTurnStore,
    themeStore,
    tocStore
  } from "./lib/store"
  import {
    detectHost,
    THEME_TOKENS,
    type HostType,
    type ThemeMode
  } from "./lib/theme-tokens"
  import type { MessagePayload, TOCNode } from "./lib/types"

  let toc: TOCNode[] = []
  let activeId: string | null = null
  let searchQuery = ""
  let effectiveTheme: ThemeMode = "light"
  let chatTitle = ""

  // UI State
  let expandedTurnIds = new Set<string>()
  let expandedNodeIds = new Set<string>()
  let allExpanded = true // Default expanded

  // Host detection (from active tab)
  let host: HostType = "generic"
  let currentTabId: number | undefined

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
  themeStore.subscribe((val) => {
    effectiveTheme = val === "auto" ? "light" : val
  })
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

  function fetchTOC() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        currentTabId = tabs[0].id
        host = detectHost(tabs[0].url || "")
        // Default fallback title from tab
        chatTitle =
          tabs[0].title
            ?.replace(" | ChatGPT", "")
            .replace(" - Gemini", "")
            .trim() || ""
        // Request fresh TOC and title
        chrome.tabs
          .sendMessage(tabs[0].id, { type: "REQUEST_TOC" })
          .catch(() => {})
        // Request page title (Gemini uses specific element)
        chrome.tabs
          .sendMessage(tabs[0].id, { type: "REQUEST_TITLE" })
          .catch(() => {})
      }
    })
  }

  onMount(() => {
    chrome.runtime.onMessage.addListener((message: MessagePayload) => {
      if (message.type === "TOC_UPDATE") {
        tocStore.set(message.payload)
      } else if (message.type === "ACTIVE_CHANGE") {
        activeNodeId.set(message.payload.activeNodeId)
      } else if (message.type === "THEME_CHANGE") {
        effectiveTheme = message.payload.theme
      } else if (message.type === "TITLE_UPDATE") {
        chatTitle = message.payload.title || chatTitle
      }
    })

    // Initial fetch
    fetchTOC()

    // Listen for tab activation changes
    chrome.tabs.onActivated.addListener(fetchTOC)

    // Listen for URL changes in current tab
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tabId === currentTabId && changeInfo.url) {
        // Reset title immediately on URL change (SPA navigation)
        chatTitle = ""
        // Clear current TOC
        tocStore.set([])
        // Fetch TOC
        fetchTOC()
        // Also fetch after a delay to catch SPA DOM updates
        setTimeout(fetchTOC, 500)
        setTimeout(fetchTOC, 1500)
      }
    })
  })

  onDestroy(() => {
    chrome.tabs.onActivated.removeListener(fetchTOC)
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

  function manualRefresh() {
    fetchTOC()
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
            class="w-4 h-4"
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
        class="w-full pl-9 pr-3 py-2 text-sm focus:outline-none transition-all"
        style="
          background: {tokens.bg};
          border: 1px solid {tokens.border};
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
    {#if filteredTOC.length === 0}
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
</style>
