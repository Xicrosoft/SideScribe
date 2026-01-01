import * as Sentry from "@sentry/svelte"

import { storage, STORAGE_KEYS } from "./storage"

const SENTRY_DSN =
    "https://a1ec19508e60f2b8902e01d8cef57abd@o4509485702119424.ingest.us.sentry.io/4510630510657536"

let initialized = false

/**
 * Initialize Sentry if telemetry is enabled by user.
 * Must be called at each entry point (background, sidepanel, content, tab).
 */
export async function initSentry(
    context: "background" | "sidepanel" | "content" | "tab"
): Promise<void> {
    if (initialized) return

    // Check user preference (default: disabled)
    const enabled = await storage.get(STORAGE_KEYS.TELEMETRY_ENABLED)
    if (typeof enabled !== "boolean" || enabled !== true) return

    Sentry.init({
        dsn: SENTRY_DSN,
        sendDefaultPii: false, // Anonymous by default
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.feedbackIntegration({
                colorScheme: "system"
            })
        ],
        tracesSampleRate: 1.0, // 100% sampling for early development
        initialScope: {
            tags: { context }
        }
    })
    initialized = true
}

export { Sentry }
