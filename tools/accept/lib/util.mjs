// tools/accept/lib/util.mjs - shared helpers of the end-of-mission acceptance harness (no site code is touched here).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ACCEPT = path.resolve(HERE, '..');
export const REPO = path.resolve(ACCEPT, '..', '..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const sha256File = (f) => sha256(fs.readFileSync(f));
export const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
export const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n'); };

export function parseArgs(argv, spec = {}) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const eq = a.indexOf('=');
    const key = (eq > 0 ? a.slice(2, eq) : a.slice(2));
    const isBool = spec[key] === 'bool';
    if (eq > 0) out[key] = a.slice(eq + 1);
    else if (isBool || i + 1 >= argv.length || argv[i + 1].startsWith('--')) out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

export function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out); else if (e.isFile()) out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

// ------------------------------------------------------------------ zip reader (stored + deflate; no zip64), exposes comment and entry names
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip: end-of-central-directory record not found');
  const total = buf.readUInt16LE(eocd + 10), cdSize = buf.readUInt32LE(eocd + 12), cdOff = buf.readUInt32LE(eocd + 16), cLen = buf.readUInt16LE(eocd + 20);
  const comment = buf.subarray(eocd + 22, eocd + 22 + cLen).toString('utf8');
  const entries = [];
  let p = cdOff;
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`bad central directory entry ${n}`);
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    const enc = (flags & 0x800) ? 'utf8' : 'latin1';
    const name = buf.subarray(p + 46, p + 46 + nl).toString(enc);
    const ecomment = buf.subarray(p + 46 + nl + el, p + 46 + nl + el + cl).toString(enc);
    entries.push({ name, comment: ecomment, method, crc, csize, usize, lho, extraLen: el, dirEntry: name.endsWith('/') });
    p += 46 + nl + el + cl;
  }
  const data = (e) => {
    const l = e.lho; if (buf.readUInt32LE(l) !== 0x04034b50) throw new Error(`bad local header for ${e.name}`);
    const start = l + 30 + buf.readUInt16LE(l + 26) + buf.readUInt16LE(l + 28);
    const raw = buf.subarray(start, start + e.csize);
    return e.method === 0 ? Buffer.from(raw) : e.method === 8 ? zlib.inflateRawSync(raw) : (() => { throw new Error(`unsupported compression ${e.method} for ${e.name}`); })();
  };
  return { entries, comment, data, cdOff, total };
}

/** extract a zip into a brand-new directory; refuses unsafe names (zip-slip). Returns {files:[rel], problems:[...]} */
export function extractZip(zipPath, destDir) {
  const buf = fs.readFileSync(zipPath);
  const z = readZip(buf);
  fs.mkdirSync(destDir, { recursive: true });
  const files = [], problems = [];
  const seen = new Set();
  for (const e of z.entries) {
    if (e.dirEntry) { problems.push(`directory entry in zip: ${e.name}`); continue; }
    if (/^\/|^[A-Za-z]:|(^|\/)\.\.(\/|$)|\\/.test(e.name)) { problems.push(`unsafe or non-portable entry name: ${e.name}`); continue; }
    if (seen.has(e.name)) problems.push(`duplicate entry name: ${e.name}`);
    seen.add(e.name);
    const d = z.data(e);
    if (crc32(d) !== e.crc) problems.push(`CRC mismatch: ${e.name}`);
    const out = path.join(destDir, ...e.name.split('/'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, d);
    files.push(e.name);
  }
  return { files, problems, zip: z };
}
let CRC_T;
export function crc32(buf) {
  if (!CRC_T) { CRC_T = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c; } }
  let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// ------------------------------------------------------------------ processes
export function runCmd(cmd, args, { cwd = REPO, timeoutMs = 600000, env = {} } = {}) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...env } });
  return { cmd: [cmd, ...args].join(' '), exit: r.status, signal: r.signal, timedOut: !!(r.error && r.error.code === 'ETIMEDOUT'), ms: Date.now() - t0, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error ? String(r.error.message) : null };
}
export function runCmdAsync(cmd, args, { cwd = REPO, timeoutMs = 600000, env = {} } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now(); let out = '', err = '', timedOut = false;
    const p = spawn(cmd, args, { cwd, env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...env }, windowsHide: true });
    const to = setTimeout(() => { timedOut = true; try { spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { p.kill('SIGKILL'); } }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code, signal) => { clearTimeout(to); resolve({ cmd: [cmd, ...args].join(' '), exit: code, signal, timedOut, ms: Date.now() - t0, stdout: out, stderr: err, error: null }); });
    p.on('error', (e) => { clearTimeout(to); resolve({ cmd: [cmd, ...args].join(' '), exit: null, signal: null, timedOut, ms: Date.now() - t0, stdout: out, stderr: err, error: String(e.message) }); });
  });
}
export const tail = (s, n = 4000) => (s.length > n ? '...' + s.slice(-n) : s);

export function freshTmp(prefix) {
  // under the repository's tmp/ (git-ignored): suites that build trees next to the unzipped candidate (T0-CP-01, HDR-24 ...) use the builder, which refuses to write outside release/ and tmp/
  const base = fs.existsSync(path.join(REPO, 'tmp')) ? path.join(REPO, 'tmp', 'accept-scratch') : os.tmpdir();
  const dir = path.join(base, `${prefix}-${process.pid}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ------------------------------------------------------------------ result model
/** A check result.  status: 'RAN' | 'NOT RUN'.  defects[] count against the verdict; notes[] are information only. */
export class Check {
  constructor(id, name) { this.id = id; this.name = name; this.status = 'RAN'; this.reason = null; this.defects = []; this.notes = []; this.metrics = {}; this.commands = []; this.raw = {}; this.notRunParts = []; this.started = new Date().toISOString(); }
  defect(code, where, detail, extra = {}) { this.defects.push({ code, where, detail: String(detail).slice(0, 600), ...extra }); }
  note(code, where, detail, extra = {}) { this.notes.push({ code, where, detail: String(detail).slice(0, 600), ...extra }); }
  notRun(reason) { this.status = 'NOT RUN'; this.reason = reason; return this; }
  finish() { this.finished = new Date().toISOString(); return this; }
  get clean() { return this.status === 'RAN' && this.defects.length === 0 && this.notRunParts.length === 0; }
}

export const loadThresholds = () => readJson(path.join(ACCEPT, 'thresholds.json'));

export function percentile(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}
export const round = (n, d = 1) => (n == null || Number.isNaN(n) ? n : Math.round(n * 10 ** d) / 10 ** d);
export const mdEscape = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
