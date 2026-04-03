import { type FlowdownOptions, type Block, BlockType, InlineContext } from './types.js'
import { createElement } from './template-pool.js'
import { VirtualViewport } from './virtual-viewport.js'

export class Flowdown {
  private container: HTMLElement
  private options: FlowdownOptions
  private blockStack: Block[] = []
  private inlineState = 0
  private pendingDom: (() => void)[] = []
  private rafId: number | null = null
  private activeTextNode: Text | null = null
  private lineBuffer = ''
  private inCodeBlock = false
  private codeFence = ''
  private codeLang = ''
  private codeContent = ''
  private inTable = false
  private tableRows: string[][] = []
  private done = false
  private viewport: VirtualViewport | null = null
  private currentWrapper: HTMLElement | null = null
  private wrapperDirty = false
  private closingFenceRe: RegExp | null = null
  private generation = 0

  constructor(options: FlowdownOptions) {
    this.options = options
    this.container = options.container
    if (options.container.firstChild) options.container.innerHTML = ''

    if (options.virtualize) {
      this.viewport = new VirtualViewport(this.container, options.overscan ?? 2)
    }
  }

  push(chunk: string): void {
    if (this.done) return
    this.processChunk(chunk)
    this.scheduleDomFlush()
  }

  end(): void {
    this.done = true
    if (this.lineBuffer) {
      this.processLine(this.lineBuffer)
      this.lineBuffer = ''
    }
    if (this.inCodeBlock) {
      this.closeCodeBlock()
    }
    if (this.inTable) {
      this.closeTable()
    }
    this.closeAllInline()
    this.closeToDepth(0)
    this.sealCurrentWrapper()
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.flushDom()
  }

