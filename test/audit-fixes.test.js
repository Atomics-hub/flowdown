import { describe, it } from 'node:test'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Text = dom.window.Text
globalThis.requestAnimationFrame = (fn) => { fn(0); return 0 }
globalThis.cancelAnimationFrame = () => {}

const { Flowdown } = await import('../packages/core/dist/index.js')

function render(markdown) {
  const container = document.createElement('div')
  const f = new Flowdown({ container, sanitize: true })
  f.push(markdown)
  f.end()
  return container
}

describe('codeLang XSS in renderToString', () => {
  it('escapes code language in class attribute', () => {
    const html = Flowdown.renderToString('```"><script>alert(1)</script>\ncode\n```')
    assert.ok(!html.includes('<script>'), 'script tag should be escaped in code lang')
    assert.ok(html.includes('&lt;script&gt;') || html.includes('&gt;'), 'should contain escaped HTML')
  })

  it('escapes quotes in code language', () => {
    const html = Flowdown.renderToString('```js" onload="alert(1)\ncode\n```')
    assert.ok(!html.includes(' onload='), 'onload should not appear as attribute')
  })
})

describe('destroy lifecycle', () => {
  it('destroy does not crash', () => {
    const container = document.createElement('div')
    const f = new Flowdown({ container })
    f.push('# Hello\n\nWorld\n')
    f.end()
    f.destroy()
    assert.ok(true, 'destroy should not throw')
  })

  it('destroy then push does not crash', () => {
    const container = document.createElement('div')
    const f = new Flowdown({ container })
    f.push('# Hello\n')
    f.end()
    f.destroy()
    f.push('more content') // should be silently ignored (done=true)
    assert.ok(true, 'push after destroy should not throw')
  })

  it('reset allows reuse', () => {
    const container = document.createElement('div')
    const f = new Flowdown({ container })
    f.push('# First\n')
    f.end()
    f.reset()
    f.push('# Second\n')
    f.end()
    const h1 = container.querySelector('h1')
    assert.ok(h1)
    assert.strictEqual(h1.textContent, 'Second')
  })
})

describe('unterminated fenced code blocks at EOF', () => {
  it('keeps the final code line inside the block when the closing fence is missing', () => {
    const el = render('```js\nconst x = 1;')
    const code = el.querySelector('code')
    assert.ok(code, 'Should render a code block')
    assert.strictEqual(code.textContent, 'const x = 1;')
    assert.strictEqual(el.querySelectorAll('p').length, 0, 'Should not emit stray paragraphs')
  })

  it('accepts a closing fence without a trailing newline', () => {
    const el = render('```js\nconst x = 1;\n```')
    const code = el.querySelector('code')
    assert.ok(code, 'Should render a code block')
    assert.strictEqual(code.textContent, 'const x = 1;\n')
    assert.strictEqual(el.querySelectorAll('p').length, 0, 'Should not emit stray paragraphs')
  })

  it('keeps blockquote code blocks intact at EOF', () => {
    const el = render('> ```js\n> const x = 1;')
    const blockquote = el.querySelector('blockquote')
    const code = el.querySelector('code')
    assert.ok(blockquote, 'Should render a blockquote')
    assert.ok(code, 'Should render a code block inside the blockquote')
    assert.strictEqual(code.textContent, 'const x = 1;')
    assert.strictEqual(blockquote.querySelectorAll('p').length, 0, 'Should not create stray paragraphs inside the blockquote')
  })
})

describe('wrapperPending desync — consecutive blocks in single push', () => {
  it('renders two paragraphs separated by blank line in single push', () => {
    const el = render('First paragraph\n\nSecond paragraph\n')
    const paragraphs = el.querySelectorAll('p')
    assert.strictEqual(paragraphs.length, 2, 'Should render 2 separate paragraphs')
    assert.ok(paragraphs[0].textContent.includes('First'))
    assert.ok(paragraphs[1].textContent.includes('Second'))
  })

  it('renders heading then paragraph in single push', () => {
    const el = render('# Title\n\nParagraph text\n')
    assert.ok(el.querySelector('h1'))
    assert.ok(el.querySelector('p'))
    assert.strictEqual(el.querySelector('h1').textContent, 'Title')
    assert.strictEqual(el.querySelector('p').textContent, 'Paragraph text')
  })

  it('renders multiple blocks in single push', () => {
    const el = render('# H1\n\nPara 1\n\n## H2\n\nPara 2\n\n- List item\n')
    assert.strictEqual(el.querySelectorAll('h1').length, 1)
    assert.strictEqual(el.querySelectorAll('h2').length, 1)
    assert.strictEqual(el.querySelectorAll('p').length, 2)
    assert.strictEqual(el.querySelectorAll('li').length, 1)
  })
})

