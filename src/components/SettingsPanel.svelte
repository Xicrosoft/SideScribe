<script lang="ts">
  import { t } from "../lib/i18n"
  import { storage, STORAGE_KEYS } from "../lib/storage"
  import { languageStore, settingsStore } from "../lib/store"

  let cacheCleared = false

  async function clearCache() {
    await storage.remove(STORAGE_KEYS.EXPANDED_TURNS)
    // Potentially other cache keys in future
    cacheCleared = true
    setTimeout(() => (cacheCleared = false), 2000)
  }
</script>

<div
  class="p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
    {$t("settings.title")}
  </h3>

  <!-- Language -->
  <div class="flex items-center justify-between">
    <span class="text-sm text-gray-700 dark:text-gray-300"
      >{$t("settings.language")}</span>
    <select
      bind:value={$languageStore}
      class="text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  </div>

  <!-- Behavior -->
  <div class="flex items-center justify-between">
    <span class="text-sm text-gray-700 dark:text-gray-300"
      >{$t("settings.autoExpand")}</span>
    <input
      type="checkbox"
      bind:checked={$settingsStore.autoExpand}
      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
  </div>

  <!-- Cache -->
  <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
    <button
      on:click={clearCache}
      class="w-full text-xs py-2 px-3 rounded bg-white hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 transition-colors">
      {cacheCleared ? $t("settings.cache.cleared") : $t("settings.cache.clear")}
    </button>
  </div>
</div>
