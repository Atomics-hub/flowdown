import { JSDOM } from 'jsdom'
import { marked } from 'marked'
import { SAMPLES } from './samples.js'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Text = dom.window.Text
globalThis.requestAnimationFrame = (fn) => { fn(0); return 0 }
globalThis.cancelAnimationFrame = () => {}

const { Flowdown } = await import('../../packages/core/dist/index.js')

function renderFlowdown(markdown) {
  const container = document.createElement('div')
  const f = new Flowdown({ container, sanitize: true })
  f.push(markdown)
  f.end()
  return container
}

function renderMarked(markdown) {
  const container = document.createElement('div')
  container.innerHTML = marked.parse(markdown)
  return container
}

function getStructure(el) {
  const structure = {
    headings: el.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
    paragraphs: el.querySelectorAll('p').length,
    bold: el.querySelectorAll('strong, b').length,
    italic: el.querySelectorAll('em, i').length,
    code: el.querySelectorAll('code').length,
    codeBlocks: el.querySelectorAll('pre').length,
    links: el.querySelectorAll('a').length,
    lists: el.querySelectorAll('ul, ol').length,
    listItems: el.querySelectorAll('li').length,
    blockquotes: el.querySelectorAll('blockquote').length,
    tables: el.querySelectorAll('table').length,
    tableHeaders: el.querySelectorAll('th').length,
    tableRows: el.querySelectorAll('tr').length,
    hrs: el.querySelectorAll('hr').length,
    strikethrough: el.querySelectorAll('del, s').length,
    images: el.querySelectorAll('img').length,
  }
  return structure
}

console.log('FLOWDOWN CORPUS TEST — Comparing output structure vs marked')
console.log('='.repeat(65))
console.log()

let totalTests = 0
let passed = 0
let failed = 0
const failures = []

for (const sample of SAMPLES) {
  const flowEl = renderFlowdown(sample.markdown)
  const markedEl = renderMarked(sample.markdown)

  const flowStruct = getStructure(flowEl)
  const markedStruct = getStructure(markedEl)

  let samplePassed = true
  const diffs = []

  for (const key of Object.keys(markedStruct)) {
    totalTests++
    const markedVal = markedStruct[key]
    const flowVal = flowStruct[key]

    if (markedVal === 0 && flowVal === 0) {
      passed++
      continue
    }

    if (markedVal === flowVal) {
      passed++
    } else {
      // Allow some tolerance for differences in how we structure things
      // e.g. we might wrap blockquote content differently
      const diff = Math.abs(markedVal - flowVal)
      const tolerance = Math.max(1, Math.floor(markedVal * 0.3))

      if (diff <= tolerance) {
        passed++
        if (diff > 0) {
          diffs.push(`  ~ ${key}: flowdown=${flowVal}, marked=${markedVal} (within tolerance)`)
        }
      } else {
        failed++
        samplePassed = false
        diffs.push(`  ✗ ${key}: flowdown=${flowVal}, marked=${markedVal} (MISMATCH)`)
      }
    }
  }

  const status = samplePassed ? '✔' : '✗'
  console.log(`${status} ${sample.name}`)
  if (diffs.length > 0) {
    for (const d of diffs) console.log(d)
  }

  if (!samplePassed) {
    failures.push(sample.name)
  }
}

console.log()
console.log(`Results: ${passed}/${totalTests} structural checks passed (${failed} failed)`)
if (failures.length > 0) {
  console.log(`Failed samples: ${failures.join(', ')}`)
}

// Also do a text content comparison
console.log()
console.log('--- TEXT CONTENT COMPARISON ---')
for (const sample of SAMPLES) {
  const flowEl = renderFlowdown(sample.markdown)
  const markedEl = renderMarked(sample.markdown)

  const flowText = flowEl.textContent.replace(/\s+/g, ' ').trim()
  const markedText = markedEl.textContent.replace(/\s+/g, ' ').trim()

  // Check if the text content is reasonably similar
  // (exact match is unlikely due to whitespace handling differences)
  const overlap = longestCommonSubstring(flowText, markedText)
  const similarity = overlap / Math.max(flowText.length, markedText.length) * 100

  const status = similarity > 85 ? '✔' : '⚠'
  console.log(`${status} ${sample.name}: ${similarity.toFixed(1)}% text similarity`)
}

function longestCommonSubstring(a, b) {
  // Quick similarity check using shared words
  const wordsA = new Set(a.split(/\s+/))
  const wordsB = new Set(b.split(/\s+/))
  let shared = 0
  let total = 0
  for (const w of wordsA) {
    total++
    if (wordsB.has(w)) shared++
  }
  for (const w of wordsB) {
    if (!wordsA.has(w)) total++
  }
  return shared / total * Math.max(a.length, b.length)
}
