/* 橱窗档案 · Window Archive —— 纯静态预览服务器（无依赖）
   支持转发 CLI 参数：node serve.js [--host 127.0.0.1] [--port 7100] */
'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
let port = 7100
let host = '127.0.0.1'
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if ((a === '--port' || a === '-p') && args[i + 1]) port = Number(args[++i])
  else if ((a === '--host' || a === '-H') && args[i + 1]) host = args[++i]
  else if (/^\d+$/.test(a)) port = Number(a)
}

const ROOT = __dirname
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
}

http
  .createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0])
    if (p === '/' || p === '\\') p = '/index.html'
    const file = path.normalize(path.join(ROOT, p))
    if (!file.startsWith(ROOT)) {
      res.writeHead(403)
      return res.end('Forbidden')
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404)
        return res.end('Not found')
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      fs.createReadStream(file).pipe(res)
    })
  })
  .listen(port, host, () => {
    console.log(`window-archive dev server: http://${host}:${port}/`)
  })
