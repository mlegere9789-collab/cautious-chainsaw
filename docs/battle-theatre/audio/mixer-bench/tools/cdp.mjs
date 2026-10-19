// Minimal Chrome DevTools Protocol driver (Node 24 global WebSocket/fetch). Chrome is started below-normal priority; debug port 10781.
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
export const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export async function launchChrome({ port = 10781, profile, headless = true, extra = [], mute = true } = {}) {
  profile ||= path.join(os.tmpdir(), 'bt-audio-chrome-' + Date.now()); fs.mkdirSync(profile, { recursive: true });
  const args = [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required', ...(mute ? ['--mute-audio'] : []), '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', ...(headless ? ['--headless=new'] : []), ...extra, 'about:blank'];
  const cp = spawn(CHROME, args, { stdio: 'ignore' });
  try { os.setPriority(cp.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { console.error('setPriority', e.message); }  // children inherit below-normal
  for (let i = 0; i < 100; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return { cp, port, profile, version: await r.json() }; } catch {} await new Promise(r => setTimeout(r, 200)); }
  throw new Error('chrome did not start');
}
export async function newPage(port, url) {
  const r = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); const t = await r.json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map(); const logs = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const { res, rej } = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } else if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.args.map(a => a.value ?? a.description).join(' ')); else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400)); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  const evaluate = async (expression, timeout = 600000) => { const r = await Promise.race([send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }), new Promise((_, j) => setTimeout(() => j(new Error('evaluate timeout')), timeout))]); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800)); return r.result.value; };
  return { send, evaluate, logs, close: () => { try { ws.close(); } catch {} }, targetId: t.id };
}
export async function closeChrome(port) { try { const ws = new WebSocket((await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); ws.send(JSON.stringify({ id: 1, method: 'Browser.close' })); await new Promise(r => setTimeout(r, 500)); } catch {} }
