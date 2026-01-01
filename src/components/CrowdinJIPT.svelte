<script lang="ts">
  /**
   * Crowdin In-Context Localization Script Injector
   * Only loads when isTranslationMode is true (ach-UG language)
   */
  import { onDestroy, onMount } from "svelte"

  import { isTranslationMode } from "../lib/i18n"

  let scriptElement: HTMLScriptElement | null = null
  let configScript: HTMLScriptElement | null = null
  let unsubscribe: (() => void) | null = null

  onMount(() => {
    unsubscribe = isTranslationMode.subscribe((enabled) => {
      if (enabled && !scriptElement) {
        // Add config script
        configScript = document.createElement("script")
        configScript.type = "text/javascript"
        configScript.textContent = `var _jipt = []; _jipt.push(['project', 'side-scribe']);`
        document.head.appendChild(configScript)

        // Add JIPT script
        scriptElement = document.createElement("script")
        scriptElement.type = "text/javascript"
        scriptElement.src = "//cdn.crowdin.com/jipt/jipt.js"
        document.head.appendChild(scriptElement)
      } else if (!enabled && scriptElement) {
        // Remove scripts when translation mode is disabled
        if (scriptElement.parentNode) {
          scriptElement.parentNode.removeChild(scriptElement)
        }
        if (configScript?.parentNode) {
          configScript.parentNode.removeChild(configScript)
        }
        scriptElement = null
        configScript = null
      }
    })
  })

  onDestroy(() => {
    if (unsubscribe) unsubscribe()
    // Clean up scripts
    if (scriptElement?.parentNode) {
      scriptElement.parentNode.removeChild(scriptElement)
    }
    if (configScript?.parentNode) {
      configScript.parentNode.removeChild(configScript)
    }
  })
</script>

<!-- This component has no visible UI, it only injects scripts -->
