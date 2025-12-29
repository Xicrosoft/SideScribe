export { }

console.log("SideScribe background service worker loaded.")

// Open the side panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    if (tab.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
            console.error("Failed to open side panel:", error)
        })
    }
})

// Global Keyboard Shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "toggle-toc" && tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
            type: "TOGGLE_OVERLAY"
        }).catch(() => { })
    }
})

// Context Menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "copy-anchor-link",
        title: "Copy Link to Section",
        contexts: ["all"]
    })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "copy-anchor-link" && tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
            type: "COPY_DEEP_LINK"
        }).catch(() => { })
    }
})

// Message Relay System
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // If message comes from Content Script (Parser), relay it to the Tab so Overlay can hear it
    if (message.type === "TOC_UPDATE" || message.type === "ACTIVE_CHANGE" || message.type === "THEME_CHANGE" || message.type === "STATUS_UPDATE") {
        if (sender.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, message).catch(() => { })
        }
    }

    // If ScrollTo comes from Overlay (CS), we need to send it to the Parser (CS)
    if (message.type === "SCROLL_TO") {
        if (sender.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, message).catch(() => { })
        }
    }

    // Handle OPEN_SIDEPANEL from popup
    if (message.type === "OPEN_SIDEPANEL") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.windowId) {
                chrome.sidePanel.open({ windowId: tabs[0].windowId }).catch(() => { })
            }
        })
    }
})
