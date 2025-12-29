<script lang="ts">
  import { createEventDispatcher } from "svelte"
  import { slide } from "svelte/transition"

  import type { TOCNode } from "../lib/types"

  export let node: TOCNode
  export let expandedTurnIds: Set<string>
  export let expandedNodeIds: Set<string>
  export let activeNodeId: string | null = null
  export let themeTokens: {
    bg: string
    bgSecondary: string
    text: string
    textSecondary: string
    border: string
    accent: string
    accentBg: string
    hover: string
    active: string
    radius: string
    font: string
  } | null = null

  const dispatch = createEventDispatcher()

  $: isActive = activeNodeId === node.id
  $: isExpanded =
    node.type === "turn"
      ? expandedTurnIds.has(node.id)
      : expandedNodeIds.has(node.id)
  $: hasChildren = node.children && node.children.length > 0

  // Styling
  $: bgActive = themeTokens?.accentBg || "rgba(59, 130, 246, 0.1)"
  $: colorActive = themeTokens?.accent || "#3b82f6"
  $: colorText = themeTokens?.text || "#111"
  $: colorSecondary = themeTokens?.textSecondary || "#666"
  $: bgHover = themeTokens?.hover || "#f3f4f6"
  $: borderColor = themeTokens?.border || "#e5e7eb"

  // Turns are bold, same font size as regular items
  $: isTurn = node.type === "turn"

  let isHovered = false

  function toggleExpand(e: MouseEvent) {
    e.stopPropagation()
    dispatch("toggle", { id: node.id, type: node.type })
  }

  function handleJump() {
    dispatch("jump", { id: node.id })
  }
</script>

<div
  class="toc-item"
  style="font-size: 13px; {isTurn ? 'margin-bottom: 8px;' : ''}">
  <!-- Node Row -->
  <div
    role="button"
    tabindex="0"
    class="flex items-center relative cursor-pointer transition-all duration-150"
    style="
      min-height: 30px;
      padding-left: {(isTurn ? 0 : node.level * 8) + 4}px;
      padding-right: 8px;
      border-radius: 6px;
      background: {isActive ? bgActive : isHovered ? bgHover : 'transparent'};
      color: {isActive ? colorActive : colorText};
    "
    on:click={handleJump}
    on:keydown={(e) => e.key === "Enter" && handleJump()}
    on:mouseenter={() => (isHovered = true)}
    on:mouseleave={() => (isHovered = false)}>
    <!-- Active Accent Bar -->
    {#if isActive}
      <div
        style="
          position: absolute;
          left: 0;
          top: 4px;
          bottom: 4px;
          width: 3px;
          background: {colorActive};
          border-radius: 0 2px 2px 0;
        ">
      </div>
    {/if}

    <!-- Expand Icon -->
    {#if hasChildren}
      <button
        class="flex items-center justify-center transition-colors"
        style="
          width: 18px;
          height: 18px;
          margin-right: 4px;
          color: {colorSecondary};
          background: none;
          border: none;
          cursor: pointer;
        "
        on:click={toggleExpand}>
        <svg
          style="
            width: 10px;
            height: 10px;
            transition: transform 0.2s;
            transform: rotate({isExpanded ? 90 : 0}deg);
          "
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7" />
        </svg>
      </button>
    {:else}
      <span style="width: 22px; display: inline-block;"></span>
    {/if}

    <!-- Content -->
    <span
      class="truncate flex-1 select-none"
      style="
        padding: 4px 0;
        font-weight: {isTurn ? '600' : 'normal'};
        font-size: 13px;
      "
      title={node.text}>
      {node.text}
    </span>
  </div>

  <!-- Recursive Children -->
  {#if hasChildren && isExpanded}
    <div
      transition:slide|local={{ duration: 200 }}
      style="margin-left: 4px; padding-left: 8px; border-left: 1px solid {borderColor};">
      {#each node.children as child (child.id)}
        <svelte:self
          node={child}
          {expandedTurnIds}
          {expandedNodeIds}
          {activeNodeId}
          {themeTokens}
          on:toggle
          on:jump />
      {/each}
    </div>
  {/if}
</div>
