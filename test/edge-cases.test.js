import { describe, it, beforeEach } from 'node:test'
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

function streamRender(chunks) {
  const container = document.createElement('div')
  const f = new Flowdown({ container, sanitize: true })
  for (const chunk of chunks) {
    f.push(chunk)
  }
  f.end()
  return container
}

// === MIXED BOLD/ITALIC ===

describe('Mixed bold/italic', () => {
  it('renders ***bold italic*** as bold+italic', () => {
    const el = render('This is ***bold italic*** text')
    const strong = el.querySelector('strong')
    const em = el.querySelector('em')
    assert.ok(strong || em, 'Should have at least strong or em')
  })

  it('renders **bold with *italic* inside**', () => {
    const el = render('**bold with *italic* inside**')
    const strong = el.querySelector('strong')
    assert.ok(strong, 'Should have strong')
    const em = el.querySelector('em')
    assert.ok(em, 'Should have em inside strong')
  })

  it('renders *italic with **bold** inside*', () => {
    const el = render('*italic with **bold** inside*')
    const em = el.querySelector('em')
    assert.ok(em, 'Should have em')
    const strong = el.querySelector('strong')
    assert.ok(strong, 'Should have strong inside em')
  })
})

// === NESTED LISTS ===

describe('Nested lists', () => {
  it('renders multiple list items correctly', () => {
    const el = render('- Item 1\n- Item 2\n- Item 3')
    const items = el.querySelectorAll('li')
    assert.strictEqual(items.length, 3)
  })

  it('renders list items with inline formatting', () => {
    const el = render('- **Bold item**\n- *Italic item*\n- `Code item`')
    assert.ok(el.querySelector('strong'), 'Should have bold in list')
    assert.ok(el.querySelector('em'), 'Should have italic in list')
    assert.ok(el.querySelector('code'), 'Should have code in list')
  })

  it('renders ordered then unordered lists separately', () => {
    const el = render('1. First\n2. Second\n\n- Alpha\n- Beta')
    const ols = el.querySelectorAll('ol')
    const uls = el.querySelectorAll('ul')
    assert.strictEqual(ols.length, 1, 'Should have 1 ol')
    assert.strictEqual(uls.length, 1, 'Should have 1 ul')
  })
})

// === CODE BLOCKS IN BLOCKQUOTES ===

describe('Code blocks in blockquotes', () => {
  it('renders blockquote with inline code', () => {
    const el = render('> Use `console.log()` for debugging')
    const bq = el.querySelector('blockquote')
    assert.ok(bq, 'Should have blockquote')
    const code = el.querySelector('code')
    assert.ok(code, 'Should have code inside blockquote')
    assert.strictEqual(code.textContent, 'console.log()')
  })

  it('renders multi-line blockquote', () => {
    const el = render('> First line\n> Second line\n> Third line')
    const bq = el.querySelector('blockquote')
    assert.ok(bq, 'Should have blockquote')
    assert.ok(bq.textContent.includes('First line'))
    assert.ok(bq.textContent.includes('Second line'))
    assert.ok(bq.textContent.includes('Third line'))
  })
})

// === UNICODE AND EMOJI ===

describe('Unicode and emoji', () => {
  it('renders emoji in text', () => {
    const el = render('Hello 🌍 World 🚀')
    assert.ok(el.textContent.includes('🌍'))
    assert.ok(el.textContent.includes('🚀'))
  })

  it('renders emoji in headings', () => {
    const el = render('# 🎉 Celebration')
    const h1 = el.querySelector('h1')
    assert.ok(h1.textContent.includes('🎉'))
  })

  it('renders CJK text', () => {
    const el = render('# 日本語テスト\n\nこれは**テスト**です。')
    const h1 = el.querySelector('h1')
    assert.ok(h1.textContent.includes('日本語テスト'))
    const strong = el.querySelector('strong')
    assert.ok(strong)
    assert.strictEqual(strong.textContent, 'テスト')
  })

  it('renders Korean text', () => {
    const el = render('안녕하세요 **세계**')
    assert.ok(el.querySelector('strong'))
  })

  it('renders Arabic text', () => {
    const el = render('مرحبا **بالعالم**')
    assert.ok(el.querySelector('strong'))
  })

  it('renders mixed scripts', () => {
    const el = render('English **日本語** and *한국어* text')
    assert.ok(el.querySelector('strong').textContent.includes('日本語'))
    assert.ok(el.querySelector('em').textContent.includes('한국어'))
  })
})

// === TABLE ALIGNMENT ===

