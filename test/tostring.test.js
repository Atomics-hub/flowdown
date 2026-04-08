import { describe, it } from 'node:test'
import assert from 'node:assert'

const { Flowdown } = await import('../packages/core/dist/index.js')

describe('renderToString', () => {
  it('renders headings', () => {
    const html = Flowdown.renderToString('# Hello\n\n## World')
    assert.ok(html.includes('<h1>Hello</h1>'))
    assert.ok(html.includes('<h2>World</h2>'))
  })

  it('renders bold and italic', () => {
    const html = Flowdown.renderToString('This is **bold** and *italic*')
    assert.ok(html.includes('<strong>bold</strong>'))
    assert.ok(html.includes('<em>italic</em>'))
  })

  it('renders inline code', () => {
    const html = Flowdown.renderToString('Use `console.log()`')
    assert.ok(html.includes('<code>console.log()</code>'))
  })

  it('renders code blocks', () => {
    const html = Flowdown.renderToString('```javascript\nconst x = 1;\n```')
    assert.ok(html.includes('<pre>'))
    assert.ok(html.includes('language-javascript'))
    assert.ok(html.includes('const x = 1;'))
  })

  it('renders links', () => {
    const html = Flowdown.renderToString('[click](https://example.com)')
    assert.ok(html.includes('<a href="https://example.com"'))
    assert.ok(html.includes('click</a>'))
  })

  it('renders unordered lists', () => {
    const html = Flowdown.renderToString('- A\n- B\n- C')
    assert.ok(html.includes('<ul>'))
    assert.ok(html.includes('<li>A</li>'))
    assert.ok(html.includes('<li>B</li>'))
    assert.ok(html.includes('<li>C</li>'))
  })

  it('renders ordered lists', () => {
    const html = Flowdown.renderToString('1. First\n2. Second')
    assert.ok(html.includes('<ol>'))
    assert.ok(html.includes('<li>First</li>'))
  })

  it('renders blockquotes', () => {
    const html = Flowdown.renderToString('> This is a quote')
    assert.ok(html.includes('<blockquote>'))
    assert.ok(html.includes('This is a quote'))
  })

  it('renders tables with alignment', () => {
    const html = Flowdown.renderToString('| Left | Right |\n|:-----|------:|\n| a | b |')
    assert.ok(html.includes('<table>'))
    assert.ok(html.includes('<th'))
    assert.ok(html.includes('text-align:left'))
    assert.ok(html.includes('text-align:right'))
  })

  it('renders hr', () => {
    const html = Flowdown.renderToString('Above\n\n---\n\nBelow')
    assert.ok(html.includes('<hr>'))
  })

  it('renders strikethrough', () => {
    const html = Flowdown.renderToString('~~deleted~~')
    assert.ok(html.includes('<del>deleted</del>'))
  })

  it('renders images', () => {
    const html = Flowdown.renderToString('![alt text](https://img.com/pic.png)')
    assert.ok(html.includes('<img src="https://img.com/pic.png" alt="alt text">'))
  })

  it('handles empty input', () => {
    const html = Flowdown.renderToString('')
    assert.strictEqual(html, '')
  })

  it('sanitizes javascript: URLs in links', () => {
    const html = Flowdown.renderToString('[xss](javascript:alert(1))')
    assert.ok(!html.includes('javascript:'))
  })

  it('sanitizes javascript: URLs in images', () => {
    const html = Flowdown.renderToString('![xss](javascript:alert(1))')
    assert.ok(!html.includes('javascript:'))
  })

  it('escapes quotes in URLs to prevent attribute breakout', () => {
    const html = Flowdown.renderToString('[click](http://x.com" onclick="alert(1))')
    // Double quotes in URLs must be escaped to &quot; so they can't
    // break out of the href="..." attribute boundary
    assert.ok(html.includes('&quot;'), 'quotes in URL should be HTML-escaped')
    // Verify the attribute boundary is intact — no unescaped " before onclick
    assert.ok(!html.includes('" onclick='), 'unescaped quote must not break attribute')
  })

  it('escapes quotes in code fence language to prevent attribute breakout', () => {
    const html = Flowdown.renderToString('```js"onmouseover="alert(1)\ncode\n```')
    assert.ok(!html.includes('class="language-js"onmouseover='), 'language hint must not break out of the class attribute')
    assert.ok(!html.includes('onmouseover="alert(1)"'), 'language hint must not create a real event handler attribute')
    assert.ok(html.includes('language-js&quot;onmouseover=&quot;alert(1)'), 'quotes should be escaped in class attribute')
  })

  it('escapes HTML in text content', () => {
    const html = Flowdown.renderToString('Use <script>alert(1)</script> carefully')
    assert.ok(!html.includes('<script>'))
    assert.ok(html.includes('&lt;script&gt;'))
  })
})
