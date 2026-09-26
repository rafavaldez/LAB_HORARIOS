// Vista previa opcional: node tools/preview.cjs. GitHub Pages no ejecuta este archivo.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
http.createServer((request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    pathname = pathname.replace(/^\/LAB_HORARIOS(?=\/)/, '');
    if (pathname.endsWith('/')) pathname += 'index.html';
    const target = path.resolve(root, '.' + pathname);
    if (!target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const data = fs.readFileSync(target);
    response.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch { response.writeHead(404).end('Archivo no encontrado'); }
}).listen(8765, '127.0.0.1', () => console.log('Vista previa: http://127.0.0.1:8765/LAB_HORARIOS/'));
