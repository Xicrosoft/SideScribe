<script lang="ts">
  import "../style.css"

  import { onMount } from "svelte"

  import { effectiveLanguage, t } from "../lib/i18n"
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

  // Detect theme BEFORE render to prevent flash
  let effectiveTheme: ThemeMode =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"

  let isLoaded = false
  let conversations: CachedConversation[] = []
  let searchQuery = ""
  let sortBy: "date" | "title" | "length" = "date"
  let filterSource: ConversationSource | "all" = "all"
  let selectedConversation: CachedConversation | null = null
  let confirmClearAll = false

  // Dropdown states
  let sortDropdownOpen = false
  let filterDropdownOpen = false

  $: tokens = THEME_TOKENS.generic[effectiveTheme]
  $: isDark = effectiveTheme === "dark"

  // Filter and sort conversations
  $: filteredConversations = conversations
    .filter((conv) => {
      if (filterSource !== "all" && conv.source !== filterSource) return false
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

  // Sort/filter options
  const sortOptions = [
    { value: "date", key: "history.sort.date" },
    { value: "title", key: "history.sort.title" },
    { value: "length", key: "history.sort.length" }
  ] as const

  const filterOptions = [
    { value: "all", key: "history.filter.all" },
    { value: "chatgpt", key: "history.filter.chatgpt" },
    { value: "gemini", key: "history.filter.gemini" }
  ] as const

  onMount(async () => {
    await loadConversations()
    isLoaded = true

    // Close dropdowns on outside click
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".sort-dropdown")) sortDropdownOpen = false
      if (!target.closest(".filter-dropdown")) filterDropdownOpen = false
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
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

    if (diffDays === 0) return $t("date.today")
    if (diffDays === 1) return $t("date.yesterday")
    if (diffDays < 7) return $t("date.days", { count: diffDays })
    return date.toLocaleDateString()
  }

  function getSourceIcon(source: ConversationSource) {
    return source === "chatgpt" ? "🤖" : "✨"
  }
</script>

<svelte:head>
  <script>
    ;(function () {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
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
      overflow: hidden;
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
  class="h-screen flex transition-all duration-300"
  style="--bg-color: {tokens.bg}; background: {tokens.bg}; color: {tokens.text}; font-family: {tokens.font};"
  class:opacity-0={!isLoaded}
  class:opacity-100={isLoaded}>
  <!-- Sidebar -->
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
          <h1 class="font-semibold">{$t("history.title")}</h1>
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
          placeholder={$t("history.search")}
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

      <!-- Custom Dropdowns -->
      <div class="flex gap-2 mb-3">
        <!-- Sort Dropdown -->
        <div class="sort-dropdown relative flex-1">
          <button
            on:click|stopPropagation={() => {
              sortDropdownOpen = !sortDropdownOpen
              filterDropdownOpen = false
            }}
            class="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg border"
            style="background: {tokens.bg}; border-color: {tokens.border}; color: {tokens.text};">
            <span
              >{$t(
                sortOptions.find((o) => o.value === sortBy)?.key ||
                  "history.sort.date"
              )}</span>
            <svg
              class="w-3 h-3 transition-transform"
              class:rotate-180={sortDropdownOpen}
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
          {#if sortDropdownOpen}
            <div
              class="dropdown-menu absolute left-0 top-full mt-1 py-1 rounded-xl shadow-lg z-50 w-full"
              style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border};">
              {#each sortOptions as opt}
                <button
                  on:click={() => {
                    sortBy = opt.value
                    sortDropdownOpen = false
                  }}
                  class="dropdown-item w-full text-left px-3 py-2 text-xs flex items-center justify-between"
                  style="color: {tokens.text};">
                  <span>{$t(opt.key)}</span>
                  {#if sortBy === opt.value}
                    <svg
                      class="w-3 h-3"
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

        <!-- Filter Dropdown -->
        <div class="filter-dropdown relative flex-1">
          <button
            on:click|stopPropagation={() => {
              filterDropdownOpen = !filterDropdownOpen
              sortDropdownOpen = false
            }}
            class="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg border"
            style="background: {tokens.bg}; border-color: {tokens.border}; color: {tokens.text};">
            <span
              >{$t(
                filterOptions.find((o) => o.value === filterSource)?.key ||
                  "history.filter.all"
              )}</span>
            <svg
              class="w-3 h-3 transition-transform"
              class:rotate-180={filterDropdownOpen}
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
          {#if filterDropdownOpen}
            <div
              class="dropdown-menu absolute left-0 top-full mt-1 py-1 rounded-xl shadow-lg z-50 w-full"
              style="background: {tokens.bgSecondary}; border: 1px solid {tokens.border};">
              {#each filterOptions as opt}
                <button
                  on:click={() => {
                    filterSource = opt.value
                    filterDropdownOpen = false
                  }}
                  class="dropdown-item w-full text-left px-3 py-2 text-xs flex items-center justify-between"
                  style="color: {tokens.text};">
                  <span>{$t(opt.key)}</span>
                  {#if filterSource === opt.value}
                    <svg
                      class="w-3 h-3"
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

      <!-- Clear All (at bottom) -->
      {#if conversations.length > 0}
        <button
          on:click={handleClearAll}
          class="w-full text-xs py-2 rounded-lg transition-colors"
          style="background: {confirmClearAll
            ? '#ef4444'
            : tokens.hover}; color: {confirmClearAll ? 'white' : '#ef4444'};">
          {confirmClearAll
            ? $t("history.clear.confirm")
            : $t("history.clear.all")}
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
          <p>
            {searchQuery ? $t("history.empty.search") : $t("history.empty")}
          </p>
        </div>
      {:else}
        <div class="p-2 space-y-1">
          {#each filteredConversations as conv (conv.id)}
            <button
              on:click={() => (selectedConversation = conv)}
              class="conv-item w-full text-left p-3 rounded-xl transition-all duration-150"
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
                      {$t("history.turns", { count: conv.messageCount })}
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
                  class="delete-btn p-1 rounded transition-opacity"
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

  <!-- Main Content -->
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
            <span
              >{$t("history.turns", {
                count: selectedConversation.messageCount
              })}</span>
            <span>•</span>
            <span
              >{$t("history.cached", {
                date: formatDate(selectedConversation.cachedAt)
              })}</span>
            <span>•</span>
            <span
              >{$t("history.updated", {
                date: formatDate(selectedConversation.lastUpdated)
              })}</span>
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
        <h2 class="text-lg font-medium mb-2">{$t("history.select")}</h2>
        <p class="text-sm">{$t("history.select.hint")}</p>
      </div>
    {/if}
  </main>
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

  .delete-btn {
    opacity: 0;
  }
  .conv-item:hover .delete-btn {
    opacity: 1;
  }

  .dropdown-menu {
    animation: dropdownIn 0.15s ease;
  }

  .dropdown-item:hover {
    background: rgba(128, 128, 128, 0.1);
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
</style>
