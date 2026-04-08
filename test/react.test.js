import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Text = dom.window.Text
globalThis.Node = dom.window.Node
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
})
globalThis.requestAnimationFrame = (fn) => { fn(0); return 0 }
globalThis.cancelAnimationFrame = () => {}
globalThis.getComputedStyle = dom.window.getComputedStyle
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { StreamMarkdown } = await import('../packages/react/dist/index.js')

const mounted = []

afterEach(async () => {
  while (mounted.length > 0) {
    const { root, host } = mounted.pop()
    await act(async () => {
      root.unmount()
    })
    host.remove()
  }
})

function mount(element) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push({ root, host })
  return { root, host }
}

describe('StreamMarkdown React integration', () => {
  it('renders content without a trailing newline', async () => {
    const { root, host } = mount(React.createElement(StreamMarkdown, { content: 'Hello world' }))

    await act(async () => {
      root.render(React.createElement(StreamMarkdown, { content: 'Hello world' }))
    })

    assert.ok(host.textContent?.includes('Hello world'))
  })

  it('updates incrementally as content grows', async () => {
    const { root, host } = mount(React.createElement(StreamMarkdown, { content: '' }))

    await act(async () => {
      root.render(React.createElement(StreamMarkdown, { content: 'Hello' }))
    })
    assert.strictEqual(host.textContent, 'Hello')

    await act(async () => {
      root.render(React.createElement(StreamMarkdown, { content: 'Hello world' }))
    })
    assert.strictEqual(host.textContent, 'Hello world')
  })

  it('replays current content when renderer options change', async () => {
    const content = '[x](javascript:evil)'
    const { root, host } = mount(React.createElement(StreamMarkdown, { content, sanitize: true }))

    await act(async () => {
      root.render(React.createElement(StreamMarkdown, { content, sanitize: true }))
    })
    assert.strictEqual(host.querySelector('a')?.getAttribute('href'), '')

    await act(async () => {
      root.render(React.createElement(StreamMarkdown, { content, sanitize: false }))
    })
    assert.strictEqual(host.querySelector('a')?.getAttribute('href'), 'javascript:evil')
  })
})