describe('blockquote with unclosed inline formatting', () => {
  it('handles unclosed bold in blockquote followed by empty blockquote line', () => {
    const el = render('> **bold text\n>\n> Next line\n')
    const bq = el.querySelector('blockquote')
    assert.ok(bq, 'Should have blockquote')
    assert.ok(bq.textContent.includes('bold text'))
    assert.ok(bq.textContent.includes('Next line'))
  })

  it('handles unclosed italic in blockquote followed by new paragraph', () => {
    const el = render('> *italic text\n>\n> New para\n')
    const bq = el.querySelector('blockquote')
    assert.ok(bq, 'Should have blockquote')
  })

  it('content after blockquote is not inside blockquote', () => {
    const el = render('> Quote with **unclosed bold\n\nNormal paragraph\n')
    const bq = el.querySelector('blockquote')
    assert.ok(bq)
    const p = el.querySelector('p:not(blockquote p)')
    // The paragraph outside the blockquote
    const allPs = el.querySelectorAll('p')
    assert.ok(allPs.length >= 2, 'Should have at least 2 paragraphs (one in bq, one outside)')
  })
})

describe('inline state after closeAllInline', () => {
  it('handles bold then italic in same paragraph', () => {
    const el = render('**bold** then *italic* text')
    assert.ok(el.querySelector('strong'))
    assert.ok(el.querySelector('em'))
  })

  it('handles italic then bold in same paragraph', () => {
    const el = render('*italic* then **bold** text')
    assert.ok(el.querySelector('em'))
    assert.ok(el.querySelector('strong'))
  })

  it('content after inline formatting is in correct parent', () => {
    const el = render('**bold** normal text here\n\nNew paragraph')
    const paragraphs = el.querySelectorAll('p')
    assert.strictEqual(paragraphs.length, 2)
    // "normal text here" should be in first paragraph, not inside <strong>
    const strong = el.querySelector('strong')
    assert.strictEqual(strong.textContent, 'bold')
  })
})

describe('virtualization with async highlighting', () => {
  it('preserves highlighted code after a block is virtualized and rematerialized', async () => {
    const originalGetComputedStyle = globalThis.getComputedStyle
    const originalIntersectionObserver = globalThis.IntersectionObserver

    class FakeIntersectionObserver {
      static instance = null

      constructor(callback) {
        this.callback = callback
        FakeIntersectionObserver.instance = this
      }

      observe() {}
      disconnect() {}

      fire(entry) {
        this.callback([entry])
      }
    }

    globalThis.getComputedStyle = () => ({ overflowY: 'auto' })
    globalThis.IntersectionObserver = FakeIntersectionObserver

    try {
      const container = document.createElement('div')
      const f = new Flowdown({
        container,
        virtualize: true,
        highlight: async (code) => `<span class="hl">${code}</span>`,
      })

      f.push('```js\nconst x = 1;\n```\n')
      f.end()

      const wrapper = container.firstElementChild
      assert.ok(wrapper, 'Should render a wrapper block')

      FakeIntersectionObserver.instance.fire({ target: wrapper, isIntersecting: false })
      await Promise.resolve()
      FakeIntersectionObserver.instance.fire({ target: wrapper, isIntersecting: true })
      await Promise.resolve()

      assert.ok(container.innerHTML.includes('<span class="hl">const x = 1;\n</span>'))
    } finally {
      globalThis.getComputedStyle = originalGetComputedStyle
      globalThis.IntersectionObserver = originalIntersectionObserver
    }
  })
})

describe('non-terminal flush', () => {
  it('renders the trailing line without ending the stream', () => {
    const container = document.createElement('div')
    const f = new Flowdown({ container })

    f.push('Hello')
    f.flush()
    assert.ok(container.innerHTML.includes('Hello'))

    f.push(' world')
    f.flush()
    assert.ok(container.innerHTML.includes('Hello world'))
  })

  it('keeps incremental updates after flushing the preview line', () => {
    const container = document.createElement('div')
    const f = new Flowdown({ container })

    f.push('Alpha')
    f.flush()
    f.push('\n\nBeta')
    f.flush()

    const paragraphs = container.querySelectorAll('p')
    assert.strictEqual(paragraphs.length, 2)
    assert.strictEqual(paragraphs[0].textContent, 'Alpha')
    assert.strictEqual(paragraphs[1].textContent, 'Beta')
  })

  it('renders unfinished code lines during flush without closing the fence', () => {
    const container = document.createElement('div')
    const f = new Flowdown({ container })

    f.push('```js\nconst x')
    f.flush()
    assert.ok(container.querySelector('code')?.textContent?.includes('const x'))

    f.push(' = 1;')
    f.flush()
    assert.ok(container.querySelector('code')?.textContent?.includes('const x = 1;'))
  })
})
