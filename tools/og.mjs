/* Снимает превью ссылки: node tools/og.mjs  →  assets/img/og.jpg (1200×630)
   Макет — tools/og.html. Нужен Chrome или Edge, npm не нужен. */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
  .find(p => fs.existsSync(p));
const DBG = 9700 + Math.floor(Math.random() * 200);
const browser = spawn(exe, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'og-'))}`,
  '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(200); }
}
const ws = new WebSocket(wsUrl);
await new Promise(r => (ws.onopen = r));
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
const send = (method, params = {}, sessionId) => new Promise(res => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method, params, sessionId })); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false }, s);
await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/tools/og.html` }, s);
await sleep(2500);
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 86 }, s);
const out = path.join(ROOT, 'assets/img/og.jpg');
fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log('готово:', out, Math.round(fs.statSync(out).size / 1024) + ' КБ');
ws.close(); browser.kill(); server.close();
setTimeout(() => process.exit(0), 300);
