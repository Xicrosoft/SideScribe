<script lang="ts">
  import { t } from "../lib/i18n"
  import { THEME_TOKENS, type ThemeMode } from "../lib/theme-tokens"

  export let show = false
  export let currentVersion = ""
  export let latestVersion = ""
  export let releaseNotes = ""
  export let downloadUrl = ""
  export let onDismiss: () => void = () => {}
  export let theme: ThemeMode = "dark"

  $: tokens = THEME_TOKENS.generic[theme]

  function handleDownload() {
    if (downloadUrl) window.open(downloadUrl, "_blank")
  }
</script>

{#if show}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style="background: rgba(0,0,0,0.5);">
    <div
      class="max-w-md w-full rounded-2xl p-6 shadow-2xl"
      style="background: {tokens.bg}; border: 1px solid {tokens.border};">
      <!-- Header -->
      <h2 class="text-lg font-semibold mb-4" style="color: {tokens.text};">
        {$t("update.modal.title")}
      </h2>

      <!-- Version Info -->
      <div
        class="flex gap-4 mb-4 p-3 rounded-xl"
        style="background: {tokens.bgSecondary};">
        <div class="flex-1 text-center">
          <div class="text-xs mb-1" style="color: {tokens.textSecondary};">
            {$t("update.modal.current")}
          </div>
          <div class="font-mono text-sm" style="color: {tokens.text};">
            {currentVersion}
          </div>
        </div>
        <div class="flex items-center" style="color: {tokens.textSecondary};">
          →
        </div>
        <div class="flex-1 text-center">
          <div class="text-xs mb-1" style="color: {tokens.textSecondary};">
            {$t("update.modal.latest")}
          </div>
          <div class="font-mono text-sm font-semibold" style="color: #22c55e;">
            {latestVersion}
          </div>
        </div>
      </div>

      <!-- Release Notes -->
      {#if releaseNotes}
        <div class="mb-4">
          <div
            class="text-xs font-medium mb-2"
            style="color: {tokens.textSecondary};">
            {$t("update.modal.notes")}
          </div>
          <div
            class="max-h-40 overflow-y-auto p-3 rounded-lg text-sm whitespace-pre-wrap"
            style="background: {tokens.bgSecondary}; color: {tokens.text};">
            {releaseNotes}
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex gap-3 justify-end">
        <button
          on:click={onDismiss}
          class="px-4 py-2 text-sm rounded-lg transition-colors"
          style="background: {tokens.bgSecondary}; color: {tokens.textSecondary}; border: 1px solid {tokens.border};">
          {$t("update.modal.dismiss")}
        </button>
        <button
          on:click={handleDownload}
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style="background: #3b82f6; color: white;">
          {$t("update.modal.download")}
        </button>
      </div>
    </div>
  </div>
{/if}
