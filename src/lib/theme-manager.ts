// Theme Tokens for Host Matching
// We inject these CSS variables into the root (html/body) or the extension shadow root.

export const THEMES = {
    chatgpt: {
        light: {
            '--ss-bg-main': '#ffffff',
            '--ss-bg-secondary': '#f9f9f9',
            '--ss-text-primary': '#0d0d0d',
            '--ss-text-secondary': '#666666',
            '--ss-border': '#e5e5e5',
            '--ss-accent': '#10a37f', // ChatGPT Green
            '--ss-accent-bg': 'rgba(16, 163, 127, 0.1)',
            '--ss-hover': '#f7f7f8',
            '--ss-active': '#ececf1'
        },
        dark: {
            '--ss-bg-main': '#000000', // Matches ChatGPT dark
            '--ss-bg-secondary': '#202123',
            '--ss-text-primary': '#ececf1',
            '--ss-text-secondary': '#aaa',
            '--ss-border': '#2e2f33',
            '--ss-accent': '#19c37d',
            '--ss-accent-bg': 'rgba(25, 195, 125, 0.1)',
            '--ss-hover': '#2a2b32',
            '--ss-active': '#343541'
        }
    },
    gemini: {
        light: {
            '--ss-bg-main': '#ffffff',
            '--ss-bg-secondary': '#f0f4f9',
            '--ss-text-primary': '#1f1f1f',
            '--ss-text-secondary': '#444746',
            '--ss-border': '#e1e3e1',
            '--ss-accent': '#1b6ef3', // Gemini Blue
            '--ss-accent-bg': 'rgba(27, 110, 243, 0.1)',
            '--ss-hover': '#f2f2f2',
            '--ss-active': '#e3e3e3'
        },
        dark: {
            '--ss-bg-main': '#131314', // Matches Gemini dark
            '--ss-bg-secondary': '#1e1f20',
            '--ss-text-primary': '#e3e3e3',
            '--ss-text-secondary': '#c4c7c5',
            '--ss-border': '#444746',
            '--ss-accent': '#8ab4f8',
            '--ss-accent-bg': 'rgba(138, 180, 248, 0.1)',
            '--ss-hover': '#28292a',
            '--ss-active': '#303132'
        }
    }
}

export type HostType = 'chatgpt' | 'gemini' | 'generic'

export function getThemeTokens(host: HostType, mode: 'light' | 'dark') {
    return THEMES[host]?.[mode] || THEMES.chatgpt[mode] // Default to ChatGPT-ish
}

export function injectTheme(host: HostType, mode: 'light' | 'dark', root: HTMLElement) {
    const tokens = getThemeTokens(host, mode)
    Object.entries(tokens).forEach(([key, value]) => {
        root.style.setProperty(key, value as string)
    })
}
