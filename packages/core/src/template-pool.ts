const cache = new Map<string, HTMLElement>()

export function createElement(tag: string): HTMLElement {
  let template = cache.get(tag)
  if (!template) {
    template = document.createElement(tag)
    cache.set(tag, template)
  }
  return template.cloneNode(false) as HTMLElement
}
