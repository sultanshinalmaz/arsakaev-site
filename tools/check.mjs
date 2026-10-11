/* Проверка вёрстки в headless Chrome без npm.
   node tools/check.mjs pc|phone <папка для снимков>
   Поднимает свой сервер, прокручивает страницу (чтобы сработали появления),
   снимает страницу кусками и печатает ошибки консоли. */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'pc';
const OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'arsakaev-shots'));
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.vcf': 'text/vcard' };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']
  .find(p => fs.existsSync(p));
const DBG = 9300 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-'));
const browser = spawn(exe, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`, '--no-first-run',
  '--hide-scrollbars', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(200); }
}
const ws = new WebSocket(wsUrl);
await new Promise(r => (ws.onopen = r));
let seq = 0; const pend = new Map(); const logs = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  else if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) logs.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description).join(' '));
  else if (m.method === 'Runtime.exceptionThrown') logs.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  else if (m.method === 'Network.loadingFailed') logs.push('net fail: ' + m.params.errorText);
  else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) logs.push('http ' + m.params.response.status + ' ' + m.params.response.url);
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, s); await send('Runtime.enable', {}, s); await send('Network.enable', {}, s);
const phone = mode !== 'pc';
// phone — iPhone 14 (видимая высота в Safari ≈ 664), se — iPhone SE (≈ 548), android — узкий 360
const SIZES = { pc: [1440, 900], phone: [390, 664], se: [375, 548], android: [360, 700] };
const [VW, VH] = SIZES[mode] || SIZES.pc;
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: phone ? 2 : 1, mobile: phone }, s);
if (phone) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` }, s);
await sleep(2500);
const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s)).result.value;

const total = await ev('document.documentElement.scrollHeight');
for (let y = 0; y <= total; y += Math.round(VH * 0.6)) { await ev(`window.scrollTo({top:${y},behavior:'instant'})`); await sleep(220); }
await sleep(1500);
await ev(`window.scrollTo({top:0,behavior:'instant'})`);
await sleep(600);

// проверки: горизонтальная прокрутка, невидимые после прокрутки блоки
const report = await ev(`(() => {
  const r = {};
  r.scrollW = document.documentElement.scrollWidth; r.vw = innerWidth; r.height = document.documentElement.scrollHeight;
  r.hidden = [...document.querySelectorAll('.js-reveal .head,.ticket,.board,.cond,.chart,.svc__item,.path__i,.story,.point')].filter(e => getComputedStyle(e).opacity < .5).length;
  r.wide = [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.final__lattice,.hero::before'); }).slice(0, 8).map(e => e.tagName + '.' + (e.className.baseVal ?? e.className));
  const wa = document.querySelector('.hero .btn--green').getBoundingClientRect();
  r.waBottom = Math.round(wa.bottom) + ' / экран ' + innerHeight;
  r.smallTaps = [...document.querySelectorAll('a,button')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.height < 40 || b.width < 40) && getComputedStyle(e).display !== 'none'; }).map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
  r.flaps = [...document.querySelectorAll('.flap')].map(f => f.textContent).join('');
  r.fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight).filter((v, i, a) => a.indexOf(v) === i);
  return r;
})()`);
console.log(JSON.stringify(report, null, 1));

// первый экран ровно как его видит человек (с шапкой)
{
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, s);
  const f = path.join(OUT, `${mode}-first.jpg`); fs.writeFileSync(f, Buffer.from(shot.data, 'base64')); console.log('первый экран', f);
}
const H = await ev('document.documentElement.scrollHeight');
const CH = phone ? 2400 : 3000;
let n = 0;
for (let y = 0; y < H; y += CH) {
  const h = Math.min(CH, H - y);
  await ev(`window.scrollTo({top:${y},behavior:'instant'})`); await sleep(400);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80, captureBeyondViewport: true,
    clip: { x: 0, y, width: VW, height: h, scale: phone ? 0.5 : 0.6 } }, s);
  const f = path.join(OUT, `${mode}-${String(n++).padStart(2, '0')}.jpg`);
  fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
  console.log('снимок', f);
}
// крупные снимки элементов: SEL='.chart,.svc' node tools/check.mjs pc out
for (const [k, sel] of (process.env.SEL || '').split(',').filter(Boolean).entries()) {
  const b = await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }; })()`);
  await sleep(2500);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88, captureBeyondViewport: true, clip: { x: b.x, y: b.y, width: b.w, height: b.h, scale: 1 } }, s);
  const f = path.join(OUT, `${mode}-el${k}.jpg`); fs.writeFileSync(f, Buffer.from(shot.data, 'base64')); console.log('элемент', sel, f);
}
console.log(logs.length ? 'КОНСОЛЬ:\n' + logs.join('\n') : 'консоль чистая');
ws.close(); browser.kill(); server.close();
setTimeout(() => process.exit(0), 300);