  private resetState(): void {
    this.generation++
    this.blockStack = []
    this.inlineState = InlineContext.None
    this.pendingDom = []
    this.activeTextNode = null
    this.lineBuffer = ''
    this.inCodeBlock = false
    this.codeFence = ''
    this.codeLang = ''
    this.codeContent = ''
    this.closingFenceRe = null
    this.inTable = false
    this.tableRows = []
    this.done = false
    this.currentWrapper = null
    this.wrapperDirty = false
    this.wrapperPending = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  reset(): void {
    this.resetState()
    this.container.innerHTML = ''
    if (this.viewport) {
      this.viewport.destroy()
      this.viewport = new VirtualViewport(this.container, this.options.overscan ?? 2)
    }
  }

  destroy(): void {
    this.resetState()
    this.container.innerHTML = ''
    if (this.viewport) {
      this.viewport.destroy()
      this.viewport = null
    }
  }

  getViewportStats() {
    return this.viewport?.getStats() ?? { total: 0, visible: 0, virtualized: 0 }
  }

  static renderToString(markdown: string): string {
    const parts: string[] = []
    const lines = markdown.split('\n')
    let inCode = false
    let codeFence = ''
    let codeLang = ''
    let codeLines: string[] = []
    let inList: string | null = null
    let inBlockquote = false
    let inTable = false
    let tableRows: string[][] = []
    let inParagraph = false

    function processInline(text: string): string {
      let out = ''
      let i = 0
      while (i < text.length) {
        if (text[i] === '`') {
          const end = text.indexOf('`', i + 1)
          if (end !== -1) { out += '<code>' + esc(text.slice(i+1, end)) + '</code>'; i = end+1; continue }
        }
        if (text[i] === '!' && text[i+1] === '[') {
          const cb = text.indexOf(']', i+2)
          if (cb !== -1 && text[cb+1] === '(') {
            const cp = text.indexOf(')', cb+2)
            if (cp !== -1) { out += '<img src="' + safeUrl(text.slice(cb+2,cp)) + '" alt="' + esc(text.slice(i+2,cb)) + '">'; i = cp+1; continue }
          }
        }
        if (text[i] === '[') {
          const cb = text.indexOf(']', i+1)
          if (cb !== -1 && text[cb+1] === '(') {
            const cp = text.indexOf(')', cb+2)
            if (cp !== -1) { out += '<a href="' + safeUrl(text.slice(cb+2,cp)) + '" rel="noopener noreferrer">' + processInline(text.slice(i+1,cb)) + '</a>'; i = cp+1; continue }
          }
        }
        if (text[i] === '*' && text[i+1] === '*') {
          const end = text.indexOf('**', i+2)
          if (end !== -1) { out += '<strong>' + processInline(text.slice(i+2, end)) + '</strong>'; i = end+2; continue }
        }
        if (text[i] === '*' && text[i+1] !== '*') {
          const end = findSingleStar(text, i+1)
          if (end !== -1) { out += '<em>' + processInline(text.slice(i+1, end)) + '</em>'; i = end+1; continue }
        }
        if (text[i] === '~' && text[i+1] === '~') {
          const end = text.indexOf('~~', i+2)
          if (end !== -1) { out += '<del>' + processInline(text.slice(i+2, end)) + '</del>'; i = end+2; continue }
        }
        out += esc(text[i])
        i++
      }
      return out
    }
    function findSingleStar(text: string, from: number): number {
      for (let j = from; j < text.length; j++) {
        if (text[j] === '*' && text[j+1] !== '*') return j
      }
      return -1
    }
    function esc(s: string): string {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
    function safeUrl(url: string): string {
      const t = url.trim()
      if (/^(javascript|vbscript|data):/i.test(t)) return ''
      return t.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    }

    function closeList() {
      if (inList) { parts.push(`</${inList}>`); inList = null }
    }

    function closeBlockquote() {
      if (inBlockquote) { parts.push('</blockquote>'); inBlockquote = false }
    }

    function closeParagraph() {
      if (inParagraph) { parts.push('</p>'); inParagraph = false }
    }

    function closeTable() {
      if (!inTable) return
      inTable = false
      if (tableRows.length === 0) return
      parts.push('<table>')
      const hasSep = tableRows.length > 1 && tableRows[1].every(c => /^[-:]+$/.test(c))
      const aligns = hasSep ? tableRows[1].map(c => {
        const l = c.startsWith(':'), r = c.endsWith(':')
        return l && r ? ' style="text-align:center"' : r ? ' style="text-align:right"' : l ? ' style="text-align:left"' : ''
      }) : []

      if (hasSep) {
        parts.push('<thead><tr>')
        tableRows[0].forEach((c, i) => parts.push(`<th${aligns[i] || ''}>${processInline(c)}</th>`))
        parts.push('</tr></thead>')
        if (tableRows.length > 2) {
          parts.push('<tbody>')
          for (let r = 2; r < tableRows.length; r++) {
            parts.push('<tr>')
            tableRows[r].forEach((c, i) => parts.push(`<td${aligns[i] || ''}>${processInline(c)}</td>`))
            parts.push('</tr>')
          }
          parts.push('</tbody>')
        }
      } else {
        parts.push('<tbody>')
        for (const row of tableRows) {
          parts.push('<tr>')
          row.forEach(c => parts.push(`<td>${processInline(c)}</td>`))
          parts.push('</tr>')
        }
        parts.push('</tbody>')
      }
      parts.push('</table>')
      tableRows = []
    }

    function isTableRow(line: string): boolean {
      if (!line.includes('|')) return false
      return line.startsWith('|') || (line.split('|').length - 1) >= 2
    }

    for (let i = 0; i <= lines.length; i++) {
      const raw = i < lines.length ? lines[i] : ''
      const trimmed = raw.trimEnd()

      if (inCode) {
        const fenceChar = codeFence[0]
        const fenceLen = codeFence.length
        const re = fenceChar === '`' ? new RegExp(`^\`{${fenceLen},}\\s*$`) : new RegExp(`^~{${fenceLen},}\\s*$`)
        // Strip blockquote prefix in code blocks
        const check = inBlockquote ? trimmed.replace(/^>\s?/, '') : trimmed
        if (re.test(check) || i >= lines.length) {
          parts.push(`<pre><code${codeLang ? ` class="language-${esc(codeLang)}"` : ''}>${codeLines.join('\n')}</code></pre>`)
          inCode = false
          codeFence = ''
          codeLang = ''
          codeLines = []
          continue
        }
        const codeLine = inBlockquote ? raw.replace(/^>\s?/, '') : raw
        codeLines.push(codeLine.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        continue
      }

      if (inTable) {
        if (isTableRow(trimmed)) {
          const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
          if (tableRows.length === 1 && cells.every(c => /^[-:]+$/.test(c))) {
            tableRows.push(cells)
          } else {
            tableRows.push(cells)
          }
          continue
        } else {
          closeTable()
        }
      }

      if (i >= lines.length || trimmed === '') {
        closeParagraph()
        closeList()
        if (trimmed === '' && inBlockquote) closeBlockquote()
        continue
      }

      // Check for blockquote-wrapped content
      let content = trimmed
      const bqMatch = content.match(/^>\s?(.*)$/)
      if (bqMatch) {
        if (!inBlockquote) {
          closeParagraph(); closeList()
          parts.push('<blockquote>')
          inBlockquote = true
        }
        content = bqMatch[1]
        if (content === '') { closeParagraph(); continue }
      } else if (inBlockquote) {
        closeBlockquote()
        closeParagraph()
      }

      const fenceMatch = content.match(/^(`{3,}|~{3,})(.*)$/)
      if (fenceMatch) {
        closeParagraph(); closeList()
        codeFence = fenceMatch[1][0].repeat(fenceMatch[1].length)
        codeLang = fenceMatch[2].trim().split(/\s/)[0]
        codeLines = []
        inCode = true
        continue
      }

      const headingMatch = content.match(/^(#{1,6})\s+(.*)$/)
      if (headingMatch) {
        closeParagraph(); closeList()
        const tag = `h${headingMatch[1].length}`
        parts.push(`<${tag}>${processInline(headingMatch[2])}</${tag}>`)
        continue
      }

      if (content === '---' || content === '***' || content === '___') {
        closeParagraph(); closeList()
        parts.push('<hr>')
        continue
      }

      const ulMatch = content.match(/^[-*+]\s+(.*)$/)
      if (ulMatch) {
        closeParagraph()
        if (inList !== 'ul') { closeList(); parts.push('<ul>'); inList = 'ul' }
        parts.push(`<li>${processInline(ulMatch[1])}</li>`)
        continue
      }

      const olMatch = content.match(/^\d+[.)]\s+(.*)$/)
      if (olMatch) {
        closeParagraph()
        if (inList !== 'ol') { closeList(); parts.push('<ol>'); inList = 'ol' }
        parts.push(`<li>${processInline(olMatch[1])}</li>`)
        continue
      }

      if (isTableRow(content) && !inTable) {
        closeParagraph(); closeList()
        inTable = true
        tableRows = []
        const cells = content.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
        tableRows.push(cells)
        continue
      }

      // Paragraph text
      closeList()
      if (!inParagraph) {
        parts.push('<p>')
        inParagraph = true
      } else {
        parts.push(' ')
      }
      parts.push(processInline(content))
    }

    closeParagraph()
    closeList()
    closeBlockquote()
    closeTable()

    return parts.join('')
  }

  // --- Core streaming logic (unchanged architecture) ---

  private processChunk(chunk: string): void {
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i]

      if (this.inCodeBlock) {
        this.lineBuffer += ch
        if (ch === '\n') {
          let line = this.lineBuffer
          this.lineBuffer = ''
          const inBq = this.findBlockDepth(BlockType.Blockquote) >= 0
          if (inBq) {
            const stripped = line.replace(/^>\s?/, '')
            if (stripped !== line) line = stripped
          }
          if (this.isClosingFence(line)) {
            this.closeCodeBlock()
          } else {
            this.codeContent += line
            this.appendCodeText(line)
          }
        }
        continue
      }

      if (ch === '\n') {
        const line = this.lineBuffer
        this.lineBuffer = ''
        this.processLine(line)
      } else {
        this.lineBuffer += ch
      }
    }
  }

  private processLine(line: string): void {
    const trimmed = line.trimEnd()

    if (this.inTable) {
      if (this.isTableRow(trimmed)) {
        this.addTableRow(trimmed)
        return
      } else {
        this.closeTable()
      }
    }

    if (trimmed === '') {
      this.closeAllInline()
      this.closeToDepth(0)
      this.sealCurrentWrapper()
      return
    }

    const bqMatch = trimmed.match(/^>\s?(.*)$/)
    if (bqMatch) {
      const bqDepth = this.findBlockDepth(BlockType.Blockquote)
      if (bqDepth < 0) {
        this.closeAllInline()
        this.closeToDepth(0)
        this.sealCurrentWrapper()
        this.ensureWrapper()
        this.openBlock(BlockType.Blockquote, 'blockquote')
      }

      const bqContent = bqMatch[1]

      const bqFence = bqContent.match(/^(`{3,}|~{3,})(.*)$/)
      if (bqFence) {
        this.closeAllInline()
        if (this.currentBlockIs(BlockType.Paragraph)) {
          this.closeToDepth(this.findBlockDepth(BlockType.Blockquote) + 1)
        }
        this.codeFence = bqFence[1][0].repeat(bqFence[1].length)
        this.codeLang = bqFence[2].trim().split(/\s/)[0]
        this.codeContent = ''
        this.inCodeBlock = true
        this.openCodeBlock()
        return
      }

      if (bqContent === '') {
        this.closeAllInline()
        if (this.currentBlockIs(BlockType.Paragraph)) {
          this.closeToDepth(this.findBlockDepth(BlockType.Blockquote) + 1)
        }
        return
      }

      if (!this.currentBlockIs(BlockType.Paragraph)) {
        this.openBlock(BlockType.Paragraph, 'p')
      } else {
        this.appendText(' ')
      }
      this.processInline(bqContent)
      return
    }

    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/)
    if (fenceMatch) {
      this.closeAllInline()
      this.closeToDepth(0)
      this.sealCurrentWrapper()
      this.ensureWrapper()
      this.codeFence = fenceMatch[1][0].repeat(fenceMatch[1].length)
      this.codeLang = fenceMatch[2].trim().split(/\s/)[0]
      this.codeContent = ''
      this.inCodeBlock = true
      this.openCodeBlock()
      return
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      this.closeAllInline()
      this.closeToDepth(0)
      this.sealCurrentWrapper()
      this.ensureWrapper()
      const level = headingMatch[1].length
      this.openBlock(BlockType.Heading, `h${level}`)
      this.processInline(headingMatch[2])
      this.closeAllInline()
      this.closeToDepth(0)
      this.sealCurrentWrapper()
      return
    }

    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      this.closeAllInline()
      this.closeToDepth(0)
      this.sealCurrentWrapper()
      this.enqueueDom(() => {
        const hr = createElement('hr')
        this.container.appendChild(hr)
      })
      return
    }

    const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/)
    if (ulMatch) {
      this.handleListItem(BlockType.UnorderedList, 'ul', ulMatch[1])
      return
    }

    const olMatch = trimmed.match(/^\d+[.)]\s+(.*)$/)
    if (olMatch) {
      this.handleListItem(BlockType.OrderedList, 'ol', olMatch[1])
      return
    }

