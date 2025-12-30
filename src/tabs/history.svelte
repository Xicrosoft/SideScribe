<script lang="ts">
  import "../style.css"

  import { onMount } from "svelte"

  import {
    clearAllCachedConversations,
    deleteCachedConversation,
    getAllCachedConversations
  } from "../lib/storage"
  import { THEME_TOKENS, type ThemeMode } from "../lib/theme-tokens"
  import type {
    CachedConversation,
    ConversationSource,
    TOCNode
  } from "../lib/types"

  let effectiveTheme: ThemeMode = "light"
  let isLoaded = false
  let conversations: CachedConversation[] = []
  let searchQuery = ""
  let sortBy: "date" | "title" | "length" = "date"
  let filterSource: ConversationSource | "all" = "all"
  let selectedConversation: CachedConversation | null = null
  let confirmClearAll = false

  $: tokens = THEME_TOKENS.generic[effectiveTheme]
  $: isDark = effectiveTheme === "dark"

  // Filter and sort conversations
  $: filteredConversations = conversations
    .filter((conv) => {
      // Source filter
      if (filterSource !== "all" && conv.source !== filterSource) return false
      // Search filter (fuzzy)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          conv.title.toLowerCase().includes(query) ||
          conv.toc.some((t) => t.text.toLowerCase().includes(query))
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return b.lastUpdated - a.lastUpdated
        case "title":
          return a.title.localeCompare(b.title)
        case "length":
          return b.messageCount - a.messageCount
        default:
          return 0
      }
    })

  onMount(async () => {
    // Detect theme
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      effectiveTheme = "dark"
    }

    await loadConversations()
    isLoaded = true
  })

  async function loadConversations() {
    const cached = await getAllCachedConversations()
    conversations = Object.values(cached)
  }

  async function handleDelete(id: string) {
    await deleteCachedConversation(id)
    conversations = conversations.filter((c) => c.id !== id)
    if (selectedConversation?.id === id) {
      selectedConversation = null
    }
  }

  async function handleClearAll() {
    if (confirmClearAll) {
      await clearAllCachedConversations()
      conversations = []
      selectedConversation = null
      confirmClearAll = false
    } else {
      confirmClearAll = true
      setTimeout(() => (confirmClearAll = false), 3000)
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  function getSourceIcon(source: ConversationSource) {
    return source === "chatgpt" ? "🤖" : "✨"
  }

  function flattenTOC(nodes: TOCNode[]): TOCNode[] {
    return nodes.flatMap((n) => [
      n,
      ...(n.children ? flattenTOC(n.children) : [])
    ])
  }
</script>

<svelte:head>
  <style>
    html,
    body {
      background: var(--bg-color);
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>
</svelte:head>

<div
  class="h-screen flex transition-all duration-300"
  style="--bg-color: {tokens.bg}; background: {tokens.bg}; color: {tokens.text}; font-family: {tokens.font};"
  class:opacity-0={!isLoaded}
  class:opacity-100={isLoaded}>
  <!-- Sidebar: Conversation List -->
  <aside
    class="w-80 flex-shrink-0 border-r flex flex-col"
    style="border-color: {tokens.border}; background: {tokens.bgSecondary};">
    <!-- Header -->
    <div class="p-4 border-b" style="border-color: {tokens.border};">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <button
            on:click={() => history.back()}
            class="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style="color: {tokens.textSecondary};">
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 class="font-semibold">Cached Conversations</h1>
        </div>
        <span
          class="text-xs px-2 py-1 rounded-full"
          style="background: {tokens.hover}; color: {tokens.textSecondary};">
          {conversations.length}
        </span>
      </div>

      <!-- Search -->
      <div class="relative mb-3">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search conversations..."
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors"
          style="background: {tokens.bg}; border-color: {tokens.border}; color: {tokens.text};" />
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

      <!-- Filters -->
      <div class="flex gap-2 mb-3">
        <select
          bind:value={sortBy}
          class="flex-1 text-xs px-2 py-1.5 rounded-lg border"
          style="background: {tokens.bg}; border-color: {tokens.border}; color: {tokens.text};">
          <option value="date">Sort: Date</option>
          <option value="title">Sort: Title</option>
          <option value="length">Sort: Length</option>
        </select>
        <select
          bind:value={filterSource}
          class="flex-1 text-xs px-2 py-1.5 rounded-lg border"
          style="background: {tokens.bg}; border-color: {tokens.border}; color: {tokens.text};">
          <option value="all">All Sources</option>
          <option value="chatgpt">ChatGPT</option>
          <option value="gemini">Gemini</option>
        </select>
      </div>

      <!-- Clear All Button -->
      {#if conversations.length > 0}
        <button
          on:click={handleClearAll}
          class="w-full text-xs py-2 rounded-lg transition-colors"
          style="background: {confirmClearAll
            ? '#ef4444'
            : tokens.hover}; color: {confirmClearAll ? 'white' : '#ef4444'};">
          {confirmClearAll ? "Click again to confirm" : "Clear All Cache"}
        </button>
      {/if}
    </div>

    <!-- Conversation List -->
    <div class="flex-1 overflow-y-auto">
      {#if filteredConversations.length === 0}
        <div
          class="flex flex-col items-center justify-center h-full text-sm"
          style="color: {tokens.textSecondary};">
          <span class="text-3xl mb-2">📭</span>
          <p>{searchQuery ? "No matches found" : "No cached conversations"}</p>
        </div>
      {:else}
        <div class="p-2 space-y-1">
          {#each filteredConversations as conv (conv.id)}
            <button
              on:click={() => (selectedConversation = conv)}
              class="w-full text-left p-3 rounded-xl transition-all duration-150"
              style="background: {selectedConversation?.id === conv.id
                ? tokens.hover
                : 'transparent'};">
              <div class="flex items-start gap-2">
                <span class="text-lg flex-shrink-0"
                  >{getSourceIcon(conv.source)}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate">
                    {conv.title || "Untitled"}
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      class="text-xs"
                      style="color: {tokens.textSecondary};">
                      {conv.messageCount} turns
                    </span>
                    <span class="text-xs" style="color: {tokens.textSecondary};"
                      >•</span>
                    <span
                      class="text-xs"
                      style="color: {tokens.textSecondary};">
                      {formatDate(conv.lastUpdated)}
                    </span>
                  </div>
                </div>
                <button
                  on:click|stopPropagation={() => handleDelete(conv.id)}
                  class="p-1 rounded opacity-0 hover:opacity-100 transition-opacity"
                  style="color: {tokens.textSecondary};">
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </aside>

  <!-- Main Content: TOC Preview -->
  <main class="flex-1 overflow-y-auto p-6">
    {#if selectedConversation}
      <div class="max-w-2xl mx-auto">
        <header class="mb-6">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl"
              >{getSourceIcon(selectedConversation.source)}</span>
            <h2 class="text-xl font-semibold">
              {selectedConversation.title || "Untitled"}
            </h2>
          </div>
          <div
            class="flex items-center gap-3 text-sm"
            style="color: {tokens.textSecondary};">
            <span>{selectedConversation.messageCount} conversation turns</span>
            <span>•</span>
            <span>Cached {formatDate(selectedConversation.cachedAt)}</span>
            <span>•</span>
            <span>Updated {formatDate(selectedConversation.lastUpdated)}</span>
          </div>
        </header>

        <div class="space-y-2">
          {#each selectedConversation.toc as turn, i}
            <div
              class="p-4 rounded-xl"
              style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border};">
              <div class="flex items-start gap-3">
                <span
                  class="text-xs font-mono px-2 py-0.5 rounded"
                  style="background: {tokens.hover}; color: {tokens.textSecondary};">
                  {i + 1}
                </span>
                <div class="flex-1">
                  <div class="font-medium text-sm">{turn.text}</div>
                  {#if turn.children && turn.children.length > 0}
                    <div
                      class="mt-2 pl-3 border-l-2 space-y-1"
                      style="border-color: {tokens.border};">
                      {#each turn.children as child}
                        <div
                          class="text-xs"
                          style="color: {tokens.textSecondary};">
                          {child.text}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div
        class="flex flex-col items-center justify-center h-full"
        style="color: {tokens.textSecondary};">
        <span class="text-5xl mb-4">📋</span>
        <h2 class="text-lg font-medium mb-2">Select a conversation</h2>
        <p class="text-sm">
          Choose a cached conversation from the sidebar to preview its outline
        </p>
      </div>
    {/if}
  </main>
</div>

<style>
  /* Custom scrollbar */
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

  /* Show delete button on hover */
  button:has(+ button):hover + button,
  button:hover svg.w-4 {
    opacity: 1;
  }

  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 12px;
    padding-right: 24px;
  }
</style>
