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

const SMALL = "# Hello\n\nA **bold** paragraph with *italic* and `code`.\n"
const MEDIUM = Array(10).fill("# Heading\n\nA **bold** paragraph with *italic*, `code`, and [link](http://x.com).\n\n- Item 1\n- Item 2\n\n> Quote\n\n```js\nconst x = 1;\n```\n").join("\n")
const LARGE = Array(50).fill("# Heading\n\nA **bold** paragraph with *italic*, `code`, and [link](http://x.com).\n\n- Item 1\n- Item 2\n\n> Quote here\n\n```js\nconst x = 1;\nconsole.log(x);\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n").join("\n")

function bench(name, fn, iterations = 100) {
  for (let i = 0; i < 10; i++) fn() // warmup
  const times = []
  for (let i = 0; i < iterations; i++) {
    const s = performance.now()
    fn()
    times.push(performance.now() - s)
  }
  times.sort((a, b) => a - b)
  return { name, median: times[Math.floor(times.length/2)], p95: times[Math.floor(times.length*0.95)], min: times[0] }
}

console.log("=== COMPREHENSIVE BENCHMARK ===\n")

for (const [label, doc] of [["SMALL ("+SMALL.length+"B)", SMALL], ["MEDIUM ("+MEDIUM.length+"B)", MEDIUM], ["LARGE ("+LARGE.length+"B)", LARGE]]) {
  console.log(`--- ${label} ---`)
  
  // Single parse: string output (marked/mdit produce strings, flowdown produces DOM)
  const markedStr = bench("marked→string", () => marked.parse(doc))
  const mditStr = bench("mdit→string", () => markdownit().render(doc))
  
  // Single parse: full DOM (marked string → innerHTML, vs flowdown direct DOM)
  const markedDom = bench("marked→DOM", () => {
    const c = document.createElement('div')
    c.innerHTML = marked.parse(doc)
  })
  const mditDom = bench("mdit→DOM", () => {
    const c = document.createElement('div')
    c.innerHTML = markdownit().render(doc)
  })
  const flowDom = bench("flowdown→DOM", () => {
    const c = document.createElement('div')
    const f = new Flowdown({ container: c })
    f.push(doc)
    f.end()
  })

  console.log(`  marked→string:  ${markedStr.median.toFixed(3)}ms`)
  console.log(`  mdit→string:    ${mditStr.median.toFixed(3)}ms`)
  console.log(`  marked→DOM:     ${markedDom.median.toFixed(3)}ms`)
  console.log(`  mdit→DOM:       ${mditDom.median.toFixed(3)}ms`)
  console.log(`  flowdown→DOM:   ${flowDom.median.toFixed(3)}ms`)
  console.log(`  flowdown vs marked→DOM: ${(markedDom.median / flowDom.median).toFixed(2)}x`)
  console.log()
}

// Streaming benchmark - the key one
console.log("--- STREAMING (617 tokens, 2.7KB doc) ---")
const STREAM_DOC = Array(5).fill("# Heading\n\nA **bold** paragraph with *italic*, `code`, and [link](http://x.com).\n\n- Item 1\n- Item 2\n\n> Quote\n\n```js\nconst x = 1;\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n").join("\n")

function tokenize(text) {
  const t = []; let i = 0
  while (i < text.length) { const l = Math.floor(Math.random()*6)+2; t.push(text.slice(i,i+l)); i+=l }
  return t
}
const tokens = tokenize(STREAM_DOC)
console.log(`  ${tokens.length} tokens, ${STREAM_DOC.length} chars`)

const flowStream = bench("flowdown streaming", () => {
  const c = document.createElement('div')
  const f = new Flowdown({ container: c })
  for (const t of tokens) f.push(t)
  f.end()
}, 20)

const markedStream = bench("marked streaming", () => {
  const c = document.createElement('div')
  let acc = ''
  for (const t of tokens) { acc += t; c.innerHTML = marked.parse(acc) }
}, 5)

console.log(`  flowdown: ${flowStream.median.toFixed(2)}ms`)
console.log(`  marked:   ${markedStream.median.toFixed(2)}ms`)
console.log(`  speedup:  ${(markedStream.median / flowStream.median).toFixed(0)}x`)
console.log()

// Memory: count DOM nodes created
console.log("--- DOM NODE COUNT ---")
for (const [label, doc] of [["SMALL", SMALL], ["MEDIUM", MEDIUM], ["LARGE", LARGE]]) {
  const fc = document.createElement('div')
  const f = new Flowdown({ container: fc })
  f.push(doc); f.end()
  const flowNodes = fc.querySelectorAll('*').length

  const mc = document.createElement('div')
  mc.innerHTML = marked.parse(doc)
  const markedNodes = mc.querySelectorAll('*').length

  console.log(`  ${label}: flowdown=${flowNodes} nodes, marked=${markedNodes} nodes`)
}
