// After `vite build`: copies the PHP backend into dist/ so the hostinger branch gets one ready
// folder (index.php, api/, lib/ with schema.json, sitemap.php, robots.php).
import { cpSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) throw new Error('Run vite build first: dist/index.html is missing')

for (const file of ['index.php', 'sitemap.php', 'robots.php']) copyFileSync(join(root, 'server', file), join(dist, file))
for (const dir of ['api', 'lib']) cpSync(join(root, 'server', dir), join(dist, dir), { recursive: true })
mkdirSync(join(dist, 'lib'), { recursive: true })
copyFileSync(join(root, 'src/content/schema.json'), join(dist, 'lib/schema.json'))
console.log('PHP backend copied to dist/')
