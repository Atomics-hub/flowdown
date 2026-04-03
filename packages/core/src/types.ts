export interface FlowdownOptions {
  container: HTMLElement
  highlight?: (code: string, lang: string) => string | Promise<string>
  onCodeBlock?: (code: string, lang: string) => void
  sanitize?: boolean
  virtualize?: boolean
  overscan?: number
}

export const enum BlockType {
  Document,
  Paragraph,
  Heading,
  CodeBlock,
  Blockquote,
  UnorderedList,
  OrderedList,
  ListItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  ThematicBreak,
}

export const enum InlineContext {
  None = 0,
  Bold = 1,
  Italic = 2,
  Strikethrough = 4,
  Code = 8,
  Link = 16,
}

export interface Block {
  type: BlockType
  element: HTMLElement
  lang?: string
}

export interface SealedBlock {
  id: number
  wrapper: HTMLElement
  cachedHTML: string
  height: number
  visible: boolean
}