    if (this.isTableRow(trimmed) && !this.inTable) {
      this.closeAllInline()
      this.closeToDepth(0)
      this.sealCurrentWrapper()
      this.inTable = true
      this.tableRows = []
      this.addTableRow(trimmed)
      return
    }

    if (!this.currentBlockIs(BlockType.Paragraph)) {
      this.closeAllInline()
      const depth = this.findBlockDepth(BlockType.Blockquote)
      if (depth >= 0) {
        this.closeToDepth(depth + 1)
      } else {
        this.closeToDepth(0)
        this.sealCurrentWrapper()
        this.ensureWrapper()
      }
      this.openBlock(BlockType.Paragraph, 'p')
    } else {
      this.appendText(' ')
    }
    this.processInline(trimmed)
  }

  private handleListItem(listType: BlockType, tag: string, content: string): void {
    this.closeAllInline()

    const listDepth = this.findBlockDepth(listType)
    if (listDepth >= 0) {
      this.closeToDepth(listDepth + 1)
    } else {
      this.closeToDepth(0)
      this.sealCurrentWrapper()
      this.ensureWrapper()
      this.openBlock(listType, tag)
    }
    this.openBlock(BlockType.ListItem, 'li')
    this.processInline(content)
  }

  private processInline(text: string): void {
    let i = 0
    while (i < text.length) {
      if (text[i] === '`') {
        const end = text.indexOf('`', i + 1)
        if (end !== -1) {
          this.appendInlineCode(text.slice(i + 1, end))
          i = end + 1
          continue
        }
      }

      if (text[i] === '*' && text[i + 1] === '*') {
        if (this.inlineState & InlineContext.Bold) {
          this.closeBold()
        } else {
          this.openBold()
        }
        i += 2
        continue
      }

      if (text[i] === '*' && text[i + 1] !== '*') {
        if (this.inlineState & InlineContext.Italic) {
          this.closeItalic()
        } else {
          this.openItalic()
        }
        i += 1
        continue
      }

      if (text[i] === '~' && text[i + 1] === '~') {
        if (this.inlineState & InlineContext.Strikethrough) {
          this.closeStrikethrough()
        } else {
          this.openStrikethrough()
        }
        i += 2
        continue
      }

      if (text[i] === '!' && text[i + 1] === '[') {
        const closeBracket = text.indexOf(']', i + 2)
        if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
          const closeParen = text.indexOf(')', closeBracket + 2)
          if (closeParen !== -1) {
            this.appendImage(text.slice(i + 2, closeBracket), text.slice(closeBracket + 2, closeParen))
            i = closeParen + 1
            continue
          }
        }
      }

      if (text[i] === '[') {
        const closeBracket = text.indexOf(']', i + 1)
        if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
          const closeParen = text.indexOf(')', closeBracket + 2)
          if (closeParen !== -1) {
            this.appendLink(text.slice(i + 1, closeBracket), text.slice(closeBracket + 2, closeParen))
            i = closeParen + 1
            continue
          }
        }
      }

      this.appendText(text[i])
      i++
    }
  }

  // --- Block wrapper management (for virtualization) ---

  private wrapperPending = false

  private ensureWrapper(): void {
    if (this.currentWrapper || this.wrapperPending) return
    this.wrapperPending = true
    this.enqueueDom(() => {
      const wrapper = createElement('div')
      wrapper.className = 'fd-block'
      this.container.appendChild(wrapper)
      this.currentWrapper = wrapper
      this.wrapperDirty = true
      this.wrapperPending = false
    })
  }

  private sealCurrentWrapper(): void {
    if (!this.wrapperDirty && !this.wrapperPending) return
    this.wrapperDirty = false
    this.wrapperPending = false

    // Capture current wrapper OR defer — the wrapper may not exist yet
    // if ensureWrapper's DOM callback hasn't flushed. By reading
    // this.currentWrapper inside the deferred callback, we get the
    // wrapper after it's been created by the earlier enqueued callback.
    this.enqueueDom(() => {
      const wrapper = this.currentWrapper
      this.currentWrapper = null
      if (this.viewport && wrapper) {
        this.viewport.seal(wrapper)
      }
    })
  }

  // --- Block operations ---

  private openBlock(type: BlockType, tag: string): void {
    const block: Block = { type, element: null as unknown as HTMLElement }
    this.blockStack.push(block)
    this.activeTextNode = null

    const parentBlock = this.blockStack.length > 1
      ? this.blockStack[this.blockStack.length - 2]
      : null

    this.enqueueDom(() => {
      const el = createElement(tag)
      const parent = parentBlock?.element ?? this.currentWrapper ?? this.container
      parent.appendChild(el)
      block.element = el
      this.wrapperDirty = true
    })
  }

  private closeToDepth(depth: number): void {
    while (this.blockStack.length > depth) {
      this.blockStack.pop()
    }
    this.activeTextNode = null
  }

  private findBlockDepth(type: BlockType): number {
    for (let i = this.blockStack.length - 1; i >= 0; i--) {
      if (this.blockStack[i].type === type) return i
    }
    return -1
  }

  private currentBlockIs(type: BlockType): boolean {
    return this.blockStack.length > 0 && this.blockStack[this.blockStack.length - 1].type === type
  }

  private currentBlock(): Block | null {
    return this.blockStack.length > 0 ? this.blockStack[this.blockStack.length - 1] : null
  }

  // --- Inline operations ---

  private appendText(text: string): void {
    const block = this.currentBlock()
    this.enqueueDom(() => {
      const parent = block?.element ?? this.currentWrapper ?? this.container
      if (this.activeTextNode && this.activeTextNode.parentNode === parent) {
        this.activeTextNode.textContent += text
      } else {
        const node = document.createTextNode(text)
        parent.appendChild(node)
        this.activeTextNode = node
      }
    })
  }

  private appendInlineCode(code: string): void {
    const block = this.currentBlock()
    this.activeTextNode = null
    this.enqueueDom(() => {
      const el = createElement('code')
      el.textContent = code
      const parent = block?.element ?? this.currentWrapper ?? this.container
      parent.appendChild(el)
    })
  }

  private appendLink(text: string, url: string): void {
    const block = this.currentBlock()
    const cleanUrl = this.options.sanitize !== false ? this.sanitizeUrl(url) : url
    this.activeTextNode = null
    this.enqueueDom(() => {
      const a = createElement('a') as HTMLAnchorElement
      a.href = cleanUrl
      a.textContent = text
      a.rel = 'noopener noreferrer'
      const parent = block?.element ?? this.currentWrapper ?? this.container
      parent.appendChild(a)
    })
  }

  private appendImage(alt: string, src: string): void {
    const block = this.currentBlock()
    const cleanSrc = this.options.sanitize !== false ? this.sanitizeUrl(src) : src
    this.activeTextNode = null
    this.enqueueDom(() => {
      const img = createElement('img') as HTMLImageElement
      img.src = cleanSrc
      img.alt = alt
      const parent = block?.element ?? this.currentWrapper ?? this.container
      parent.appendChild(img)
    })
  }

  private openBold(): void {
    this.inlineState |= InlineContext.Bold
    const parentBlock = this.currentBlock()
    const block: Block = { type: BlockType.Paragraph, element: null as unknown as HTMLElement }
    this.blockStack.push(block)
    this.activeTextNode = null
    this.enqueueDom(() => {
      const el = createElement('strong')
      const parent = parentBlock?.element ?? this.currentWrapper ?? this.container
      parent.appendChild(el)
      block.element = el
    })
  }

  private closeBold(): void {
    this.inlineState &= ~InlineContext.Bold
    this.blockStack.pop()
    this.activeTextNode = null
  }

  private openItalic(): void {
    this.inlineState |= InlineContext.Italic
    const parentBlock = this.currentBlock()
    const block: Block = { type: BlockType.Paragraph, element: null as unknown as HTMLElement }
    this.blockStack.push(block)
    this.activeTextNode = null
    this.enqueueDom(() => {
      const el = createElement('em')
      const parent = parentBlock?.element ?? this.currentWrapper ?? this.container
      parent.appendChild(el)
      block.element = el
    })
  }

  private closeItalic(): void {
    this.inlineState &= ~InlineContext.Italic
    this.blockStack.pop()
    this.activeTextNode = null
  }

  private openStrikethrough(): void {
    this.inlineState |= InlineContext.Strikethrough
    const parentBlock = this.currentBlock()
    const block: Block = { type: BlockType.Paragraph, element: null as unknown as HTMLElement }
    this.blockStack.push(block)
    this.activeTextNode = null
    this.enqueueDom(() => {
      const el = createElement('del')
      const parent = parentBlock?.element ?? this.currentWrapper ?? this.container
      parent.appendChild(el)
      block.element = el
    })
  }

  private closeStrikethrough(): void {
    this.inlineState &= ~InlineContext.Strikethrough
    this.blockStack.pop()
    this.activeTextNode = null
  }

  private closeAllInline(): void {
    if (this.inlineState & InlineContext.Strikethrough) this.closeStrikethrough()
    if (this.inlineState & InlineContext.Bold) this.closeBold()
    if (this.inlineState & InlineContext.Italic) this.closeItalic()
  }

  // --- Code blocks ---

  private openCodeBlock(): void {
    const block: Block = { type: BlockType.CodeBlock, element: null as unknown as HTMLElement, lang: this.codeLang }
    this.blockStack.push(block)
    this.activeTextNode = null
    const lang = this.codeLang
    this.enqueueDom(() => {
      const pre = createElement('pre')
      const code = createElement('code')
      if (lang) code.className = `language-${lang}`
      pre.appendChild(code)
      const parent = this.currentWrapper ?? this.container
      parent.appendChild(pre)
      block.element = code
      this.wrapperDirty = true
    })
  }

  private appendCodeText(text: string): void {
    const block = this.currentBlock()
    this.enqueueDom(() => {
      const codeEl = block?.element
      if (codeEl) {
        if (this.activeTextNode && this.activeTextNode.parentNode === codeEl) {
          this.activeTextNode.textContent += text
        } else {
          const node = document.createTextNode(text)
          codeEl.appendChild(node)
          this.activeTextNode = node
        }
      }
    })
  }

  private closeCodeBlock(): void {
    this.inCodeBlock = false
    const block = this.currentBlock()
    const lang = this.codeLang
    const content = this.codeContent
    const highlight = this.options.highlight
    const onCodeBlock = this.options.onCodeBlock

    this.blockStack.pop()
    this.activeTextNode = null

    if (highlight && block) {
      const gen = this.generation
      this.enqueueDom(() => {
        const result = highlight(content, lang)
        if (result instanceof Promise) {
          result.then((html) => {
            if (this.generation === gen && block.element) block.element.innerHTML = html
          })
        } else {
          if (block.element) block.element.innerHTML = result
        }
      })
    }

    if (onCodeBlock) {
      this.enqueueDom(() => { onCodeBlock(content, lang) })
    }

    this.codeFence = ''
    this.codeLang = ''
    this.codeContent = ''
    this.closingFenceRe = null
  }

  private isClosingFence(line: string): boolean {
    const trimmed = line.trimEnd()
    if (!this.codeFence) return false
    if (!this.closingFenceRe) {
      const ch = this.codeFence[0]
      const len = this.codeFence.length
      this.closingFenceRe = ch === '`'
        ? new RegExp(`^\`{${len},}\\s*$`)
        : new RegExp(`^~{${len},}\\s*$`)
    }
    return this.closingFenceRe.test(trimmed)
  }

  // --- Tables ---

  private isTableRow(line: string): boolean {
    if (!line.includes('|')) return false
    return line.startsWith('|') || (line.split('|').length - 1) >= 2
  }

  private addTableRow(line: string): void {
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    if (this.tableRows.length === 1 && cells.every((c) => /^[-:]+$/.test(c))) {
      this.tableRows.push(cells)
      return
    }
    this.tableRows.push(cells)
  }

  private parseAlignment(sep: string): string | null {
    const left = sep.startsWith(':')
    const right = sep.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    if (left) return 'left'
    return null
  }

  private closeTable(): void {
    this.inTable = false
    const rows = this.tableRows
    this.tableRows = []
    if (rows.length === 0) return

    this.ensureWrapper()
    this.enqueueDom(() => {
      const table = createElement('table')
      const hasSeparator = rows.length > 1 && rows[1].every((c) => /^[-:]+$/.test(c))
      const alignments = hasSeparator ? rows[1].map((c) => this.parseAlignment(c)) : []

      if (hasSeparator && rows.length > 0) {
        const thead = createElement('thead')
        const headerRow = createElement('tr')
        for (let c = 0; c < rows[0].length; c++) {
          const th = createElement('th')
          th.textContent = rows[0][c]
          if (alignments[c]) th.style.textAlign = alignments[c]!
          headerRow.appendChild(th)
        }
        thead.appendChild(headerRow)
        table.appendChild(thead)

        if (rows.length > 2) {
          const tbody = createElement('tbody')
          for (let i = 2; i < rows.length; i++) {
            const tr = createElement('tr')
            for (let c = 0; c < rows[i].length; c++) {
              const td = createElement('td')
              td.textContent = rows[i][c]
              if (alignments[c]) td.style.textAlign = alignments[c]!
              tr.appendChild(td)
            }
            tbody.appendChild(tr)
          }
          table.appendChild(tbody)
        }
      } else {
        const tbody = createElement('tbody')
        for (const row of rows) {
          const tr = createElement('tr')
          for (const cell of row) {
            const td = createElement('td')
            td.textContent = cell
            tr.appendChild(td)
          }
          tbody.appendChild(tr)
        }
        table.appendChild(tbody)
      }

      const parent = this.currentWrapper ?? this.container
      parent.appendChild(table)
      this.wrapperDirty = true
    })
  }

  // --- Sanitization ---

  private sanitizeUrl(url: string): string {
    const trimmed = url.trim()
    if (/^(javascript|vbscript|data):/i.test(trimmed)) return ''
    return trimmed
  }

  // --- DOM batching ---

  private enqueueDom(fn: () => void): void {
    this.pendingDom.push(fn)
  }

  private scheduleDomFlush(): void {
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.flushDom()
    })
  }

  private flushDom(): void {
    this.rafId = null
    const ops = this.pendingDom
    this.pendingDom = []
    for (let i = 0; i < ops.length; i++) {
      ops[i]()
    }
  }
}
