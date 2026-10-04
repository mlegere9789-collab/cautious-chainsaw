#!/usr/bin/env node
// Parity check: tools/guide/features.json against what release train R1c (default) really contains.
//
//   node tools/guide/check-parity.mjs [--train R1c] [--features FILE] [--json] [--verbose]
//
// It never builds a release and never edits a patch. It reads, in memory:
//   * the Help dialog rows that the `help` patches of tools/t0/patches put into the baseline chunk (desktop list and phone list),
//   * the app's global key handler after the `js` patches (which keys are handled, the speed ceiling and floor),
//   * the site menu (site-nav.js GROUPS after the page patches) and the heading of every tool page after the page patches,
//   * the deep-link reader (group DL) in the patched bundle.
// A mismatch is a row the manifest and the build disagree on. Wording problems in the Help text itself are reported separately
// (they are copy defects, not parity defects). Exit 0 when there is no mismatch, 1 otherwise, 2 on unreadable input.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractHelp, extractNav, extractKeyHandler, applyTarget, flatRows } from './lib/t0src.mjs';
import { makeEnv, lintSource, REPO } from '../copy/lib/lint.mjs';

const normalise = (s) => s.replace(/\s+/g, ' ').trim();
const stripTags = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;/g, '’').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

export function runParity({ root = REPO, train = 'R1c', featuresPath = path.join(root, 'tools', 'guide', 'features.json') } = {}) {
  const features = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
  const mismatches = [];
  const info = [];
  const mm = (code, message, extra = {}) => mismatches.push({ code, message, ...extra });
  const rank = (t) => ['baseline', 'R0', 'R1a', 'R1b', 'R1c'].indexOf(t);

  // ---- Help dialog rows
  const help = extractHelp({ root, train });
  const deskRows = flatRows(help.desktop);
  const phoneRows = flatRows(help.phone);
  const compareRows = (rows, items, label) => {
    const byKey = new Map(rows.map((r) => [normalise(r.key), r]));
    const used = new Set();
    for (const it of items) {
      if (it.removed_in && rank(it.removed_in) <= rank(train)) continue;
      if (rank(it.help_since ?? it.since) > rank(train)) continue; // the behaviour can predate its Help row (help_since)
      if (!it.help) { mm('HELP_ROW_MISSING_IN_MANIFEST', `${label} ${it.id} has no Help row in the manifest (help: null) but is not marked removed`, { id: it.id }); continue; }
      const key = normalise(it.help.key);
      const row = byKey.get(key);
      if (!row) { mm('MANIFEST_ROW_NOT_IN_HELP', `${label} ${it.id}: the manifest expects the Help row "${it.help.key}" but the ${train} Help dialog has none`, { id: it.id }); continue; }
      used.add(key);
      if (normalise(row.desc) !== normalise(it.help.desc)) mm('HELP_TEXT_DIFFERS', `${label} ${it.id}: the Help dialog says "${row.desc}", the manifest records "${it.help.desc}"`, { id: it.id });
    }
    for (const r of rows) if (!used.has(normalise(r.key))) mm('HELP_ROW_NOT_IN_MANIFEST', `${label}: the ${train} Help dialog has the row "${r.key}" (${r.desc}) that the manifest does not describe`, { key: r.key });
  };
  compareRows(deskRows, features.hotkeys, 'hotkey');
  compareRows(phoneRows, features.gestures, 'gesture');
  for (const it of features.hotkeys) if (it.removed_in && rank(it.removed_in) <= rank(train) && it.help) mm('REMOVED_ROW_STILL_LISTED', `${it.id} is marked removed in ${it.removed_in} but the manifest still lists a Help row`, { id: it.id });
  for (const it of features.gestures) if (rank(it.since) > rank(train)) mm('SINCE_AFTER_TRAIN', `${it.id} is marked since ${it.since}, after ${train}`, { id: it.id });

  // ---- key handler
  const kh = extractKeyHandler({ root, train });
  const documentedKeys = new Set();
  for (const it of features.hotkeys) {
    const removed = it.removed_in && rank(it.removed_in) <= rank(train);
    for (const k of it.event_keys || []) {
      if (removed) { if (kh.keys.has(k)) mm('REMOVED_KEY_STILL_HANDLED', `${it.id}: key "${k}" is marked removed in ${it.removed_in} but the ${train} handler still has a case for it`, { id: it.id }); continue; }
      documentedKeys.add(k);
      if (!kh.keys.has(k)) mm('HOTKEY_WITHOUT_HANDLER', `${it.id}: no case for "${k}" in the ${train} key handler`, { id: it.id });
    }
  }
  for (const k of kh.keys) if (!documentedKeys.has(k)) mm('HANDLER_KEY_UNDOCUMENTED', `the ${train} key handler has a case for "${k}" that no manifest hotkey lists`, { key: k });
  const speedUp = features.hotkeys.find((h) => h.id === 'speed-up');
  const speedDown = features.hotkeys.find((h) => h.id === 'speed-down');
  const up = speedUp?.text.match(/up to (\d+) times/); const down = speedDown?.text.match(/down to ([\d.]+) times/);
  if (!up || Number(up[1]) !== kh.speed.max) mm('SPEED_CEILING', `manifest says up to ${up?.[1]} times, the handler caps at ${kh.speed.max}`);
  if (!down || Number(down[1]) !== kh.speed.min) mm('SPEED_FLOOR', `manifest says down to ${down?.[1]} times, the handler floors at ${kh.speed.min}`);

  // ---- site menu and pages
  const nav = extractNav({ root, train });
  const navItems = nav.groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.name })));
  const manifestIds = new Set(features.tools.map((t) => t.id));
  for (const t of features.tools) {
    const n = navItems.find((i) => i.id === t.id);
    if (!n) { mm('TOOL_NOT_IN_MENU', `${t.id} is in the manifest but not in the ${train} site menu`, { id: t.id }); continue; }
    if (n.group !== t.group) mm('TOOL_GROUP_DIFFERS', `${t.id}: menu group "${n.group}", manifest "${t.group}"`, { id: t.id });
    const page = path.join(root, 'baseline', 'dist', n.href.replace(/^\//, ''));
    let h1 = null;
    try { const r = applyTarget({ root, train, target: n.href.replace(/^\//, ''), text: fs.readFileSync(page, 'utf8') }); h1 = stripTags((r.text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || ''); } catch (e) { mm('PAGE_UNREADABLE', `${t.id}: ${e.message}`, { id: t.id }); continue; }
    if (h1 !== t.h1) mm('TOOL_H1_DIFFERS', `${t.id}: the ${train} page heading is "${h1}", the manifest says "${t.h1}"`, { id: t.id });
    info.push({ id: t.id, menu_label: n.label, canonical: t.canonical, differs: n.label !== t.canonical });
  }
  for (const n of navItems) if (!manifestIds.has(n.id)) mm('MENU_ITEM_NOT_IN_MANIFEST', `the ${train} site menu lists ${n.id} (${n.label}) that the manifest does not`, { id: n.id });
  for (const h of features.tools_hidden || []) if (navItems.some((i) => i.id === h.id)) mm('HIDDEN_TOOL_IN_MENU', `${h.id} is marked hidden but the ${train} menu lists it`, { id: h.id });
  const wantTools = Number(rank(train) >= rank('R1a') ? 19 : 20);
  if (navItems.length !== wantTools) info.push({ note: `menu has ${navItems.length} items`, expected: wantTools });

  // ---- deep links (patched bundle)
  {
    const entry = applyTarget({ root, train, target: 'js', text: fs.readFileSync(path.join(root, 'baseline', 'dist', 'assets', 'index-Cg8FAMXN.js'), 'utf8') }).text;
    const start = entry.indexOf('new URLSearchParams(location.search),g=k=>');
    const reader = start >= 0 ? entry.slice(start, start + 2600) : '';
    const live = features.deeplinks.params.filter((p) => rank(p.since) <= rank(train));
    if (live.some((p) => p.where === 'deeplink-reader') && !reader) mm('DEEPLINK_READER_MISSING', 'the deep-link reader was not found in the patched bundle');
    for (const p of live) {
      for (const name of [p.name, p.alias].filter(Boolean)) {
        const ok = p.where === 'layout-init' ? entry.includes(`new URLSearchParams(location.search).get("${name}")`) : reader.includes(`g("${name}")`);
        if (!ok) mm('DEEPLINK_PARAM_NOT_READ', `parameter ${name} is in the manifest but the ${train} app does not read it`, { id: name });
      }
    }
    if (live.some((p) => p.where === 'deeplink-reader')) for (const frag of ['t>=1&&t<=675', 'd>=1&&d<=3', 'Math.max(11,Math.min(18,z))', 'lat>=39.7&&lat<=39.93&&lng>=-77.38&&lng<=-77.1']) if (!reader.includes(frag)) mm('DEEPLINK_RANGE_CHANGED', `the reader no longer contains ${frag}`);
  }

  // ---- wording: the Help dialog text against the style guide (a copy report, not a parity failure)
  const env = makeEnv({ root });
  const helpStrings = [...help.desktop, ...help.phone].flatMap((r) => (r.section ? [r.section] : [r.key, r.desc]));
  const helpFindings = lintSource('help.txt', helpStrings.join('\n\n'), env).findings;
  const byRule = helpFindings.reduce((m, f) => { (m[f.rule] ||= []).push(f.match); return m; }, {});

  return { train, features: path.relative(root, featuresPath).replace(/\\/g, '/'), counts: { hotkeys: features.hotkeys.length, gestures: features.gestures.length, tools: features.tools.length, helpDesktopRows: deskRows.length, helpPhoneRows: phoneRows.length, menuItems: navItems.length, helpPatchesApplied: help.applied.length, jsPatchesApplied: kh.applied.length }, mismatches, helpWording: byRule, info };
}

function main(argv = process.argv.slice(2), { log = console.log, err = console.error } = {}) {
  const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  let res;
  try { res = runParity({ train: opt('train', 'R1c'), featuresPath: opt('features') ? path.resolve(opt('features')) : undefined }); } catch (e) { err(`parity could not run: ${e.message}`); return 2; }
  if (argv.includes('--json')) { log(JSON.stringify(res, null, 1)); return res.mismatches.length ? 1 : 0; }
  const c = res.counts;
  log(`parity: ${res.features} against release train ${res.train}`);
  log(`  Help dialog: ${c.helpDesktopRows} desktop rows, ${c.helpPhoneRows} phone rows (${c.helpPatchesApplied} help patches applied to the baseline chunk)`);
  log(`  manifest: ${c.hotkeys} hotkeys, ${c.gestures} gestures, ${c.tools} tools; site menu ${c.menuItems} items; ${c.jsPatchesApplied} bundle patches applied to read the key handler`);
  if (!res.mismatches.length) log('  mismatches: 0');
  else { log(`  mismatches: ${res.mismatches.length}`); for (const m of res.mismatches) log(`    ${m.code}: ${m.message}`); }
  const rules = Object.entries(res.helpWording);
  if (rules.length) { log(`  Help dialog wording against docs/content/STYLEGUIDE.md (copy defects in the ${res.train} text, not parity failures):`); for (const [r, ms] of rules) log(`    ${r} x${ms.length}: ${[...new Set(ms)].slice(0, 6).join(', ')}`); } else log('  Help dialog wording: no style findings');
  if (argv.includes('--verbose')) for (const i of res.info) log('  info ' + JSON.stringify(i));
  return res.mismatches.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exit(main());
export { main };
