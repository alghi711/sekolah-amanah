const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2' };
const server = http.createServer((req,res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const requested = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const filename = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(filename, (error,data) => {
      if(error) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type':mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  } catch { res.writeHead(400); res.end('Bad request'); }
});
server.listen(process.env.PORT || 4173, '127.0.0.1', () => console.log(`Sekolah Amanah Pixel: http://localhost:${server.address().port}`));
