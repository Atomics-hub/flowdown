# flowdown

[![npm version](https://img.shields.io/npm/v/@a5omic/flowdown)](https://www.npmjs.com/package/@a5omic/flowdown)
[![license](https://img.shields.io/npm/l/@a5omic/flowdown)](https://github.com/Atomics-hub/flowdown/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@a5omic/flowdown)](https://bundlephobia.com/package/@a5omic/flowdown)

O(1) streaming markdown renderer for the AI era. Zero dependencies. ~4KB gzipped.

Every AI chat app using `react-markdown` re-parses the **entire conversation** on every token. That's O(n²). Flowdown processes each token exactly once. That's O(n).

## Performance

| Benchmark | Flowdown | marked | markdown-it |
|-----------|----------|--------|-------------|
| Streaming (2K tokens) | **7.8ms** | 16,765ms | — |
| DOM output (9KB) | **7.3ms** | 13.4ms | 12.9ms |
| String output (9KB) | **0.77ms** | 1.00ms | 0.87ms |
| Bundle (gzipped) | **~4KB** | 12KB | 51KB |

Flowdown is **2,146x faster** than marked for streaming the same document.

## Hosted Flowdown

Flowdown stays MIT and local-first. Hosted Flowdown is an early-access commercial version for teams that want help around private model streams or server-side chat rendering.

| Tier | Price | For | Includes |
|------|-------|----------|----------|
| Open Source | Free | Apps that render in the browser | Core package, React wrapper, virtualization, static rendering |
| Pro | $49/mo | Teams using private models | Private model setup, hosted preview links, team API keys, usage logs |
| Cloud Render | $199/mo | Chat UIs that need server-side rendering | Render API, cached transcript HTML, priority support |

Flowdown has 579 monthly npm downloads before any real launch. See [HOSTED.md](HOSTED.md) to request access.

## Install

```bash
npm install @a5omic/flowdown
```

## Usage

```typescript
import { Flowdown } from '@a5omic/flowdown';

const renderer = new Flowdown({
  container: document.getElementById('output'),
});

// Stream tokens as they arrive from the LLM
for await (const chunk of stream) {
  renderer.push(chunk);
}
renderer.end();
```

### React

```bash
npm install @a5omic/flowdown @a5omic/flowdown-react
```

```tsx
import { StreamMarkdown } from '@a5omic/flowdown-react';

function ChatMessage({ content }: { content: string }) {
  return <StreamMarkdown content={content} />;
}
```

### Static Rendering

```typescript
const html = Flowdown.renderToString('# Hello **world**');
// → '<h1>Hello <strong>world</strong></h1>'
```

### With Syntax Highlighting

```typescript
import { Flowdown } from '@a5omic/flowdown';
import hljs from 'highlight.js';

const renderer = new Flowdown({
  container: document.getElementById('output'),
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return code;
  },
});
```

### Viewport Virtualization

For long LLM responses, enable virtualization to keep DOM node count flat:

```typescript
const renderer = new Flowdown({
  container: document.getElementById('output'),
  virtualize: true,
  overscan: 2,
});
```

Off-screen blocks are replaced with height-matched spacers. Scrolling back materializes them from cache.

## How It Works

Traditional markdown renderers parse the entire input into an AST, then render the full AST to DOM on every update. During LLM streaming, this means O(n²) total work.

Flowdown uses an **incremental state machine parser** that:

1. Only processes new characters (never re-parses old content)
2. Emits minimal DOM operations directly (no intermediate AST)
3. Batches DOM writes per animation frame
4. Handles incomplete markdown gracefully (FOIM prevention)
5. Virtualizes off-screen blocks to keep DOM node count constant

Read [RESEARCH.md](RESEARCH.md) for the full technical deep dive.

## API

### `new Flowdown(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | required | DOM element to render into |
| `highlight` | `(code, lang) => string \| Promise<string>` | — | Syntax highlighter for completed code blocks |
| `onCodeBlock` | `(code, lang) => void` | — | Callback when a code block completes |
| `sanitize` | `boolean` | `true` | Sanitize URLs (XSS prevention) |
| `virtualize` | `boolean` | `false` | Enable viewport virtualization |
| `overscan` | `number` | `2` | Blocks to keep rendered outside viewport |

### Instance Methods

- **`push(chunk)`** — Process a chunk of streaming markdown
- **`flush()`** — Materialize the unfinished trailing line without ending the stream
- **`end()`** — Signal end of stream, flush buffered content
- **`reset()`** — Clear all state and output, ready for reuse
- **`destroy()`** — Clean up all resources
- **`getViewportStats()`** — Returns `{ total, visible, virtualized }` block counts

### Static Methods

- **`Flowdown.renderToString(markdown)`** — Parse markdown to HTML string (no DOM required)

## Supported Markdown

Flowdown targets "LLM markdown" — the subset that AI models actually output:

- Headings (`# ## ### ####`)
- Bold, italic, strikethrough, inline code
- Fenced code blocks with language hints
- Links and images (inline syntax)
- Unordered and ordered lists
- Blockquotes (including nested code blocks)
- GFM pipe tables with column alignment
- Horizontal rules

Intentionally not supported (not used by LLMs): reference links, setext headings, indented code blocks, HTML blocks.

## License

MIT
