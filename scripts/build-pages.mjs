import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = join(root, 'dist', 'pages')

await rm(outDir, { recursive: true, force: true })
await mkdir(join(outDir, 'vendor'), { recursive: true })
await mkdir(join(outDir, 'flowdown'), { recursive: true })

const demoHtmlPath = join(root, 'demo', 'index.html')
const html = (await readFile(demoHtmlPath, 'utf8'))
  .replace('../node_modules/marked/lib/marked.umd.js', './vendor/marked.umd.js')
  .replace('../packages/core/dist/index.js', './flowdown/index.js')

await writeFile(join(outDir, 'index.html'), html)
await writeFile(join(outDir, '.nojekyll'), '')

await copyFile(
  join(root, 'node_modules', 'marked', 'lib', 'marked.umd.js'),
  join(outDir, 'vendor', 'marked.umd.js'),
)
await copyFile(
  join(root, 'node_modules', 'marked', 'lib', 'marked.umd.js.map'),
  join(outDir, 'vendor', 'marked.umd.js.map'),
)

const coreDist = join(root, 'packages', 'core', 'dist')
for (const file of await readdir(coreDist)) {
  if (file.endsWith('.js') || file.endsWith('.js.map')) {
    await copyFile(join(coreDist, file), join(outDir, 'flowdown', file))
  }
}
