// After `vite build`: copies the PHP backend into dist/ so the hostinger branch gets one ready
// folder (index.php, api/, lib/ with schema.json and defaults.json, sitemap.php, robots.php).
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) throw new Error('Run vite build first: dist/index.html is missing')

for (const file of ['index.php', 'sitemap.php', 'robots.php']) copyFileSync(join(root, 'server', file), join(dist, file))
for (const dir of ['api', 'lib']) cpSync(join(root, 'server', dir), join(dist, dir), { recursive: true })
mkdirSync(join(dist, 'lib'), { recursive: true })
copyFileSync(join(root, 'src/content/schema.json'), join(dist, 'lib/schema.json'))

// The starting texts (src/content/defaults.ts) as JSON, so index.php can write the pages' text into the
// HTML for crawlers even for sections that were never saved in the admin.
const ts = (await import('typescript')).default
const source = readFileSync(join(root, 'src/content/defaults.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const tmp = join(dist, 'lib', '.defaults.tmp.mjs')
writeFileSync(tmp, js)
try {
  const { DEFAULTS } = await import(pathToFileURL(tmp).href)
  writeFileSync(join(dist, 'lib/defaults.json'), JSON.stringify(DEFAULTS))
} finally {
  rmSync(tmp, { force: true })
}
console.log('PHP backend copied to dist/')
