# SideScribe - AI Chat Table of Contents

**SideScribe** is a Chrome Extension that generates a dynamic Table of Contents (TOC) for AI chat interfaces like Google Gemini and ChatGPT. It uses the Chrome Side Panel API to provide seamless navigation through long conversations without cluttering the main interface.

## Features

- 📑 **Auto-generated TOC**: Automatically parses headings and key sections from chat conversations.
- 🎯 **Smart Navigation**: Click any item to smooth-scroll to that position in the chat.
- 🕵️ **Scroll Spy**: Automatically highlights the active section in the TOC as you scroll.
- 💾 **Local Caching**: Remembers the TOC structure of your past conversations (syncs across devices for small data, local for large).
- 🌓 **Theme Support**: Adapts to Light/Dark mode.

## Supported Websites

- [x] **Google Gemini** (`gemini.google.com`)
- [x] **ChatGPT** (`chatgpt.com`) - *Partial support*

## Installation

### From Source

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/side-scribe.git
    cd side-scribe
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    # or npm install
    ```

3.  **Build the extension**:
    ```bash
    pnpm build
    ```

4.  **Load in Chrome**:
    - Open `chrome://extensions/`
    - Enable "Developer mode" (top right).
    - Click "Load unpacked".
    - Select the `build/chrome-mv3-prod` directory.

## Usage

1.  Open a supported chat website (e.g., Gemini).
2.  Click the SideScribe extension icon in the toolbar to open the Side Panel.
3.  The Table of Contents will appear automatically.
4.  Navigate through your conversation!

## Roadmap

- [ ] **More Adapters**: Support for Claude, Perplexity, and other AI chat interfaces.
- [ ] **Full Conversation Caching**: Save the complete text of conversations for offline viewing.
- [ ] **Bookmarks**: Ability to "Star" or bookmark specific conversations for quick access.
- [ ] **Export**: Export conversations to Markdown or JSON formats.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development instructions.

## License

MIT License. See [LICENSE](LICENSE) for more information.
