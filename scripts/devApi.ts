import { existsSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import path from 'node:path'
import { loadEnv, type Plugin } from 'vite'

/**
 * Runs the Vercel functions in /api inside `npm run dev`, so the AI trainer
 * works locally without the Vercel CLI.
 *
 * Keys come from .env.local (git-ignored). They're only put into the dev
 * server's process.env; the browser never sees them, because Vite only
 * exposes variables whose names start with VITE_.
 */
export function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const name = req.url.slice('/api/'.length).split('?')[0]
        const file = path.resolve(server.config.root, 'api', `${name}.ts`)
        if (!/^[\w-]+$/.test(name) || !existsSync(file)) return next()

        try {
          const mod = (await server.ssrLoadModule(file)) as Record<string, (r: Request) => Promise<Response>>
          const handler = mod[req.method ?? 'GET']
          if (!handler) {
            res.statusCode = 405
            return res.end('Method not allowed')
          }
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const request = new Request(new URL(req.url, 'http://localhost'), {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: hasBody ? await readBody(req) : undefined,
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          if (response.body) {
            const reader = response.body.getReader()
            for (;;) {
              const { value, done } = await reader.read()
              if (done) break
              res.write(value)
            }
          }
          res.end()
        } catch (err) {
          server.config.logger.error(`[dev-api] ${name}: ${(err as Error).stack ?? err}`)
          res.statusCode = 500
          res.end('Dev API error, see the terminal')
        }
      })
    },
  }
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
