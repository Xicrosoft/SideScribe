export interface TOCNode {
  id: string
  text: string
  level: number
  children?: TOCNode[]
  type: 'turn' | 'heading' | 'paragraph'
  parentId?: string
  isCollapsed?: boolean // UI state, but useful to have in type
  speaker?: 'user' | 'ai' // For marking user prompts vs AI responses
}

export type ConversationSource = 'chatgpt' | 'gemini'

export interface CachedConversation {
  id: string                       // Conversation ID from URL
  title: string
  source: ConversationSource
  toc: TOCNode[]
  messageCount: number
  cachedAt: number                 // First cached timestamp
  lastUpdated: number              // Last modification timestamp
}

export type MessageType =
  | "TOC_UPDATE"
  | "SCROLL_TO"
  | "ACTIVE_CHANGE"
  | "COPY_DEEP_LINK"
  | "THEME_CHANGE"
  | "TOGGLE_OVERLAY"
  | "STATUS_UPDATE"
  | "REQUEST_TOC"
  | "REQUEST_TITLE"
  | "TITLE_UPDATE"
  | "OPEN_SIDEPANEL"

export interface MessagePayload {
  type: MessageType
  payload?: any
}

export interface ScrollToPayload {
  targetId: string
  type: 'node' | 'turn'
}

export interface ActiveChangePayload {
  activeNodeId: string
}
