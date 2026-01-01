import type { PlasmoCSConfig } from "plasmo"

import { AdapterRegistry } from "../adapters/registry"
import { initSentry } from "../lib/sentry"
import type {
  ConversationSource,
  MessagePayload,
  ScrollToPayload,
  TOCNode
} from "../lib/types"

initSentry("content")

export const config: PlasmoCSConfig = {
  matches: ["https://gemini.google.com/*", "https://chatgpt.com/*"],
  run_at: "document_idle"
}

console.log("SideScribe Content Script Loaded")

const registry = new AdapterRegistry()

// ============================================
// Conversation ID Extraction
// ============================================

/**
 * Extract conversation ID and source from current URL
 * ChatGPT: https://chatgpt.com/c/{conversationId}
 * Gemini: https://gemini.google.com/app/{conversationId}
 */
function getConversationInfo(): {
  id: string | null
  source: ConversationSource
} {
  const url = window.location.href
  const hostname = window.location.hostname

  // ChatGPT: /c/{id}
  if (hostname === "chatgpt.com" || hostname === "chat.openai.com") {
    const match = url.match(/\/c\/([a-f0-9-]+)/i)
    return { id: match ? match[1] : null, source: "chatgpt" }
  }

  // Gemini: /app/{id}
  if (hostname === "gemini.google.com") {
    const match = url.match(/\/app\/([a-f0-9]+)/i)
    return { id: match ? match[1] : null, source: "gemini" }
  }

  return { id: null, source: "chatgpt" }
}

// Track current conversation for cache operations
let currentConversationId: string | null = null
let currentSource: ConversationSource = "chatgpt"
let currentTitle: string = ""

// ============================================
// Messaging Helpers
// ============================================

const safeSendMessage = (message: MessagePayload) => {
  if (chrome.runtime?.id) {
    chrome.runtime.sendMessage(message).catch((err) => {
      if (
        err.message.includes("Extension context invalidated") ||
        err.message.includes("closed")
      )
        return
      console.warn("SideScribe Message Error:", err)
    })
  }
}

// Timeout mechanism
let detectionTimeout: number | null = null

registry.init(
  window.location.href,
  (result) => {
    // Clear timeout on success
    if (detectionTimeout) {
      clearTimeout(detectionTimeout)
      detectionTimeout = null
    }

    // Update conversation info
    const convInfo = getConversationInfo()
    currentConversationId = convInfo.id
    currentSource = convInfo.source

    // On TOC Update, send to background/sidepanel
    safeSendMessage({
      type: "TOC_UPDATE",
      payload: result.toc
    })

    // Also send title update
    sendTitleUpdate()

    // Send cache update if we have a valid conversation ID
    if (currentConversationId && result.toc.length > 0) {
      safeSendMessage({
        type: "CACHE_UPDATE",
        payload: {
          id: currentConversationId,
          title: currentTitle || "Untitled",
          source: currentSource,
          toc: result.toc,
          messageCount: result.toc.length
        }
      })
    }
  },
  (activeId) => {
    safeSendMessage({
      type: "ACTIVE_CHANGE",
      payload: { activeNodeId: activeId }
    })
  }
)

function sendTitleUpdate() {
  let title = ""

  // Try Gemini's conversation-title element first
  const geminiTitle = document.querySelector(".conversation-title.gds-title-m")
  if (geminiTitle) {
    title = geminiTitle.textContent?.trim() || ""
  }

  // For ChatGPT: Use the active conversation item in sidebar, or the document title
  // Avoid using h1 as it may match AI response headings
  if (!title && window.location.hostname === "chatgpt.com") {
    // Try: Active sidebar conversation title (has specific aria/state attributes)
    const activeConv = document
      .querySelector('[data-testid="conversation-turn-list"]')
      ?.closest("main")
      ?.querySelector("h1")

    // Fallback: Get from page/document title (more reliable)
    // Format: "Conversation Title | ChatGPT"
    const docTitle = document.title
    if (docTitle && !docTitle.startsWith("ChatGPT")) {
      title = docTitle
        .replace(" | ChatGPT", "")
        .replace(" - ChatGPT", "")
        .trim()
    }

    // Last resort: Find h1 that's NOT inside article (response content)
    if (!title) {
      const h1Elements = document.querySelectorAll("h1")
      for (const h1 of h1Elements) {
        // Skip if inside article (AI response) or markdown content
        if (!h1.closest("article") && !h1.closest(".markdown")) {
          title = h1.textContent?.trim() || ""
          if (title) break
        }
      }
    }
  }

  if (title) {
    currentTitle = title // Store for cache operations
    safeSendMessage({
      type: "TITLE_UPDATE",
      payload: { title }
    })
  }
}

