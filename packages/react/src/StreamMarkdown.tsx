import { useRef, useEffect, useCallback, useState, type CSSProperties } from 'react'
import { Flowdown, type FlowdownOptions } from '@a5omic/flowdown'

export interface StreamMarkdownProps {
  content: string
  className?: string
  style?: CSSProperties
  highlight?: FlowdownOptions['highlight']
  onCodeBlock?: FlowdownOptions['onCodeBlock']
  sanitize?: boolean
  virtualize?: boolean
}

export function StreamMarkdown({
  content,
  className,
  style,
  highlight,
  onCodeBlock,
  sanitize = true,
  virtualize = false,
}: StreamMarkdownProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const rendererRef = useRef<Flowdown | null>(null)
  const prevContentRef = useRef('')

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node)
  }, [])

  useEffect(() => {
    if (!container) return

    rendererRef.current = new Flowdown({
      container,
      highlight,
      onCodeBlock,
      sanitize,
      virtualize,
    })

    prevContentRef.current = ''

    return () => {
      rendererRef.current?.destroy()
      rendererRef.current = null
    }
  }, [container, highlight, onCodeBlock, sanitize, virtualize])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return

    const prev = prevContentRef.current
    if (content.length > prev.length && content.startsWith(prev)) {
      renderer.push(content.slice(prev.length))
    } else if (content !== prev) {
      renderer.reset()
      renderer.push(content)
    }
    renderer.flush()
    prevContentRef.current = content
  }, [content, container, highlight, onCodeBlock, sanitize, virtualize])

  return <div ref={containerRef} className={className} style={style} />
}
