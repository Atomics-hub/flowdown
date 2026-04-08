import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Text = dom.window.Text
globalThis.requestAnimationFrame = (fn) => { fn(0); return 0 }
globalThis.cancelAnimationFrame = () => {}

const { Flowdown } = await import('../../packages/core/dist/index.js')

const SAMPLE = Array(8).fill(`# Heading

This is a **streaming** paragraph with *inline* formatting and a [link](https://example.com).

- Item one
- Item two

\`\`\`ts
const answer = 42;
\`\`\`
`).join('\n')

function tokenize(text, chunkSize = 4) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    tokens.push(text.slice(i, i + chunkSize))
    i += chunkSize
  }
  return tokens
}

function bench(name, fn, iterations = 20) {
  for (let i = 0; i < 5; i++) fn()

  const times = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    times.push(performance.now() - start)
  }
  times.sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]
  return { name, median, min: times[0] }
}

function incrementalFlush(tokens) {
  const container = document.createElement('div')
  const flowdown = new Flowdown({ container })
  for (const token of tokens) {
    flowdown.push(token)
    flowdown.flush()
  }
  flowdown.end()
}

function replayFlush(tokens) {
  const container = document.createElement('div')
  const flowdown = new Flowdown({ container })
  let accumulated = ''
  for (const token of tokens) {
    accumulated += token
    flowdown.reset()
    flowdown.push(accumulated)
    flowdown.flush()
  }
  flowdown.end()
}

function incrementalEnd(tokens) {
  const container = document.createElement('div')
  const flowdown = new Flowdown({ container })
  for (const token of tokens) {
    flowdown.push(token)
  }
  flowdown.end()
}

const tokens = tokenize(SAMPLE)
const visibleStream = bench('push+flush append', () => incrementalFlush(tokens))
const replayStream = bench('reset+replay+flush', () => replayFlush(tokens), 10)
const finalOnly = bench('push+end final-only', () => incrementalEnd(tokens))

console.log('=== FLUSH / REACT-STYLE BENCHMARK ===')
console.log(`Document: ${SAMPLE.length} chars, ${tokens.length} tokens`)
console.log(`  push+flush append:   ${visibleStream.median.toFixed(2)}ms median (${visibleStream.min.toFixed(2)}ms min)`)
console.log(`  reset+replay+flush:  ${replayStream.median.toFixed(2)}ms median (${replayStream.min.toFixed(2)}ms min)`)
console.log(`  push+end final-only: ${finalOnly.median.toFixed(2)}ms median (${finalOnly.min.toFixed(2)}ms min)`)
console.log(`  append vs replay:    ${(replayStream.median / visibleStream.median).toFixed(1)}x faster`)
console.log()
