function findSingleStar(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] === '*' && text[i + 1] !== '*') return i
  }
  return -1
}

export function escapeHtmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function escapeHtmlAttr(text: string): string {
  return escapeHtmlText(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

interface InlineHtmlOptions {
  sanitizeUrls?: boolean
}

export function sanitizeHtmlUrl(url: string, sanitizeUrls = true): string {
  const trimmed = url.trim()
  if (sanitizeUrls && /^(javascript|vbscript|data):/i.test(trimmed)) return ''
  return escapeHtmlAttr(trimmed)
}

export function renderInlineHtml(text: string, options: InlineHtmlOptions = {}): string {
  const sanitizeUrls = options.sanitizeUrls ?? true
  let out = ''
  let i = 0

  while (i < text.length) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      if (end !== -1) {
        out += '<code>' + escapeHtmlText(text.slice(i + 1, end)) + '</code>'
        i = end + 1
        continue
      }
    }

    if (text[i] === '!' && text[i + 1] === '[') {
      const closeBracket = text.indexOf(']', i + 2)
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2)
        if (closeParen !== -1) {
          out += '<img src="' + sanitizeHtmlUrl(text.slice(closeBracket + 2, closeParen), sanitizeUrls) + '" alt="' + escapeHtmlAttr(text.slice(i + 2, closeBracket)) + '">'
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
          out += '<a href="' + sanitizeHtmlUrl(text.slice(closeBracket + 2, closeParen), sanitizeUrls) + '" rel="noopener noreferrer">' + renderInlineHtml(text.slice(i + 1, closeBracket), options) + '</a>'
          i = closeParen + 1
          continue
        }
      }
    }

    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2)
      if (end !== -1) {
        out += '<strong>' + renderInlineHtml(text.slice(i + 2, end), options) + '</strong>'
        i = end + 2
        continue
      }
    }

    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = findSingleStar(text, i + 1)
      if (end !== -1) {
        out += '<em>' + renderInlineHtml(text.slice(i + 1, end), options) + '</em>'
        i = end + 1
        continue
      }
    }

    if (text[i] === '~' && text[i + 1] === '~') {
      const end = text.indexOf('~~', i + 2)
      if (end !== -1) {
        out += '<del>' + renderInlineHtml(text.slice(i + 2, end), options) + '</del>'
        i = end + 2
        continue
      }
    }

    out += escapeHtmlText(text[i])
    i++
  }

  return out
}