// Set a timeout to warn if no content found
detectionTimeout = window.setTimeout(() => {
  const adapter = registry.getActiveAdapter()
  if (!adapter) {
    // No adapter match at all?
    // We probably don't want to show an error unless we match the host but fail logic.
    // Actually, manifest 'matches' handles host matching.
    // So if we are running, we SHOULD match something.
    console.warn("SideScribe: No content detected after 5s.")
    // Send empty update with error flag? For now just log.
    // Or better: send a "TOC_EMPTY" type?
    // Let's rely on UI showing "Empty" state for now.
  }
}, 5000)

// Listen for messages (ScrollTo, CopyLink, RequestTOC) from SidePanel/Overlay/Background
chrome.runtime.onMessage.addListener((message: MessagePayload) => {
  if (message.type === "SCROLL_TO") {
    const payload = message.payload as ScrollToPayload
    const adapter = registry.getActiveAdapter()
    if (adapter) {
      adapter.scrollTo(payload.targetId)
    }
  } else if (message.type === "REQUEST_TOC") {
    // Force a fresh parse and send
    const adapter = registry.getActiveAdapter()
    if (adapter) {
      const result = adapter.parse()
      safeSendMessage({
        type: "TOC_UPDATE",
        payload: result.toc
      })
      // Also send title update
      sendTitleUpdate()
    }
  } else if (message.type === "REQUEST_TITLE") {
    sendTitleUpdate()
  } else if (message.type === "COPY_DEEP_LINK") {
    // We need to identify the target.
    // 1. If we tracked the last right-clicked element, use that.
    // 2. Fallback to active element from ScrollSpy.

    const adapter = registry.getActiveAdapter()
    if (!adapter || !adapter.getNodeId) return

    let targetId: string | null = null

    // Strategy: Use last right clicked element
    if (lastRightClickElement) {
      // Traverse up to find a node known to the adapter
      let el: HTMLElement | null = lastRightClickElement
      while (el && !targetId && el !== document.body) {
        targetId = adapter.getNodeId(el)
        el = el.parentElement
      }
    }

    if (targetId) {
      const url = new URL(window.location.href)
      url.hash = `#${targetId}`
      navigator.clipboard.writeText(url.toString()).then(() => {
        alert("Link copied to clipboard!")
        // In a real app, use a nicer toast
      })
    }
  }
})

// Track right-click target
let lastRightClickElement: HTMLElement | null = null
document.addEventListener(
  "contextmenu",
  (e) => {
    lastRightClickElement = e.target as HTMLElement
  },
  true
)

// Handle navigation (SPA) & Hash Change
let lastUrl = window.location.href
const handleUrlChange = () => {
  const url = window.location.href
  if (url !== lastUrl) {
    // If only hash changed, try to scroll
    const oldUrlObj = new URL(lastUrl)
    const newUrlObj = new URL(url)

    if (oldUrlObj.pathname === newUrlObj.pathname && newUrlObj.hash) {
      // Hash change only
      const adapter = registry.getActiveAdapter()
      if (adapter && adapter.scrollToHash) {
        adapter.scrollToHash(newUrlObj.hash)
      } else if (adapter) {
        // Fallback: try to scroll to ID if it matches our format
        const id = newUrlObj.hash.substring(1)
        if (id.startsWith("ext-")) {
          // Retry logic
          let attempts = 0
          const maxAttempts = 10
          const interval = setInterval(() => {
            attempts++
            const success = adapter.scrollTo(id)
            if (success || attempts >= maxAttempts) {
              clearInterval(interval)
              if (!success)
                console.warn(
                  `Could not scroll to ${id} after ${maxAttempts} attempts`
                )
            }
          }, 200)
        }
      }
    } else {
      // Full navigation
      registry.init(
        url,
        (result) => {
          safeSendMessage({
            type: "TOC_UPDATE",
            payload: result.toc
          })
        },
        (activeId) => {
          safeSendMessage({
            type: "ACTIVE_CHANGE",
            payload: { activeNodeId: activeId }
          })
        }
      )
    }
    lastUrl = url
  }
}

// Observe Title/URL changes
new MutationObserver(handleUrlChange).observe(document, {
  subtree: true,
  childList: true
})
// Also listen to hashchange event
window.addEventListener("hashchange", handleUrlChange)
// Polling fallback for SPA navs that don't trigger events/mutations predictably
setInterval(handleUrlChange, 1000)

// Theme Detection
const detectTheme = () => {
  // Check for "dark" class on document.documentElement or body
  const isDark =
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches

  // Some sites like Gemini use specific data attributes
  const geminiDark = document.body.getAttribute("data-theme") === "dark"

  // ChatGPT uses .dark class on html
  const chatgptDark = document.documentElement.classList.contains("dark")

  const theme = isDark || geminiDark || chatgptDark ? "dark" : "light"

  safeSendMessage({
    type: "THEME_CHANGE",
    payload: { theme }
  })
}

// Observe class changes for theme
new MutationObserver(detectTheme).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"]
})
new MutationObserver(detectTheme).observe(document.body, {
  attributes: true,
  attributeFilter: ["class", "data-theme"]
})

// Initial check
detectTheme()
