/* Локальный сервер для просмотра сайта: node dev-server.js  →  http://localhost:5196
   Нужен только для разработки — на хостинг его заливать не надо. */
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname, port = +(process.env.PORT || 5196);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.vcf': 'text/vcard; charset=utf-8'
};
http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, path.normalize(rel));
  if (!file.startsWith(root)) { res.writeHead(403).end('403'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Не найдено: ' + rel); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log('Арсакаев → http://localhost:' + port));
