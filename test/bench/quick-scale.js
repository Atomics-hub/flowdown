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

const SAMPLE = `# Heading\n\nA paragraph with **bold**, *italic*, and \`code\`.\n\n## Sub heading\n\n- Item 1\n- Item 2\n- Item 3\n\n> A blockquote with some text.\n\n\`\`\`javascript\nconst x = 1;\nconsole.log(x);\n\`\`\`\n\n| Col A | Col B |\n|-------|-------|\n| 1 | 2 |\n\n---\n\nSome [link](https://example.com) here.\n`

function tokenize(text) {
  const tokens = []
  let i = 0
  while (i < text.length) {
    const len = Math.floor(Math.random() * 6) + 2
    tokens.push(text.slice(i, i + len))
    i += len
  }
  return tokens
}

console.log('SCALE TEST: How per-token cost grows with document size')
console.log('='.repeat(60))
console.log()

for (const multiplier of [1, 3, 5, 10]) {
  const doc = Array(multiplier).fill(SAMPLE).join('\n\n')
  const tokens = tokenize(doc)

  // Flowdown
  const container1 = document.createElement('div')
  const f = new Flowdown({ container: container1 })
  const fStart = performance.now()
  for (const t of tokens) f.push(t)
  f.end()
  const flowTime = performance.now() - fStart

  // marked
  const container2 = document.createElement('div')
  let acc = ''
  const mStart = performance.now()
  for (const t of tokens) {
    acc += t
    container2.innerHTML = marked.parse(acc)
  }
  const markedTime = performance.now() - mStart

  const perTokenFlow = (flowTime / tokens.length * 1000).toFixed(1)
  const perTokenMarked = (markedTime / tokens.length * 1000).toFixed(1)
  const speedup = (markedTime / flowTime).toFixed(0)

  console.log(`${multiplier}x doc (${doc.length} chars, ${tokens.length} tokens):`)
  console.log(`  Flowdown: ${flowTime.toFixed(1)}ms total, ${perTokenFlow}µs/token`)
  console.log(`  marked:   ${markedTime.toFixed(1)}ms total, ${perTokenMarked}µs/token`)
  console.log(`  Speedup:  ${speedup}x`)
  console.log()
}

console.log('KEY: Flowdown µs/token stays ~constant. marked µs/token grows linearly.')
