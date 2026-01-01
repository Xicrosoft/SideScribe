import { storage, STORAGE_KEYS } from "./storage"

export interface UpdateInfo {
    hasUpdate: boolean
    latestVersion: string
    downloadUrl: string
    releaseNotes?: string
}

const LAST_CHECK_TIME_KEY = "lastUpdateCheckTime"
const CACHED_UPDATE_INFO_KEY = "cachedUpdateInfo"
const COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

/**
 * Check for updates with 1-hour cooldown.
 * Returns cached result if checked within the last hour.
 */
export async function checkForUpdatesWithCooldown(currentVersion: string): Promise<UpdateInfo> {
    const lastCheckTime = await storage.get(LAST_CHECK_TIME_KEY) as number | undefined
    const now = Date.now()

    if (lastCheckTime && (now - lastCheckTime) < COOLDOWN_MS) {
        // Within cooldown, return cached result
        const cached = await storage.get(CACHED_UPDATE_INFO_KEY) as UpdateInfo | undefined
        if (cached) {
            return cached
        }
    }

    // Get prerelease preference from storage (default: false)
    const checkPrerelease = (await storage.get(STORAGE_KEYS.CHECK_PRERELEASE)) as boolean ?? false

    // Cooldown expired or no cache, perform fresh check
    const info = await checkForUpdates(currentVersion, checkPrerelease)

    // Cache the result
    await storage.set(LAST_CHECK_TIME_KEY, now)
    await storage.set(CACHED_UPDATE_INFO_KEY, info)

    return info
}

/**
 * Force check for updates (bypasses cooldown).
 * Used for manual "Check Now" button.
 * @param includePrereleases - Whether to include pre-release versions
 */
export async function checkForUpdates(
    currentVersion: string,
    includePrereleases: boolean = false
): Promise<UpdateInfo> {
    try {
        // Use /releases instead of /releases/latest to support prereleases
        const response = await fetch("https://api.github.com/repos/Xicrosoft/SideScribe/releases")

        // Handle 404 (no releases yet) gracefully
        if (response.status === 404) {
            console.log("No releases found yet")
            return {
                hasUpdate: false,
                latestVersion: currentVersion,
                downloadUrl: ""
            }
        }

        if (!response.ok) {
            console.warn(`GitHub API returned ${response.status}`)
            return {
                hasUpdate: false,
                latestVersion: currentVersion,
                downloadUrl: ""
            }
        }

        const releases = await response.json()

        // Filter releases based on prerelease setting
        const validReleases = releases.filter((release: any) =>
            !release.draft && (includePrereleases || !release.prerelease)
        )

        if (validReleases.length === 0) {
            console.log("No valid releases found")
            return {
                hasUpdate: false,
                latestVersion: currentVersion,
                downloadUrl: ""
            }
        }

        // Get the first (latest) valid release
        const data = validReleases[0]
        const latestTag = data.tag_name // e.g., "v0.1.0-beta" or "v1.0.0"

        // Compare versions with pre-release support
        const hasUpdate = compareVersions(latestTag, currentVersion) > 0

        // Construct download URL
        let downloadUrl = ""
        const zipAsset = data.assets?.find((a: any) => a.name.endsWith(".zip"))
        if (zipAsset) {
            downloadUrl = zipAsset.browser_download_url
        } else {
            // Fallback construction
            downloadUrl = `https://github.com/Xicrosoft/SideScribe/releases/download/${latestTag}/sidescribe-${latestTag}.zip`
        }

        return {
            hasUpdate,
            latestVersion: latestTag,
            downloadUrl,
            releaseNotes: data.body
        }
    } catch (error) {
        // Network error or other issue - fail silently
        console.warn("Update check failed:", error)
        return {
            hasUpdate: false,
            latestVersion: currentVersion,
            downloadUrl: ""
        }
    }
}

/**
 * Parse version string into components
 * @example "v0.1.1-beta" -> { major: 0, minor: 1, patch: 1, prerelease: "beta" }
 */
function parseVersion(v: string): { major: number; minor: number; patch: number; prerelease: string | null } {
    const cleaned = v.replace(/^v/, "")
    const [base, prerelease] = cleaned.split("-")
    const [major, minor, patch] = base.split(".").map(Number)
    return {
        major: major || 0,
        minor: minor || 0,
        patch: patch || 0,
        prerelease: prerelease || null
    }
}

/**
 * Compare two semver versions with pre-release support
 * Pre-release versions are considered LOWER than stable versions
 * @example "0.1.1-beta" < "0.1.1" < "0.1.2-alpha"
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
    const a = parseVersion(v1)
    const b = parseVersion(v2)

    // Compare major.minor.patch
    if (a.major !== b.major) return a.major > b.major ? 1 : -1
    if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1
    if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1

    // Same base version, compare pre-release
    // No pre-release > any pre-release (stable wins)
    if (a.prerelease === null && b.prerelease !== null) return 1
    if (a.prerelease !== null && b.prerelease === null) return -1
    if (a.prerelease === null && b.prerelease === null) return 0

    // Both have pre-release, compare alphabetically
    return a.prerelease!.localeCompare(b.prerelease!)
}
