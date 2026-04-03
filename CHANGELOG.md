# Changelog

## 0.1.0 (2026-04-02)

Initial release.

### Features

- Incremental state machine parser — O(1) per token, O(n) total
- Direct DOM rendering — no intermediate AST, no virtual DOM
- `requestAnimationFrame` batched DOM writes
- Viewport virtualization via IntersectionObserver
- `renderToString()` for static/server-side rendering
- Built-in XSS sanitization (URL protocols, HTML escaping)
- FOIM (Flash of Incomplete Markdown) prevention
- Zero dependencies, ~4KB gzipped
- React wrapper (`@flowdown/react`) with `<StreamMarkdown>` component and `useStreamMarkdown` hook

### Supported Markdown

- ATX headings, bold, italic, strikethrough, inline code
- Fenced code blocks with language hints and highlight callback
- Inline links and images
- Unordered and ordered lists
- Blockquotes (including nested code blocks)
- GFM pipe tables with column alignment
- Horizontal rules
