import * as Sentry from "@sentry/svelte"

import { storage, STORAGE_KEYS } from "./storage"

const SENTRY_DSN =
    "https://ce694e52cc35622adacff7ea8df31349@o4509485702119424.ingest.us.sentry.io/4510630325059584"

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
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 1.0, // 100% sampling for early development
        initialScope: {
            tags: { context }
        }
    })
    initialized = true
}

export { Sentry }
