# Why Every Streaming Markdown Renderer Is Slow (And How Flowdown Fixes It)

## The Problem

Every AI application renders markdown from LLM output. The dominant library is `react-markdown` (10M+ weekly downloads), which was designed for static content in 2015. When used with streaming — the primary use case in 2026 — it has a fundamental performance flaw.

### The O(n²) Problem

Here's what happens when an LLM streams 1,000 tokens:

```
Token 1:   parse("Hello")                    → 5 chars processed
Token 2:   parse("Hello wo")                 → 8 chars processed
Token 3:   parse("Hello world")              → 11 chars processed
...
Token 1000: parse("Hello world ... [entire response]") → 15,000 chars processed
```

Total work: 5 + 8 + 11 + ... + 15,000 ≈ **7.5 million characters parsed**.

For a document that's only 15,000 characters long, the parser processes 500x more data than necessary. This is O(n²) in the number of tokens. It gets worse as responses get longer.

On each token, the full pipeline runs:
1. Parse entire accumulated string into AST (remark/micromark)
2. Transform AST through plugins (remark-gfm, remark-math, etc.)
3. Convert AST to React elements (rehype-react)
4. React reconciles entire component tree
5. Browser performs layout

Steps 1-4 are pure waste — we're re-doing work that was already done for all previous tokens.

### Why Existing Parsers Can't Stream

The CommonMark specification has **forward dependencies** that prevent true streaming:

```markdown
This contains a [link][ref].

[ref]: https://example.com
```

The reference link definition on line 3 affects how line 1 is parsed. A streaming parser can't know if a reference will appear later. This is why micromark's "streaming" mode still buffers the entire document before compilation.

However, **LLMs don't use reference links**. They output inline links `[text](url)` exclusively. By targeting the markdown subset that LLMs actually produce, we eliminate the forward-dependency problem entirely.

## How Existing Parsers Work

### marked (34M weekly downloads)

**Architecture:** Regex-based, two-pass.

Pass 1 (Block Lexer) iterates through the source in a `while(src)` loop, applying 60+ regex patterns. Each match consumes text via `src.substring(match.length)`, creating a new string allocation per token — O(n) allocations for n tokens in the source.

Pass 2 (Inline Lexer) re-scans all text content for inline formatting.

**Bundle:** 12KB gzipped. **Streaming:** None.

### markdown-it (21M weekly downloads)

**Architecture:** Regex-based with character-code dispatch, three-pass pipeline (Core → Block → Inline).

