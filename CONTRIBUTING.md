# Contributing to SideScribe

Thank you for your interest in contributing to SideScribe! We welcome contributions from everyone.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally.
3.  **Install dependencies**:
    ```bash
    pnpm install
    ```
    *Note: We use `pnpm` for package management.*

## Development Workflow

1.  **Start the development server**:
    ```bash
    pnpm dev
    ```
    This will start the Plasmo development server.

2.  **Load the extension**:
    - Open Chrome and go to `chrome://extensions/`.
    - Enable "Developer mode".
    - Click "Load unpacked" and select the `build/chrome-mv3-dev` directory created by the dev server.

3.  **Make changes**:
    - The extension supports hot-reloading for most UI changes (Svelte components).
    - Changes to content scripts or adapters usually trigger a reload of the extension.

## Project Structure

- `src/sidepanel.svelte`: The main UI of the extension.
- `src/contents/`: Content scripts that run on the web pages.
- `src/adapters/`: Site-specific logic (parsers, scroll handlers).
    - See [docs/ADAPTER_GUIDE.md](docs/ADAPTER_GUIDE.md) for how to write adapters.
- `src/lib/`: Shared utilities and types.

## Code Style

- We use **Prettier** for code formatting.
- Please ensure your code passes the linting checks before submitting.

```bash
pnpm test
pnpm typecheck
```

## Submitting a Pull Request

1.  Create a new branch for your feature or bugfix.
2.  Commit your changes with clear messages.
3.  Push to your fork and open a Pull Request.
4.  Describe your changes and link to any relevant issues.

## Adding New Adapters

If you want to add support for a new website (e.g., Claude, Perplexity), please refer to the [Adapter Development Guide](docs/ADAPTER_GUIDE.md).

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
