import { storage } from "./storage"

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

    // Cooldown expired or no cache, perform fresh check
    const info = await checkForUpdates(currentVersion)

    // Cache the result
    await storage.set(LAST_CHECK_TIME_KEY, now)
    await storage.set(CACHED_UPDATE_INFO_KEY, info)

    return info
}

/**
 * Force check for updates (bypasses cooldown).
 * Used for manual "Check Now" button.
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo> {
    try {
        const response = await fetch("https://api.github.com/repos/Xicrosoft/SideScribe/releases/latest")

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

        const data = await response.json()
        const latestTag = data.tag_name // e.g., "v0.1.0-beta" or "v1.0.0"

        // Simple version comparison
        // Removes 'v' prefix and compares semantic versions
        const latest = cleanVersion(latestTag)
        const current = cleanVersion(currentVersion)

        const hasUpdate = compareVersions(latest, current) > 0

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

function cleanVersion(v: string): string {
    return v.replace(/^v/, "").split("-")[0]
}

function compareVersions(v1: string, v2: string): number {
    const pa = v1.split('.').map(Number);
    const pb = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (nb > na) return -1;
    }
    return 0;
}
