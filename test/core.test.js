import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>')
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

function streamRender(chunks) {
  const container = document.createElement('div')
  const f = new Flowdown({ container, sanitize: true })
  for (const chunk of chunks) {
    f.push(chunk)
  }
  f.end()
  return container
}

describe('Headings', () => {
  it('renders h1', () => {
    const el = render('# Hello World')
    assert.strictEqual(el.querySelector('h1')?.textContent, 'Hello World')
  })

  it('renders h2', () => {
    const el = render('## Sub Heading')
    assert.strictEqual(el.querySelector('h2')?.textContent, 'Sub Heading')
  })

  it('renders h3', () => {
    const el = render('### Third Level')
    assert.strictEqual(el.querySelector('h3')?.textContent, 'Third Level')
  })

  it('renders h6', () => {
    const el = render('###### Deep')
    assert.strictEqual(el.querySelector('h6')?.textContent, 'Deep')
  })
})

describe('Inline formatting', () => {
  it('renders bold', () => {
    const el = render('This is **bold** text')
    assert.strictEqual(el.querySelector('strong')?.textContent, 'bold')
  })

  it('renders italic', () => {
    const el = render('This is *italic* text')
    assert.strictEqual(el.querySelector('em')?.textContent, 'italic')
  })

  it('renders strikethrough', () => {
    const el = render('This is ~~deleted~~ text')
    assert.strictEqual(el.querySelector('del')?.textContent, 'deleted')
  })

  it('renders inline code', () => {
    const el = render('Use `console.log()` here')
    assert.strictEqual(el.querySelector('code')?.textContent, 'console.log()')
  })
})

describe('Links', () => {
  it('renders links', () => {
    const el = render('Click [here](https://example.com) now')
    const a = el.querySelector('a')
    assert.strictEqual(a?.textContent, 'here')
    assert.strictEqual(a?.getAttribute('href'), 'https://example.com')
  })

  it('sanitizes javascript: URLs', () => {
    const el = render('[xss](javascript:alert(1))')
    const a = el.querySelector('a')
    assert.strictEqual(a?.getAttribute('href'), '')
  })

  it('sanitizes data: URLs', () => {
    const el = render('[xss](data:text/html,<script>alert(1)</script>)')
    const a = el.querySelector('a')
    assert.strictEqual(a?.getAttribute('href'), '')
  })
})

describe('Code blocks', () => {
  it('renders fenced code blocks', () => {
    const el = render('```javascript\nconst x = 1;\n```')
    const code = el.querySelector('code')
    assert.ok(code)
    assert.strictEqual(code.className, 'language-javascript')
    assert.ok(code.textContent.includes('const x = 1;'))
  })

  it('renders code blocks with tilde fence', () => {
    const el = render('~~~python\nprint("hello")\n~~~')
    const code = el.querySelector('code')
    assert.ok(code)
    assert.strictEqual(code.className, 'language-python')
  })

  it('renders code blocks without language', () => {
    const el = render('```\nplain code\n```')
    const code = el.querySelector('code')
    assert.ok(code)
    assert.strictEqual(code.className, '')
  })

  it('calls highlight callback', () => {
    const container = document.createElement('div')
    let highlightedCode = ''
    let highlightedLang = ''
    const f = new Flowdown({
      container,
      highlight: (code, lang) => {
        highlightedCode = code
        highlightedLang = lang
        return `<span class="hl">${code}</span>`
      },
    })
    f.push('```ts\nlet x = 1;\n```\n')
    f.end()
    assert.strictEqual(highlightedLang, 'ts')
    assert.ok(highlightedCode.includes('let x = 1;'))
  })
})

describe('Lists', () => {
  it('renders unordered lists', () => {
    const el = render('- First\n- Second\n- Third')
    const items = el.querySelectorAll('li')
    assert.strictEqual(items.length, 3)
    assert.strictEqual(items[0].textContent, 'First')
  })

  it('renders ordered lists', () => {
    const el = render('1. Alpha\n2. Beta\n3. Gamma')
    const items = el.querySelectorAll('li')
    assert.strictEqual(items.length, 3)
    assert.strictEqual(items[0].textContent, 'Alpha')
  })
})