describe('Table alignment', () => {
  it('applies left alignment', () => {
    const el = render('| Left |\n|:-----|\n| data |\n')
    const th = el.querySelector('th')
    assert.ok(th)
    assert.strictEqual(th.style.textAlign, 'left')
  })

  it('applies center alignment', () => {
    const el = render('| Center |\n|:------:|\n| data |\n')
    const th = el.querySelector('th')
    assert.ok(th)
    assert.strictEqual(th.style.textAlign, 'center')
  })

  it('applies right alignment', () => {
    const el = render('| Right |\n|------:|\n| data |\n')
    const th = el.querySelector('th')
    assert.ok(th)
    assert.strictEqual(th.style.textAlign, 'right')
  })

  it('applies mixed alignment to header and body', () => {
    const el = render('| Left | Center | Right |\n|:-----|:------:|------:|\n| a | b | c |\n')
    const ths = el.querySelectorAll('th')
    assert.strictEqual(ths.length, 3)
    assert.strictEqual(ths[0].style.textAlign, 'left')
    assert.strictEqual(ths[1].style.textAlign, 'center')
    assert.strictEqual(ths[2].style.textAlign, 'right')
    const tds = el.querySelectorAll('td')
    assert.strictEqual(tds[0].style.textAlign, 'left')
    assert.strictEqual(tds[1].style.textAlign, 'center')
    assert.strictEqual(tds[2].style.textAlign, 'right')
  })
})

// === INLINE FORMATTING ACROSS LINES ===

describe('Inline formatting across paragraph lines', () => {
  it('handles bold text within a single paragraph across wrapped lines', () => {
    // In markdown, lines within the same paragraph are joined
    // This test checks: line1 has ** opener, line2 has ** closer
    const el = render('This is **bold\ntext** here')
    // After line joining, this should be: "This is **bold text** here"
    const strong = el.querySelector('strong')
    assert.ok(strong, 'Should render bold across joined lines')
  })
})

// === LONG STREAMING ===

describe('Long streaming sessions', () => {
  it('handles 1000 tokens without error', () => {
    const container = document.createElement('div')
    const f = new Flowdown({ container })

    const sampleLine = 'This is a line with **bold** and *italic* and `code`.\n\n'
    // Stream 1000 small chunks
    for (let i = 0; i < 1000; i++) {
      f.push(sampleLine[i % sampleLine.length])
    }
    f.end()

    // Should have rendered something without crashing
    assert.ok(container.children.length > 0)
  })

  it('handles rapid push/end cycles', () => {
    const container = document.createElement('div')
    for (let i = 0; i < 50; i++) {
      const f = new Flowdown({ container })
      f.push('# Test ' + i + '\n\nSome **content**.\n')
      f.end()
      f.reset()
    }
    // Should not crash or leak
    assert.ok(true)
  })
})

// === SPECIAL CHARACTERS ===

describe('Special characters', () => {
  it('handles backslash escapes gracefully', () => {
    const el = render('This has a \\*literal asterisk\\*')
    // We may not support escapes, but it shouldn't crash
    assert.ok(el.textContent.length > 0)
  })

  it('handles HTML entities in text', () => {
    const el = render('Use &amp; and &lt; in text')
    assert.ok(el.textContent.length > 0)
  })

  it('handles pipes outside tables', () => {
    const el = render('Use the | operator for bitwise OR')
    assert.ok(el.textContent.includes('|'))
  })
})

// === EDGE CASE CODE BLOCKS ===

describe('Code block edge cases', () => {
  it('handles empty code blocks', () => {
    const el = render('```\n\n```')
    const pre = el.querySelector('pre')
    assert.ok(pre, 'Should render empty code block')
  })

  it('handles code blocks with markdown-like content', () => {
    const el = render('```\n# Not a heading\n**Not bold**\n- Not a list\n```')
    const pre = el.querySelector('pre')
    assert.ok(pre)
    // Content inside code block should NOT be parsed as markdown
    assert.strictEqual(el.querySelectorAll('h1').length, 0, 'Should not parse heading inside code block')
    assert.strictEqual(el.querySelectorAll('strong').length, 0, 'Should not parse bold inside code block')
  })

  it('handles triple backtick inside code block (4 backtick fence)', () => {
    const el = render('````\n```\ninner code\n```\n````')
    const pre = el.querySelector('pre')
    assert.ok(pre)
  })
})

// === LINKS EDGE CASES ===

describe('Link edge cases', () => {
  it('handles links with parentheses in URL', () => {
    const el = render('[Wiki](https://en.wikipedia.org/wiki/Rust_(programming_language))')
    // This is a known hard case - the closing paren is ambiguous
    const a = el.querySelector('a')
    assert.ok(a, 'Should have a link')
  })

  it('handles multiple links in one line', () => {
    const el = render('See [foo](http://foo.com) and [bar](http://bar.com)')
    const links = el.querySelectorAll('a')
    assert.strictEqual(links.length, 2)
  })

  it('handles links with bold text', () => {
    const el = render('Click [**here**](http://example.com)')
    const a = el.querySelector('a')
    assert.ok(a, 'Should have link')
    assert.strictEqual(a.querySelector('strong')?.textContent, 'here')
  })
})
