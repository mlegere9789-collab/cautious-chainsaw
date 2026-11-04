// Check 8: copy audit of every shipped byte (tools/accept/copy_audit.mjs).
import path from 'node:path';
import { Check, ACCEPT } from '../lib/util.mjs';
import { audit, loadWhitelist } from '../copy_audit.mjs';

export async function run(ctx) {
  const c = new Check('8', 'Copy audit');
  const wl = loadWhitelist(path.join(ACCEPT, 'copy_whitelist.json'));
  c.commands.push({ cmd: `node tools/accept/copy_audit.mjs ${path.basename(ctx.candidate.path)} (in-process)`, exit: null, ms: 0, note: `whitelist: ${wl.length} entries` });
  const res = audit({ zip: ctx.candidate.isZip ? ctx.candidate.path : null, dir: ctx.candidate.isZip ? ctx.dist : ctx.dist, whitelist: wl });
  for (const f of res.blocking) c.defect(`copy:${f.rule}`, `${f.file}${f.line ? ':' + f.line : ''} [${f.where}]`, `${JSON.stringify(f.match)} ... ${f.context}`);
  for (const f of res.informational) c.note(`copy-info:${f.rule}`, f.file, f.context);
  for (const f of res.whitelisted) c.note('copy-whitelisted', `${f.file}${f.line ? ':' + f.line : ''}`, `${f.rule}: ${f.context.slice(0, 120)} -- whitelisted because: ${f.whitelistReason}`);
  c.metrics = { scanned: res.scanned, zip: res.zip, blocking: res.blocking.length, whitelisted: res.whitelisted.length, informational: res.informational.length, whitelistEntries: wl.length, rules: res.rules, pdfs: res.notes };
  return c.finish();
}
