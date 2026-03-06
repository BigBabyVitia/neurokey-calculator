import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env manually for the dev API middleware
function loadEnv() {
  try {
    const env = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
    const vars = {}
    env.split('\n').forEach(line => {
      const [k, ...v] = line.split('=')
      if (k && v.length) vars[k.trim()] = v.join('=').trim()
    })
    return vars
  } catch { return {} }
}

function devApiPlugin() {
  let settings = null
  return {
    name: 'dev-api',
    configureServer(server) {
      const env = loadEnv()
      server.middlewares.use('/api/login', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' })); return }
        let body = ''
        req.on('data', c => body += c)
        req.on('end', () => {
          try {
            const { password } = JSON.parse(body)
            res.setHeader('Content-Type', 'application/json')
            if (password === env.ADMIN_PASSWORD) res.end(JSON.stringify({ ok: true }))
            else { res.statusCode = 401; res.end(JSON.stringify({ ok: false, error: 'Invalid password' })) }
          } catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Bad request' })) }
        })
      })
      server.middlewares.use('/api/settings', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') { res.end(JSON.stringify(settings)); return }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', c => body += c)
          req.on('end', () => {
            try {
              const { password, settings: s } = JSON.parse(body)
              if (password !== env.ADMIN_PASSWORD) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return }
              settings = s
              res.end(JSON.stringify({ ok: true }))
            } catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Bad request' })) }
          })
          return
        }
        res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' }))
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: { host: true },
})