Fastest pure-JS parser on large inputs. HTML escaping alone consumes ~30% of execution time (measured in their PR #748). The plugin system (`Ruler`) adds per-rule dispatch overhead.

**Bundle:** 51KB gzipped. **Streaming:** None.

### micromark (used by react-markdown via remark)

**Architecture:** Character-by-character state machine, four-stage pipeline.

Processes every byte through a JavaScript function call, making it 17.5x slower than markdown-it on large inputs. This is the price of 100% CommonMark compliance with full positional information.

Has a `stream()` interface but it buffers everything before compilation. The maintainer explicitly states performance is "fourth priority."

**Bundle:** 15KB gzipped. **Streaming:** Fake (buffers then compiles).

### react-markdown

**Architecture:** micromark → remark AST → rehype AST → React elements.

Five-stage pipeline where each stage walks the full document. Uses `React.createElement` for every node, triggering React's reconciliation on every update.

**Bundle:** 35KB gzipped (plus remark + rehype + micromark). **Streaming:** Rebuilds everything per token.

## How Flowdown Works

### Incremental State Machine

Flowdown maintains a minimal state machine that processes only new characters:

```
Token arrives → State machine processes ONLY the delta
             → Identifies structural change (new block? inline toggle?)
             → Emits minimal DOM operation (append text, create element)
             → Batches DOM writes per animation frame
```

Total work for 1,000 tokens: exactly 15,000 characters — one pass, O(n).

### No AST

Traditional parsers build an intermediate Abstract Syntax Tree, then walk it to produce output. Flowdown skips the AST entirely. The state machine emits DOM operations directly as it processes characters.

This eliminates:
- AST node allocation (object creation + GC pressure)
- AST traversal (walking the tree to render)
- AST-to-output conversion (rehype-react, string concatenation)

### Surgical DOM Updates

Instead of replacing innerHTML or reconciling a virtual DOM tree:

- New text is appended to existing Text nodes via `textContent +=`
- New elements are created via `document.createElement` and appended
- Completed blocks are never touched again
- All writes are batched in a single `requestAnimationFrame`

This means the browser never has to re-layout content that hasn't changed.

### LLM Markdown Subset

By targeting the markdown that LLMs actually output, we avoid CommonMark's complexity:

| Feature | CommonMark | LLM Output | Flowdown |
|---------|-----------|------------|----------|
| ATX headings (`#`) | Yes | Yes | Yes |
| Setext headings (underline) | Yes | No | No |
| Reference links | Yes | No | No |
| Inline links | Yes | Yes | Yes |
| Fenced code blocks | Yes | Yes | Yes |
| Indented code blocks | Yes | No | No |
| Bold, italic, strikethrough | Yes | Yes | Yes |
| GFM tables | Extension | Yes | Yes |
| HTML blocks | Yes | Rare | Sanitized |
| Nested emphasis edge cases | 17 rules | No | No |

This isn't a limitation — it's a design choice. LLMs output clean, predictable markdown. Parsing arbitrary hand-written markdown with all its edge cases is a different (and solved) problem.

### FOIM Prevention

Flash of Incomplete Markdown occurs when partial syntax is rendered:

```
Token: "Click ["        → renders: Click [
Token: "Click [here"     → renders: Click [here
Token: "Click [here]("   → renders: Click [here](
Token: "Click [here](u)" → renders: Click here  (as a proper link)
```

The first three states show raw markdown syntax to the user. Flowdown's line-buffered approach naturally prevents most FOIM: since we process complete lines, inline formatting within a line is resolved before rendering. For cross-line constructs (code fences), we buffer until the construct is resolved.

## Bundle Size

| Library | Minified | Gzipped |
|---------|----------|---------|
| **Flowdown** | **~10KB** | **~2.5KB** |
| marked | 40KB | 12KB |
| micromark | 52KB | 15KB |
| react-markdown (+ deps) | 114KB | 35KB |
| markdown-it | 144KB | 51KB |

Flowdown is 5-20x smaller than alternatives because:
- Zero dependencies
- No AST data structures
- No plugin system
- No CommonMark edge case handling
- No virtual DOM layer

## Performance

### Theoretical Complexity

| Operation | react-markdown | Flowdown |
|-----------|---------------|----------|
| Parse per token | O(n) where n = total accumulated text | O(k) where k = token length |
| Total parse for N tokens | O(N × n) = O(n²) | O(n) |
| DOM updates per token | Full tree reconciliation | Append only |
| Memory allocation | New AST per token | Constant |

### Where It Matters

For a short response (100 tokens, 500 chars), the difference is negligible.

For a long response (2,000 tokens, 20KB), react-markdown processes ~200MB of text total. Flowdown processes 20KB.

For the stress test (10x repeated content, 200KB), react-markdown processes ~20GB total. Flowdown processes 200KB.

The longer the response, the more dramatic the difference.

## Design Decisions

### Why Not WASM?

OpenUI [recently discovered](https://www.openui.com/blog/rust-wasm-parser) that their Rust/WASM parser was 3x slower than a TypeScript rewrite. The WASM boundary overhead (serialization between JS heap and WASM linear memory) dominates for small, frequent operations like processing streaming tokens. Pure TypeScript on V8's JIT is the right choice here.

### Why Not Canvas Rendering?

Google Docs moved to Canvas rendering in 2021. It works, but requires reimplementing: text selection, accessibility (screen readers), IME input (CJK), spell check, find-and-replace, and browser extension compatibility. That's 50 engineers, not a weekend project. DOM rendering with surgical updates is the sweet spot.

### Why Not Virtual DOM?

React's reconciliation algorithm is optimized for arbitrary UI trees. Markdown rendering is a special case: content is append-only during streaming, and completed blocks never change. A virtual DOM adds overhead (diffing, fiber tree, scheduler) for capabilities we don't need.

### Why Line-Buffered?

Processing character-by-character (like micromark) incurs a function call per byte — tens of thousands of calls for a typical response. Line buffering amortizes this cost: we accumulate characters until a newline, then process the complete line. This naturally aligns with how markdown works (block-level constructs are line-oriented) and provides FOIM prevention for free.

## References

- [CommonMark Spec](https://spec.commonmark.org/) — The 100+ page specification that defines markdown's edge cases
- [Chrome DevRel: Best practices to render streamed LLM responses](https://developer.chrome.com/docs/ai/render-llm-responses) — Google's official guidance on this problem
- [Streak Engineering: Preventing Flash of Incomplete Markdown](https://engineering.streak.com/p/preventing-unstyled-markdown-streaming-ai) — FOIM coined here
- [OpenUI: Rewriting our Rust WASM Parser in TypeScript](https://www.openui.com/blog/rust-wasm-parser) — Why WASM is wrong for streaming parsers
- [Pretext](https://github.com/chenglou/pretext) — Inspiration for the "bypass the browser, do it in userland" approach
- [Vercel Streamdown](https://github.com/vercel/streamdown) — The current best streaming solution (React-only, marked-based)
