# Adapter Development Guide

SideScribe uses an adapter pattern to support different AI chat interfaces. This guide explains how to create a new adapter for a website.

## Architecture Overview

The core logic resides in `src/contents/`, which injects the content script. The content script uses an `AdapterRegistry` to find the correct `ISiteAdapter` for the current URL.

- **`ISiteAdapter`**: The interface that all adapters must implement.
- **`TOCParser`**: A utility to parse headings and markdown from the DOM.
- **`ScrollSpy`**: A helper to track which element is currently in view.

## Creating a New Adapter

### 1. Create the Adapter Class

Create a new file in `src/adapters/` (e.g., `claude.ts`). Implement the `ISiteAdapter` interface.

```typescript
import type { ISiteAdapter, AdapterMeta, ParseResult } from "./interface"
import type { TOCNode } from "../lib/types"

export class ClaudeAdapter implements ISiteAdapter {
    meta: AdapterMeta = {
        name: "Claude",
        matches: ["https://claude.ai/*"],
        primaryColor: "#d97757" // Example color
    }

    init(onUpdate: (result: ParseResult) => void, onActive?: (id: string) => void): void {
        // 1. Setup mutation observers to detect changes
        // 2. Call onUpdate when the TOC changes
        // 3. Setup ScrollSpy and call onActive when scrolling
    }

    destroy(): void {
        // Cleanup observers and timers
    }

    parse(): ParseResult {
        // Logic to traverse the DOM and build the TOCNode tree
        return { toc: [] }
    }

    scrollTo(id: string): boolean {
        // Scroll the specific element into view
        return true
    }
}
```

### 2. Implementing `parse()`

The `parse` method is the heart of the adapter. It should:
1. Identify "Turns" (User prompt vs AI response).
2. Extract the user prompt as the turn title.
3. Parse the AI response for headings (H1-H6) or bold text using `TOCParser.parseTurn(element, index)`.
4. Return a `ParseResult` containing the root `TOCNode[]`.

**Tip:** Use `TOCParser` to handle standard Markdown HTML structures.

```typescript
import { TOCParser } from "../lib/toc-parser"

// Inside parse()
const turns = document.querySelectorAll('.chat-message')
turns.forEach((turn, index) => {
    // ... determine if user or ai ...
    if (isAI) {
        const children = TOCParser.parseTurn(turnContentElement, index)
        // ... add to tree
    }
})
```

### 3. Implementing `scrollTo(id)`

The Side Panel sends a `SCROLL_TO` message with a `nodeId`. Your adapter must find the corresponding DOM element and scroll it into view.

- IDs usually follow a pattern like `ext-turn-{index}` or `ext-turn-{index}-heading-{subIndex}`.
- It is recommended to maintain a `Map<string, HTMLElement>` cache during `parse()` to make `scrollTo` efficient.

### 4. Register the Adapter

Add your new adapter to `src/adapters/registry.ts`:

```typescript
import { ClaudeAdapter } from "./claude"

export class AdapterRegistry {
    constructor() {
        // ...
        this.adapters.push(new ClaudeAdapter())
    }
}
```

## Best Practices

1.  **Debouncing**: DOM changes happen frequently during streaming. Debounce your `parse` calls (e.g., 1000ms) to avoid performance issues.
2.  **Robust Selectors**: CSS classes change. Try to use stable attributes or generic selectors combined with structure checks where possible.
3.  **ScrollSpy**: Register elements with `ScrollSpy` to highlight the active section in the TOC as the user scrolls.

## Testing

1. Run `pnpm dev` to start the extension in development mode.
2. Open the target website.
3. Verify the TOC appears in the side panel.
4. Test clicking items (scrolling) and manual scrolling (highlighting).
