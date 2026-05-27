import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, existsSync, statSync } from 'fs'
import { resolve, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const RESULTS_DIR = resolve(__dirname, '..', 'results')

const MIME: Record<string, string> = {
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.tsv': 'text/tab-separated-values; charset=utf-8',
}

export default defineConfig({
  plugins: [
    react(),
    {
      // Serve ../results/ at /data/ during dev
      name: 'serve-results',
      configureServer(server) {
        server.middlewares.use('/data', (req, res, next) => {
          const safePath = (req.url ?? '/').replace(/\.\./g, '').replace(/^\//, '')
          const filePath = resolve(RESULTS_DIR, safePath)

          if (!filePath.startsWith(RESULTS_DIR)) { next(); return }
          if (!existsSync(filePath) || statSync(filePath).isDirectory()) { next(); return }

          const mime = MIME[extname(filePath)] ?? 'application/octet-stream'
          res.setHeader('Content-Type', mime)
          res.setHeader('Cache-Control', 'no-store')
          createReadStream(filePath).pipe(res)
        })
      },
    },
  ],
})
