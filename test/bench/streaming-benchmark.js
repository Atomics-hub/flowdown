import { JSDOM } from 'jsdom'
import { marked } from 'marked'
import markdownit from 'markdown-it'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Text = dom.window.Text
globalThis.requestAnimationFrame = (fn) => { fn(0); return 0 }
globalThis.cancelAnimationFrame = () => {}

const { Flowdown } = await import('../../packages/core/dist/index.js')

const SAMPLE = `# Building a Real-Time Chat Application

In this guide, we'll walk through building a **production-ready** chat application using modern web technologies. The focus will be on *performance*, *scalability*, and **developer experience**.

## Architecture Overview

The system consists of three main components:

- **WebSocket Server** — handles real-time message delivery
- **REST API** — manages user authentication and message history
- **Client SDK** — provides a clean interface for frontend integration

> The key insight is that we can decouple the message transport layer from the persistence layer, allowing each to scale independently. This is especially important when dealing with bursty traffic patterns common in chat applications.

## Implementation

### Server Setup

First, let's set up the WebSocket server with proper error handling:

\`\`\`typescript
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

interface Client {
  id: string;
  ws: WebSocket;
  rooms: Set<string>;
}

class ChatServer {
  private clients = new Map<string, Client>();

  constructor(private port: number) {
    const server = createServer();
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
      const token = new URL(req.url!, \`http://localhost\`).searchParams.get('token');
      if (!token) {
        ws.close(4001, 'Auth required');
        return;
      }
      this.handleConnection(ws, { sub: token });
    });

    server.listen(port);
  }

  broadcast(room: string, message: object) {
    const payload = JSON.stringify(message);
    for (const [id, client] of this.clients) {
      if (client.rooms.has(room) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }
}
\`\`\`

### Message Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique message ID |
| room | string | Yes | Target room |
| sender | string | Yes | User ID |
| content | string | Yes | Message body |
| timestamp | number | Yes | Unix timestamp |
| edited | boolean | No | Edited flag |

### Client Usage

\`\`\`typescript
import { ChatClient } from '@chat/sdk';

const chat = new ChatClient({
  url: 'wss://chat.example.com',
  token: await getAuthToken(),
});

await chat.join('general');
await chat.send('general', { content: 'Hello **world**!' });

chat.on('message', (msg) => {
  console.log(\`[\${msg.room}] \${msg.sender}: \${msg.content}\`);
});
\`\`\`

## Performance

1. **Connection pooling** — reduces overhead
2. **Message batching** — reduces frame count
3. **Lazy loading** — cursor-based pagination
4. **Compression** — \`permessage-deflate\`

---

That's it — a complete chat system.`

function tokenize(text, avgChunkSize = 4) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    const len = Math.max(1, Math.floor(Math.random() * avgChunkSize * 2) + 1)
    tokens.push(text.slice(i, i + len))
    i += len
  }
  return tokens
}

function benchmarkFlowdownStreaming(tokens) {
  const container = document.createElement('div')
  const f = new Flowdown({ container, sanitize: true })
  const start = performance.now()
  for (const token of tokens) {
    f.push(token)
  }
  f.end()
  return performance.now() - start
}

function benchmarkMarkedStreaming(tokens) {
  const container = document.createElement('div')
  let accumulated = ''
  const start = performance.now()
  for (const token of tokens) {
    accumulated += token
    container.innerHTML = marked.parse(accumulated)
  }
  return performance.now() - start
}

function benchmarkMarkdownItStreaming(tokens) {
  const md = markdownit()
  const container = document.createElement('div')
  let accumulated = ''
  const start = performance.now()
  for (const token of tokens) {
    accumulated += token
    container.innerHTML = md.render(accumulated)
  }
  return performance.now() - start
}

function benchmarkFlowdownSingleParse(text) {
  const container = document.createElement('div')
  const f = new Flowdown({ container, sanitize: true })
  const start = performance.now()
  f.push(text)
  f.end()
  return performance.now() - start
}

function benchmarkMarkedSingleParse(text) {
  const start = performance.now()
  marked.parse(text)
  return performance.now() - start
}

function benchmarkMarkdownItSingleParse(text) {
  const md = markdownit()
  const start = performance.now()
  md.render(text)
  return performance.now() - start
}

function runBenchmark(name, fn, iterations = 5) {
  // Warmup
  for (let i = 0; i < 3; i++) fn()

  const times = []
  for (let i = 0; i < iterations; i++) {
    times.push(fn())
  }
  times.sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = times[0]
  return { name, median, avg, min, times }
}

console.log('=' .repeat(70))
console.log('FLOWDOWN BENCHMARK — Streaming Markdown Performance')
console.log('='.repeat(70))
console.log()

