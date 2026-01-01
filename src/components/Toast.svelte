<script lang="ts">
  import { onMount } from "svelte"

  import type { ThemeMode } from "../lib/theme-tokens"
  import { THEME_TOKENS } from "../lib/theme-tokens"

  export let message: string
  export let type: "info" | "success" | "error" = "info"
  export let theme: ThemeMode = "light"
  export let duration: number = 3000
  export let onClose: () => void = () => {}

  let visible = true

  $: tokens = THEME_TOKENS.generic[theme]
  $: bgColor =
    type === "error" ? "#ef4444" : type === "success" ? "#22c55e" : "#3b82f6"

  onMount(() => {
    const timer = setTimeout(() => {
      visible = false
      setTimeout(onClose, 300)
    }, duration)
    return () => clearTimeout(timer)
  })
</script>

{#if visible}
  <div
    class="toast fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50"
    style="background: {bgColor}; color: white;">
    <span class="text-sm">{message}</span>
    <button
      on:click={() => {
        visible = false
        onClose()
      }}
      class="opacity-70 hover:opacity-100 transition-opacity">
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
{/if}

<style>
  .toast {
    animation: slideIn 0.3s ease;
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
