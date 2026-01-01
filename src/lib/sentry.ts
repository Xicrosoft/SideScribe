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
 * Get or create an anonymous installation ID for error tracking.
 * This helps correlate multiple errors from the same installation
 * without collecting any personally identifiable information.
 */
async function getInstallationId(): Promise<string> {
    const INSTALL_ID_KEY = "sentry_install_id"
    let installId = await storage.get(INSTALL_ID_KEY) as string | undefined

    if (!installId) {
        // Generate a random UUID-like ID
        installId = crypto.randomUUID()
        await storage.set(INSTALL_ID_KEY, installId)
    }

    return installId
}

/**
 * Get extension version from manifest
 */
function getVersion(): string {
    try {
        const manifest = chrome.runtime.getManifest()
        return manifest.version_name || manifest.version
    } catch {
        return "unknown"
    }
}

/**
 * Detect environment (development vs production)
 */
function getEnvironment(): "development" | "production" {
    // In development, extension ID is dynamic; in production, it's fixed
    // Also check for common dev indicators
    try {
        const manifest = chrome.runtime.getManifest()
        // Plasmo dev builds don't have update_url
        if (!manifest.update_url) {
            return "development"
        }
        return "production"
    } catch {
        return "development"
    }
}

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

    const version = getVersion()
    const environment = getEnvironment()
    const installId = await getInstallationId()

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
        release: `sidescribe@${version}`,
        environment: environment,
        sendDefaultPii: false, // Anonymous by default
        tracesSampleRate: 1.0 // 100% sampling for early development
    })

    const scope = new Scope()
    scope.setClient(client)

    // Set tags for filtering in Sentry dashboard
    scope.setTag("context", context)
    scope.setTag("browser", getBrowserName())
    scope.setTag("manifest_version", "3")

    // Set anonymous user for error correlation
    scope.setUser({
        id: installId
        // No email, username, or IP - fully anonymous
    })

    client.init() // Must be called after setting the client on the scope

    sentryScope = scope
}

/**
 * Detect browser name
 */
function getBrowserName(): string {
    const ua = navigator.userAgent
    if (ua.includes("Firefox")) return "firefox"
    if (ua.includes("Edg")) return "edge"
    if (ua.includes("Chrome")) return "chrome"
    if (ua.includes("Safari")) return "safari"
    return "unknown"
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
