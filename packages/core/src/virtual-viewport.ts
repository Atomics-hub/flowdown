import type { SealedBlock } from './types.js'

export class VirtualViewport {
  private blocks: SealedBlock[] = []
  private observer: IntersectionObserver | null = null
  private overscan: number
  private nextId = 0
  private active = false

  constructor(private container: HTMLElement, overscan = 2) {
    this.overscan = overscan

    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => this.handleIntersection(entries),
        {
          root: this.findScrollParent(container),
          rootMargin: `${overscan * 200}px 0px`,
        }
      )
      this.active = true
    }
  }

  seal(wrapper: HTMLElement): void {
    if (!this.active || !this.observer) return

    const block: SealedBlock = {
      id: this.nextId++,
      wrapper,
      fragment: null,
      height: 0,
      visible: true,
    }

    this.blocks.push(block)
    wrapper.dataset.flowdownBlock = String(block.id)
    this.observer.observe(wrapper)
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const el = entry.target as HTMLElement
      const id = Number(el.dataset.flowdownBlock)
      const block = this.blocks[id]
      if (!block) continue

      if (!entry.isIntersecting && block.visible) {
        // Leaving viewport — virtualize
        block.height = el.offsetHeight
        const fragment = document.createDocumentFragment()
        while (el.firstChild) {
          fragment.appendChild(el.firstChild)
        }
        block.fragment = fragment
        el.style.height = block.height + 'px'
        block.visible = false
      } else if (entry.isIntersecting && !block.visible) {
        // Entering viewport — materialize
        el.style.height = ''
        if (block.fragment) {
          el.appendChild(block.fragment)
          block.fragment = null
        }
        block.visible = true
      }
    }
  }

  private findScrollParent(el: HTMLElement): HTMLElement | null {
    let current = el.parentElement
    while (current) {
      const overflow = getComputedStyle(current).overflowY
      if (overflow === 'auto' || overflow === 'scroll') return current
      current = current.parentElement
    }
    return null
  }

  getStats(): { total: number; visible: number; virtualized: number } {
    const visible = this.blocks.filter((b) => b.visible).length
    return {
      total: this.blocks.length,
      visible,
      virtualized: this.blocks.length - visible,
    }
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.blocks = []
    this.active = false
  }
}
