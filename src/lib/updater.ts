export interface UpdateInfo {
    hasUpdate: boolean
    latestVersion: string
    downloadUrl: string
    releaseNotes?: string
}

export interface UpdateState extends UpdateInfo {
    lastChecked: number
}

import { storage, STORAGE_KEYS } from "./storage"

export async function tryAutoCheck(currentVersion: string): Promise<UpdateState | null> {
    // 1. Load existing state
    const rawState = await storage.get(STORAGE_KEYS.UPDATE_STATE)
    let state: UpdateState = rawState ? (JSON.parse(rawState) as UpdateState) : {
        hasUpdate: false,
        latestVersion: currentVersion,
        downloadUrl: "",
        lastChecked: 0
    }

    const now = Date.now()
    const ONE_HOUR = 60 * 60 * 1000

    // 2. Check if we need to refresh (Cooldwon: 1 hour)
    if (now - state.lastChecked > ONE_HOUR) {
        // Fetch fresh data
        const info = await checkForUpdates(currentVersion)

        // Update state
        state = {
            ...info,
            lastChecked: now
        }

        // Save to storage
        await storage.set(STORAGE_KEYS.UPDATE_STATE, JSON.stringify(state))
    }

    return state
}

export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo> {
    try {
        const response = await fetch("https://api.github.com/repos/Xicrosoft/SideScribe/releases/latest")
        if (!response.ok) {
            throw new Error("Failed to fetch latest release")
        }
        const data = await response.json()
        const latestTag = data.tag_name // e.g., "v0.1.0-beta" or "v1.0.0"

        // Simple version comparison
        // Removes 'v' prefix and compares semantic versions
        const latest = cleanVersion(latestTag)
        const current = cleanVersion(currentVersion)

        // If the latest version string is different and we consider it "newer", return true.
        // Since we maintain the repo, we can assume standard semver.
        // For simplicity in this context (and usually sufficient for extensions), exact string inequality 
        // where latest != current is enough if we assume we only release newer stuff. 
        // But let's do a basic semver check to be safe against older releases being marked 'latest' by mistake.

        const hasUpdate = compareVersions(latest, current) > 0

        // Construct download URL based on the user's provided format:
        // https://github.com/Xicrosoft/SideScribe/releases/download/v0.1.0-beta/sidescribe-v0.1.0-beta.zip
        // We can also try to find the asset in 'data.assets' if available, but the user gave a specific format.
        // Let's use the asset from the API if possible, fallback to constructed URL.

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
        console.error("Update check failed:", error)
        return {
            hasUpdate: false,
            latestVersion: currentVersion,
            downloadUrl: ""
        }
    }
}

function cleanVersion(v: string): string {
    return v.replace(/^v/, "").split("-")[0] // Remove 'v' and '-beta' suffix for basic comparison if needed, or keep for full semver
}

function compareVersions(v1: string, v2: string): number {
    // Basic semver comparator
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
