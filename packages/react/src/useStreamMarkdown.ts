import { useRef, useEffect, useCallback, useState } from 'react'
import { Flowdown, type FlowdownOptions } from 'flowdown'

export interface UseStreamMarkdownOptions {
  highlight?: FlowdownOptions['highlight']
  onCodeBlock?: FlowdownOptions['onCodeBlock']
  sanitize?: boolean
  virtualize?: boolean
}

export function useStreamMarkdown(options: UseStreamMarkdownOptions = {}) {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const rendererRef = useRef<Flowdown | null>(null)

  const ref = useCallback((node: HTMLElement | null) => {
    setContainer(node)
  }, [])

  useEffect(() => {
    if (!container) return

    rendererRef.current = new Flowdown({
      container,
      highlight: options.highlight,
      onCodeBlock: options.onCodeBlock,
      sanitize: options.sanitize ?? true,
      virtualize: options.virtualize ?? false,
    })

    return () => {
      rendererRef.current?.destroy()
      rendererRef.current = null
    }
  }, [container, options.highlight, options.onCodeBlock, options.sanitize, options.virtualize])

  const push = useCallback((chunk: string) => {
    rendererRef.current?.push(chunk)
  }, [])

  const end = useCallback(() => {
    rendererRef.current?.end()
  }, [])

  const reset = useCallback(() => {
    rendererRef.current?.reset()
  }, [])

  return { ref, push, end, reset }
}
