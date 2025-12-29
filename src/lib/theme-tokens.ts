// Shared Theme Tokens for Popup, Overlay, and SidePanel
// Ensures consistent styling across all UI surfaces

export type HostType = "chatgpt" | "gemini" | "generic"
export type ThemeMode = "light" | "dark"

export interface ThemeTokens {
    bg: string
    bgSecondary: string
    text: string
    textSecondary: string
    border: string
    accent: string
    accentBg: string
    hover: string
    active: string
    radius: string
    font: string
}

export const THEME_TOKENS: Record<HostType, Record<ThemeMode, ThemeTokens>> = {
    chatgpt: {
        light: {
            bg: "#ffffff",
            bgSecondary: "#f9f9f9",
            text: "#0d0d0d",
            textSecondary: "#5d5d5d",
            border: "#e5e5e5",
            accent: "#0d0d0d", // Black accent
            accentBg: "rgba(0, 0, 0, 0.08)",
            hover: "#f5f5f5",
            active: "#ececec",
            radius: "12px",
            font: "Söhne, ui-sans-serif, system-ui, -apple-system, sans-serif"
        },
        dark: {
            bg: "#212121",
            bgSecondary: "#171717",
            text: "#ffffff",
            textSecondary: "#b4b4b4",
            border: "#2f2f2f",
            accent: "#ffffff", // White accent in dark mode
            accentBg: "rgba(255, 255, 255, 0.1)",
            hover: "#2f2f2f",
            active: "#373737",
            radius: "12px",
            font: "Söhne, ui-sans-serif, system-ui, -apple-system, sans-serif"
        }
    },
    gemini: {
        light: {
            bg: "#ffffff",
            bgSecondary: "#f0f4f9",
            text: "#1f1f1f",
            textSecondary: "#444746",
            border: "#c4c7c5",
            accent: "#1a73e8",
            accentBg: "rgba(26, 115, 232, 0.12)",
            hover: "#e1e3e1",
            active: "#d3d5d3",
            radius: "16px",
            font: "'Google Sans', 'Helvetica Neue', Roboto, Arial, sans-serif"
        },
        dark: {
            bg: "#131314",
            bgSecondary: "#1e1f20",
            text: "#e3e3e3",
            textSecondary: "#c4c7c5",
            border: "#444746",
            accent: "#8ab4f8",
            accentBg: "rgba(138, 180, 248, 0.15)",
            hover: "#333537",
            active: "#3c4043",
            radius: "16px",
            font: "'Google Sans', 'Helvetica Neue', Roboto, Arial, sans-serif"
        }
    },
    generic: {
        light: {
            bg: "#ffffff",
            bgSecondary: "#f5f5f5",
            text: "#1a1a1a",
            textSecondary: "#666666",
            border: "#e0e0e0",
            accent: "#1a1a1a", // Black accent like ChatGPT
            accentBg: "rgba(0, 0, 0, 0.08)",
            hover: "#f0f0f0",
            active: "#e5e5e5",
            radius: "12px",
            font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        },
        dark: {
            bg: "#1a1a1a",
            bgSecondary: "#2a2a2a",
            text: "#ffffff",
            textSecondary: "#a0a0a0",
            border: "#3a3a3a",
            accent: "#ffffff", // White accent in dark
            accentBg: "rgba(255, 255, 255, 0.1)",
            hover: "#333333",
            active: "#404040",
            radius: "12px",
            font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }
    }
}

export function getTokens(host: HostType, mode: ThemeMode): ThemeTokens {
    return THEME_TOKENS[host][mode]
}

export function detectHost(url: string): HostType {
    if (url.includes("chatgpt")) return "chatgpt"
    if (url.includes("google")) return "gemini"
    return "generic"
}
