import {
    BrowserClient,
    defaultStackParser,
    feedbackIntegration,
    getDefaultIntegrations,
    makeFetchTransport,
    Scope
} from "@sentry/browser"

import { storage, STORAGE_KEYS } from "./storage"

const SENTRY_DSN =
    "https://a1ec19508e60f2b8902e01d8cef57abd@o4509485702119424.ingest.us.sentry.io/4510630510657536"

let sentryScope: Scope | null = null

/**
 * Initialize Sentry for browser extension context.
 * Uses manual client setup instead of Sentry.init() to avoid polluting global state.
 * See: https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/
 *
 * Must be called at each entry point (background, sidepanel, content, tab).
 */
export async function initSentry(
    context: "background" | "sidepanel" | "content" | "tab"
): Promise<void> {
    if (sentryScope) return

    // Check user preference (default: disabled)
    const enabled = await storage.get(STORAGE_KEYS.TELEMETRY_ENABLED)
    if (typeof enabled !== "boolean" || enabled !== true) return

    // Filter integrations that use global state (not suitable for extensions)
    const integrations = getDefaultIntegrations({}).filter(
        (defaultIntegration) => {
            return !["BrowserApiErrors", "Breadcrumbs", "GlobalHandlers"].includes(
                defaultIntegration.name
            )
        }
    )

    // Only include feedback widget in extension's own UI, not on external websites
    const clientIntegrations =
        context === "sidepanel" || context === "tab"
            ? [...integrations, feedbackIntegration({ colorScheme: "system" })]
            : integrations

    const client = new BrowserClient({
        dsn: SENTRY_DSN,
        transport: makeFetchTransport,
        stackParser: defaultStackParser,
        integrations: clientIntegrations,
        sendDefaultPii: false, // Anonymous by default
        tracesSampleRate: 1.0 // 100% sampling for early development
    })

    const scope = new Scope()
    scope.setClient(client)
    scope.setTag("context", context)
    client.init() // Must be called after setting the client on the scope

    sentryScope = scope
}

/**
 * Capture an exception manually.
 * Use this instead of Sentry.captureException() in browser extension context.
 */
export function captureException(error: unknown): void {
    if (sentryScope) {
        sentryScope.captureException(error)
    }
}

/**
 * Capture a message manually.
 * Use this instead of Sentry.captureMessage() in browser extension context.
 */
export function captureMessage(message: string): void {
    if (sentryScope) {
        sentryScope.captureMessage(message)
    }
}

/**
 * Get the Sentry scope for advanced usage.
 * Returns null if Sentry is not initialized.
 */
export function getSentryScope(): Scope | null {
    return sentryScope
}