describe('Blockquotes', () => {
  it('renders blockquotes', () => {
    const el = render('> This is a quote')
    const bq = el.querySelector('blockquote')
    assert.ok(bq)
    assert.ok(bq.textContent.includes('This is a quote'))
  })
})

describe('Tables', () => {
  it('renders GFM tables', () => {
    const el = render('| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |')
    const table = el.querySelector('table')
    assert.ok(table)
    const headers = table.querySelectorAll('th')
    assert.strictEqual(headers.length, 2)
    assert.strictEqual(headers[0].textContent, 'Name')
    const cells = table.querySelectorAll('td')
    assert.strictEqual(cells.length, 4)
  })

  it('renders inline markdown inside table cells', () => {
    const el = render('| Name | Link |\n|------|------|\n| **Alice** | [Profile](https://example.com) |')
    const table = el.querySelector('table')
    assert.ok(table)
    assert.strictEqual(table.querySelector('strong')?.textContent, 'Alice')
    assert.strictEqual(table.querySelector('a')?.textContent, 'Profile')
  })
})

describe('Horizontal rules', () => {
  it('renders hr', () => {
    const el = render('Above\n\n---\n\nBelow')
    assert.ok(el.querySelector('hr'))
  })
})

describe('Streaming (FOIM)', () => {
  it('handles bold split across chunks', () => {
    const el = streamRender(['This is **bo', 'ld** text'])
    assert.strictEqual(el.querySelector('strong')?.textContent, 'bold')
  })

  it('handles code fence split across chunks', () => {
    const el = streamRender(['```', 'js\nconsole.log(1);\n', '```'])
    assert.ok(el.querySelector('pre'))
    assert.ok(el.querySelector('code'))
  })

  it('handles heading streamed char by char', () => {
    const el = streamRender(['#', ' ', 'H', 'e', 'l', 'l', 'o', '\n'])
    assert.strictEqual(el.querySelector('h1')?.textContent, 'Hello')
  })

  it('handles link split across chunks', () => {
    const el = streamRender(['[cli', 'ck](http', 's://ex.com)'])
    const a = el.querySelector('a')
    assert.strictEqual(a?.textContent, 'click')
    assert.strictEqual(a?.getAttribute('href'), 'https://ex.com')
  })

  it('handles table streamed line by line', () => {
    const el = streamRender([
      '| A | B |\n',
      '|---|---|\n',
      '| 1 | 2 |\n',
      '\n'
    ])
    assert.ok(el.querySelector('table'))
    assert.strictEqual(el.querySelectorAll('th').length, 2)
  })

  it('produces same output regardless of chunk boundaries', () => {
    const markdown = '# Title\n\nSome **bold** and *italic* text.\n\n```js\nconst x = 1;\n```\n\n- Item 1\n- Item 2\n'

    const full = render(markdown)

    const charByChar = streamRender(markdown.split(''))

    // Compare structure (not exact DOM since text nodes may differ)
    assert.strictEqual(
      full.querySelectorAll('h1').length,
      charByChar.querySelectorAll('h1').length
    )
    assert.strictEqual(
      full.querySelectorAll('strong').length,
      charByChar.querySelectorAll('strong').length
    )
    assert.strictEqual(
      full.querySelectorAll('em').length,
      charByChar.querySelectorAll('em').length
    )
    assert.strictEqual(
      full.querySelectorAll('pre').length,
      charByChar.querySelectorAll('pre').length
    )
    assert.strictEqual(
      full.querySelectorAll('li').length,
      charByChar.querySelectorAll('li').length
    )
  })
})

describe('Reset and destroy', () => {
  it('reset clears output', () => {
    const container = document.createElement('div')
    const f = new Flowdown({ container })
    f.push('# Hello')
    f.end()
    assert.ok(container.querySelector('h1'))
    f.reset()
    assert.strictEqual(container.innerHTML, '')
  })
})