const tokens = tokenize(SAMPLE)
console.log(`Document: ${SAMPLE.length} chars, ${tokens.length} tokens (avg ~4 chars/token)`)
console.log()

// --- Streaming benchmark (the key one) ---
console.log('--- STREAMING BENCHMARK (simulates LLM token-by-token delivery) ---')
console.log('Each library re-parses on every token (except Flowdown which is incremental)')
console.log()

const flowStream = runBenchmark('Flowdown (incremental)', () => benchmarkFlowdownStreaming(tokens), 10)
const markedStream = runBenchmark('marked (re-parse)', () => benchmarkMarkedStreaming(tokens), 10)
const mditStream = runBenchmark('markdown-it (re-parse)', () => benchmarkMarkdownItStreaming(tokens), 10)

console.log(`  Flowdown:    ${flowStream.median.toFixed(2)}ms median (${flowStream.min.toFixed(2)}ms min)`)
console.log(`  marked:      ${markedStream.median.toFixed(2)}ms median (${markedStream.min.toFixed(2)}ms min)`)
console.log(`  markdown-it: ${mditStream.median.toFixed(2)}ms median (${mditStream.min.toFixed(2)}ms min)`)
console.log()
console.log(`  Flowdown vs marked:      ${(markedStream.median / flowStream.median).toFixed(1)}x faster`)
console.log(`  Flowdown vs markdown-it: ${(mditStream.median / flowStream.median).toFixed(1)}x faster`)
console.log()

// --- Single parse benchmark ---
console.log('--- SINGLE PARSE BENCHMARK (full document, one shot) ---')
console.log()

const flowSingle = runBenchmark('Flowdown', () => benchmarkFlowdownSingleParse(SAMPLE), 20)
const markedSingle = runBenchmark('marked', () => benchmarkMarkedSingleParse(SAMPLE), 20)
const mditSingle = runBenchmark('markdown-it', () => benchmarkMarkdownItSingleParse(SAMPLE), 20)

console.log(`  Flowdown:    ${flowSingle.median.toFixed(3)}ms median`)
console.log(`  marked:      ${markedSingle.median.toFixed(3)}ms median`)
console.log(`  markdown-it: ${mditSingle.median.toFixed(3)}ms median`)
console.log()

// --- Scale test ---
console.log('--- SCALE TEST (10x document, streaming) ---')
const bigSample = Array(10).fill(SAMPLE).join('\n\n---\n\n')
const bigTokens = tokenize(bigSample)
console.log(`Document: ${bigSample.length} chars, ${bigTokens.length} tokens`)
console.log()

const flowBig = runBenchmark('Flowdown (incremental)', () => benchmarkFlowdownStreaming(bigTokens), 5)
const markedBig = runBenchmark('marked (re-parse)', () => benchmarkMarkedStreaming(bigTokens), 5)
const mditBig = runBenchmark('markdown-it (re-parse)', () => benchmarkMarkdownItStreaming(bigTokens), 5)

console.log(`  Flowdown:    ${flowBig.median.toFixed(1)}ms median`)
console.log(`  marked:      ${markedBig.median.toFixed(1)}ms median`)
console.log(`  markdown-it: ${mditBig.median.toFixed(1)}ms median`)
console.log()
console.log(`  Flowdown vs marked:      ${(markedBig.median / flowBig.median).toFixed(1)}x faster`)
console.log(`  Flowdown vs markdown-it: ${(mditBig.median / flowBig.median).toFixed(1)}x faster`)
console.log()

// --- Per-token cost analysis ---
console.log('--- PER-TOKEN COST (streaming, microseconds per token) ---')
console.log()
console.log(`  Small doc (${tokens.length} tokens):`)
console.log(`    Flowdown:    ${(flowStream.median / tokens.length * 1000).toFixed(1)}µs/token`)
console.log(`    marked:      ${(markedStream.median / tokens.length * 1000).toFixed(1)}µs/token`)
console.log(`    markdown-it: ${(mditStream.median / tokens.length * 1000).toFixed(1)}µs/token`)
console.log()
console.log(`  Large doc (${bigTokens.length} tokens):`)
console.log(`    Flowdown:    ${(flowBig.median / bigTokens.length * 1000).toFixed(1)}µs/token`)
console.log(`    marked:      ${(markedBig.median / bigTokens.length * 1000).toFixed(1)}µs/token`)
console.log(`    markdown-it: ${(mditBig.median / bigTokens.length * 1000).toFixed(1)}µs/token`)
console.log()
console.log('KEY INSIGHT: Flowdown per-token cost stays ~constant as document grows.')
console.log('Traditional parsers per-token cost grows linearly (O(n²) total).')
console.log()
console.log('='.repeat(70))
