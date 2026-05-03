# flowdown-react

React wrapper for [@a5omic/flowdown](https://www.npmjs.com/package/@a5omic/flowdown).

`@a5omic/flowdown-react` keeps Flowdown's incremental parser path while still rendering the unfinished trailing line during React updates.

## Hosted Flowdown

Flowdown stays MIT and local-first. Hosted Flowdown adds early-access private model support at $49/mo and server-side chat rendering at $199/mo.

See [HOSTED.md](https://github.com/Atomics-hub/flowdown/blob/main/HOSTED.md) to request access.

## Install

```bash
npm install react react-dom @a5omic/flowdown @a5omic/flowdown-react
```

## Component

```tsx
import { StreamMarkdown } from '@a5omic/flowdown-react'

export function ChatMessage({ content }: { content: string }) {
  return <StreamMarkdown content={content} />
}
```

## Hook

```tsx
import { useEffect } from 'react'
import { useStreamMarkdown } from '@a5omic/flowdown-react'

export function LiveMessage({ chunks }: { chunks: string[] }) {
  const { ref, push, flush, end } = useStreamMarkdown()

  useEffect(() => {
    for (const chunk of chunks) {
      push(chunk)
      flush()
    }
    end()
  }, [chunks, push, flush, end])

  return <div ref={ref} />
}
```

## API

### `StreamMarkdown`

Props:

- `content: string` — Full markdown content received so far
- `className?: string`
- `style?: CSSProperties`
- `highlight?: (code, lang) => string | Promise<string>`
- `onCodeBlock?: (code, lang) => void`
- `sanitize?: boolean`
- `virtualize?: boolean`

### `useStreamMarkdown(options?)`

Returns:

- `ref` — Attach to the container element
- `push(chunk)` — Append new markdown content
- `flush()` — Materialize the unfinished trailing line without ending the stream
- `end()` — Finalize the current stream
- `reset()` — Clear all output and parser state

## License

MIT
