import { JSDOM } from 'jsdom'
import markdownit from 'markdown-it'
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Text = dom.window.Text
globalThis.requestAnimationFrame = (fn) => { fn(0); return 0 }
globalThis.cancelAnimationFrame = () => {}
globalThis.IntersectionObserver = undefined
globalThis.getComputedStyle = () => ({ overflowY: 'visible' })

const { Flowdown } = await import('../../packages/core/dist/index.js')
const md = markdownit()

const LARGE = Array(50).fill("# Heading\n\nA **bold** paragraph with *italic*, `code`, and [link](http://x.com).\n\n- Item 1\n- Item 2\n\n> Quote here\n\n```js\nconst x = 1;\nconsole.log(x);\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n").join("\n")

function bench(fn, n=200) {
  for (let i = 0; i < 30; i++) fn()
  const t = []
  for (let i = 0; i < n; i++) { const s = performance.now(); fn(); t.push(performance.now()-s) }
  t.sort((a,b) => a-b)
  return t[Math.floor(t.length/2)]
}

const fw = bench(() => Flowdown.renderToString(LARGE))
const mi = bench(() => md.render(LARGE))
console.log(`Large string (${LARGE.length}B):`)
console.log(`  Flowdown:    ${fw.toFixed(3)}ms`)
console.log(`  markdown-it: ${mi.toFixed(3)}ms`)
console.log(`  Winner:      ${fw < mi ? 'Flowdown' : 'markdown-it'} by ${Math.abs(fw-mi).toFixed(3)}ms`)
