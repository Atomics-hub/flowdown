import { JSDOM } from 'jsdom'
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Text = dom.window.Text
globalThis.requestAnimationFrame = (fn) => { fn(0); return 0 }
globalThis.cancelAnimationFrame = () => {}
globalThis.IntersectionObserver = undefined
globalThis.getComputedStyle = () => ({ overflowY: 'visible' })

const { Flowdown } = await import('../../packages/core/dist/index.js')

const SMALL = "# Hello\n\nA **bold** paragraph with *italic* and `code`.\n"

// Profile: what costs the most?
const N = 1000

// 1. Just constructor
let s = performance.now()
for (let i = 0; i < N; i++) {
  const c = document.createElement('div')
  new Flowdown({ container: c })
}
console.log(`Constructor only: ${((performance.now()-s)/N*1000).toFixed(1)}µs`)

// 2. Constructor + push (no end)
s = performance.now()
for (let i = 0; i < N; i++) {
  const c = document.createElement('div')
  const f = new Flowdown({ container: c })
  f.push(SMALL)
}
console.log(`Constructor + push: ${((performance.now()-s)/N*1000).toFixed(1)}µs`)

// 3. Full cycle
s = performance.now()
for (let i = 0; i < N; i++) {
  const c = document.createElement('div')
  const f = new Flowdown({ container: c })
  f.push(SMALL)
  f.end()
}
console.log(`Full cycle: ${((performance.now()-s)/N*1000).toFixed(1)}µs`)

// 4. Just createElement overhead
s = performance.now()
for (let i = 0; i < N; i++) {
  document.createElement('div')
}
console.log(`createElement('div'): ${((performance.now()-s)/N*1000).toFixed(1)}µs`)

// 5. cloneNode overhead
const template = document.createElement('div')
s = performance.now()
for (let i = 0; i < N; i++) {
  template.cloneNode(false)
}
console.log(`cloneNode(false): ${((performance.now()-s)/N*1000).toFixed(1)}µs`)

// 6. innerHTML overhead
s = performance.now()
for (let i = 0; i < N; i++) {
  const c = document.createElement('div')
  c.innerHTML = ''
}
console.log(`innerHTML = '': ${((performance.now()-s)/N*1000).toFixed(1)}µs`)

// 7. container.innerHTML = '' (our constructor does this)
s = performance.now()
for (let i = 0; i < N; i++) {
  const c = document.createElement('div')
  c.innerHTML = ''
  const f = new Flowdown({ container: c })
}
console.log(`innerHTML+constructor: ${((performance.now()-s)/N*1000).toFixed(1)}µs`)

// 8. Regex cost
s = performance.now()
for (let i = 0; i < N; i++) {
  SMALL.match(/^(#{1,6})\s+(.*)$/)
  SMALL.match(/^(`{3,}|~{3,})(.*)$/)
  SMALL.match(/^>\s?(.*)$/)
  SMALL.match(/^[-*+]\s+(.*)$/)
}
console.log(`4 regex matches: ${((performance.now()-s)/N*1000).toFixed(1)}µs`)
