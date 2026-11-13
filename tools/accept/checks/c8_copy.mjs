// Check 8: copy audit of every shipped byte (tools/accept/copy_audit.mjs).
import path from 'node:path';
import { Check, ACCEPT, load1 } from '../lib/util.mjs';
import { audit, loadWhitelist } from '../copy_audit.mjs';

export async function run(ctx) {
  const c = new Check('8', 'Copy audit');
  const wl = loadWhitelist(path.join(ACCEPT, 'copy_whitelist.json'));
  // the audit runs inside this process (no child command): its record has no exit code, and the time and the machine's 1-minute load average are taken around the audit itself
  const t0 = Date.now(), load1Start = load1();
  const res = audit({ zip: ctx.candidate.isZip ? ctx.candidate.path : null, dir: ctx.candidate.isZip ? ctx.dist : ctx.dist, whitelist: wl });
  c.commands.push({ cmd: `node tools/accept/copy_audit.mjs ${path.basename(ctx.candidate.path)} (in-process)`, exit: null, ms: Date.now() - t0, load1Start, load1End: load1(), note: `whitelist: ${wl.length} entries` });
  for (const f of res.blocking) c.defect(`copy:${f.rule}`, `${f.file}${f.line ? ':' + f.line : ''} [${f.where}]`, `${JSON.stringify(f.match)} ... ${f.context}`);
  for (const f of res.informational) c.note(`copy-info:${f.rule}`, f.file, f.context);
  for (const f of res.whitelisted) c.note('copy-whitelisted', `${f.file}${f.line ? ':' + f.line : ''}`, `${f.rule}: ${f.context.slice(0, 120)} -- whitelisted because: ${f.whitelistReason}`);
  c.metrics = { scanned: res.scanned, zip: res.zip, blocking: res.blocking.length, whitelisted: res.whitelisted.length, informational: res.informational.length, whitelistEntries: wl.length, rules: res.rules, pdfs: res.notes };
  return c.finish();
}
