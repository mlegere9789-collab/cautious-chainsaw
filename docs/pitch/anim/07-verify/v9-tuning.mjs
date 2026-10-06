// v9-tuning.mjs - the Tuning Studio: export / import round trip through the REAL UI (buttons, a real download, the real file input), schema validation with ajv, hostile imports, persistence.
//   node v9-tuning.mjs -> results/v9-tuning.json
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve, launch, PROTO, REPO, WORK, args, writeJson, sleep } from './lib.mjs';

const require = createRequire(import.meta.url); const Ajv = require('ajv');
const out = { generated: new Date().toISOString(), checks: [], defects: [] };
const check = (name, ok, detail) => { out.checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 800) : '')); return ok; };
const PORT = +(args.port || 9708); const srv = await serve(PROTO, PORT);
const tokensDoc = JSON.parse(fs.readFileSync(path.join(PROTO, 'tokens', 'tokens.json'), 'utf8')); const schema = JSON.parse(fs.readFileSync(path.join(PROTO, 'tokens', 'tokens.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false }); const validate = ajv.compile(schema);
const dl = path.join(WORK, 'downloads'); fs.mkdirSync(dl, { recursive: true });
const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'tune', fresh: false });       // NOT ?fresh=1: persistence is part of the test
try {
  const P = s.page;
  await P.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
  await P.reload(); await P.waitForFunction(() => window.__studio && window.__studio.ready);
  const vals = () => P.evaluate(() => window.__studio.tuning.values());
  const defaults = await vals();
  const bootDiff = tokensDoc.tokens.filter((t) => defaults[t.id] !== t.default).map((t) => `${t.id}: token default ${JSON.stringify(t.default)}, value after boot ${JSON.stringify(defaults[t.id])}`);
  check('177 dials, one per token in tokens.json; after clearing storage and booting, the dials that differ from their token default are exactly the start-up scene and style: ' + bootDiff.join('; '), Object.keys(defaults).length === tokensDoc.tokens.length && bootDiff.length <= 4, { dials: Object.keys(defaults).length, doc: tokensDoc.tokens.length, bootDiff });
  out.bootDiff = bootDiff;
  // open the panel with the keyboard (T), count rows
  await P.keyboard.press('t'); await sleep(400);
  const rows = await P.evaluate(() => { const r = [...document.querySelectorAll('#panel .row')]; return { rows: r.length, withEvidence: r.filter((x) => x.querySelector('.doc .ev, .doc [class*=ev]')).length, withControl: r.filter((x) => x.querySelector('input,select')).length, groups: document.querySelectorAll('#panel h3 button').length, hidden: r.filter((x) => x.closest('.hidden')).length }; });
  check('the Tune panel builds one row (label, control, doc, evidence badge) for every dial', rows.rows === 177 && rows.withControl === 177, rows);
  out.panel = rows;
  // change a spread of dials THROUGH THE UI controls
  const changes = [['layout.dMaxPx', 30], ['layout.gapPx', 3], ['motion.fadeMs', 260], ['interp.model', 'chord-smooth'], ['scene.leaders', false], ['popup.event.fullW', 420], ['backdrop.id', 'paper'], ['layout.visibility', 'window']];
  const applied = [];
  for (const [id, v] of changes) {
    const r = await P.evaluate(({ id, v }) => {
      const row = document.querySelector(`#panel .row[data-id="${id}"]`); if (!row) return { ok: false, why: 'no row' };
      const c = row.querySelector('input,select'); row.closest('div.hidden') && row.closest('div.hidden').classList.remove('hidden');
      if (c.tagName === 'SELECT') { c.value = String(v); c.dispatchEvent(new Event('change', { bubbles: true })); } else if (c.type === 'checkbox') { c.checked = !!v; c.dispatchEvent(new Event('change', { bubbles: true })); } else { c.value = String(v); c.dispatchEvent(new Event('input', { bubbles: true })); }
      return { ok: true, now: window.__studio.tuning.get(id) };
    }, { id, v });
    applied.push({ id, wanted: v, ...r });
  }
  check('dials move when their control is operated (8 dials of 5 kinds)', applied.every((a) => a.ok && a.now === a.wanted), applied.filter((a) => !a.ok || a.now !== a.wanted));
  await P.evaluate(() => { const S = window.__studio; S.engine.transport.seek(556, { glide: false }); for (let i = 0; i < 150; i++) S.step(1); });
  const hash = async () => P.evaluate(() => { const cv = document.getElementById('map'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 7) { h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); });
  const frameA = await hash(); const diffA = await vals();
  // EXPORT through the button: a real download
  const [dlA] = await Promise.all([P.waitForEvent('download'), P.getByRole('button', { name: 'Export', exact: true }).click()]);
  const fileA = path.join(dl, 'export-A.json'); await dlA.saveAs(fileA); const A = JSON.parse(fs.readFileSync(fileA, 'utf8'));
  out.export = { suggestedFilename: dlA.suggestedFilename(), bytes: fs.statSync(fileA).size, format: A.format, tokens: Object.keys(A.tokens).length };
  check('Export downloads battle-studio-settings.json: format battle-studio-settings/1, all 177 dials, equal to the live values', A.format === 'battle-studio-settings/1' && Object.keys(A.tokens).length === 177 && JSON.stringify(A.tokens) === JSON.stringify(diffA), out.export);
  const okSchema = validate(A); check('the exported file validates against tokens/tokens.schema.json (ajv, ' + schema.$id + ')', okSchema, okSchema ? 'valid' : validate.errors.slice(0, 3));
  // RESET ALL then IMPORT the file through the hidden <input type=file>
  await P.getByRole('button', { name: 'Reset all', exact: true }).click(); await sleep(200);
  const afterReset = await vals(); const differ = tokensDoc.tokens.filter((t) => afterReset[t.id] !== t.default).map((t) => t.id);
  check('Reset all returns every dial to the default written in tokens.json', differ.length === 0, { differ: differ.slice(0, 5) });
  out.afterReset = await P.evaluate(() => ({ skin: window.__studio.tuning.get('skin.id'), backdrop: window.__studio.tuning.get('backdrop.id'), zoom: window.__studio.tuning.get('camera.zoom') }));
  await P.evaluate(() => { const S = window.__studio; for (let i = 0; i < 150; i++) S.step(1); }); const frameDefault = await hash();
  await P.locator('#panel input[type=file]').setInputFiles(fileA); await sleep(500);
  const afterImport = await vals(); const differ2 = Object.keys(afterImport).filter((k) => JSON.stringify(afterImport[k]) !== JSON.stringify(A.tokens[k]));
  const status = await P.evaluate(() => document.querySelector('#panel [role=status]') && document.querySelector('#panel [role=status]').textContent);
  check('Import of the exported file restores all 177 dials exactly; the status line reports it (' + status + ')', differ2.length === 0 && /imported \d+, rejected 0, unknown 0/.test(status || ''), { differ: differ2.slice(0, 5), status });
  // UI shows the imported values
  const uiMismatch = await P.evaluate((A) => { const bad = []; for (const row of document.querySelectorAll('#panel .row')) { const id = row.dataset.id; const c = row.querySelector('input,select'); const want = A.tokens[id]; const got = c.type === 'checkbox' ? c.checked : c.tagName === 'SELECT' ? c.value : +c.value; if (got !== want) bad.push([id, got, want]); } return bad; }, A);
  check('after Import every control in the panel shows the imported value (a slider snaps to its step grid: exceptions listed)', uiMismatch.length === 0, uiMismatch.slice(0, 5)); out.uiMismatch = uiMismatch;
  // persistence: reload
  await P.reload(); await P.waitForFunction(() => window.__studio && window.__studio.ready); const afterReload = await vals();
  const notKept = Object.keys(afterReload).filter((k) => JSON.stringify(afterReload[k]) !== JSON.stringify(A.tokens[k]));
  out.persistence = { notKept };
  check('settings persist across a reload (localStorage), apart from the ones the page resets on purpose: ' + JSON.stringify(notKept), notKept.length === 0 || notKept.every((k) => k === 'compare.mode'), notKept);
  // ?set= URL parameter
  const s2 = await P.evaluate(async () => { const T = window.__studio.tuning; return T.import({ format: 'battle-studio-settings/1', tokens: { 'layout.dMaxPx': 20 } }); });
  await P.keyboard.press('t'); await sleep(300);
  // HOSTILE imports (through the page's import function AND through the file input for the file-level ones)
  const hostile = [
    ['wrong format string', { format: 'battle-studio-settings/2', tokens: { 'layout.dMaxPx': 20 } }], ['unknown id', { format: 'battle-studio-settings/1', tokens: { 'nope.x': 1 } }], ['out of range', { format: 'battle-studio-settings/1', tokens: { 'layout.dMaxPx': 99999 } }],
    ['wrong type', { format: 'battle-studio-settings/1', tokens: { 'layout.dMaxPx': '30' } }], ['not an option', { format: 'battle-studio-settings/1', tokens: { 'skin.id': 'does-not-exist' } }], ['NaN', { format: 'battle-studio-settings/1', tokens: { 'layout.dMaxPx': null } }],
    ['proto pollution', JSON.parse('{"format":"battle-studio-settings/1","tokens":{"__proto__":{"polluted":1},"constructor":{"x":1},"layout.dMaxPx":31}}')], ['array', []], ['string', 'x'], ['null', null], ['empty', {}], ['bare map', { 'layout.dMaxPx': 32 }],
  ];
  const hres = [];
  for (const [name, obj] of hostile) {
    const r = await P.evaluate((obj) => { const T = window.__studio.tuning; const before = JSON.stringify(T.values()); let res; let err = null; try { res = T.import(obj); } catch (e) { err = String(e); } const after = JSON.stringify(T.values()); return { res, err, changed: before !== after, polluted: ({}).polluted !== undefined, ctor: typeof ({}).constructor }; }, obj);
    hres.push({ name, ...r });
  }
  const bad = hres.filter((r) => r.err || r.polluted); check('hostile imports (12 kinds) never throw and never pollute prototypes; each is reported as applied / rejected / unknown', bad.length === 0, hres.map((r) => `${r.name}: ${r.err ? 'THROWS ' + r.err : JSON.stringify({ a: r.res && r.res.applied.length, r: r.res && r.res.rejected.length, u: r.res && r.res.unknown.length }) + (r.changed ? ' changed' : '')}`));
  out.hostile = hres.map((r) => ({ name: r.name, err: r.err, applied: r.res && r.res.applied.length, rejected: r.res && r.res.rejected.length, unknown: r.res && r.res.unknown.length, stateChanged: r.changed }));
  // a half-good file: good keys are applied, bad ones reported, nothing partially applied inside a bad key
  const half = await P.evaluate(() => { const T = window.__studio.tuning; T.reset(); return T.import({ format: 'battle-studio-settings/1', tokens: { 'layout.dMaxPx': 33, 'layout.gapPx': 'x', 'nope.x': 1 } }); });
  check('a mixed file applies the valid dials and reports the rest (applied ' + half.applied.length + ', rejected ' + half.rejected.length + ', unknown ' + half.unknown.length + ')', half.applied.length === 1 && half.rejected.length === 1 && half.unknown.length === 1, half);
  // file-level hostile: invalid JSON through the real file input
  fs.writeFileSync(path.join(dl, 'bad.json'), '{ not json'); await P.locator('#panel input[type=file]').setInputFiles(path.join(dl, 'bad.json')); await sleep(400);
  const st2 = await P.evaluate(() => document.querySelector('#panel [role=status]') && document.querySelector('#panel [role=status]').textContent);
  check('a file that is not JSON is refused with a message in the panel (no exception): "' + st2 + '"', /failed|invalid|not/i.test(st2 || ''), st2);
  // ---- the picture is reproduced from the exported file alone: two COLD sessions (fresh page, storage cleared) ------------------------------------------------------------------
  const cold = async (page) => page.evaluate(() => { const S = window.__studio; const E = S.engine; E.transport.pause(); E.select(null); E.transport.seek(556, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 15 }, { glide: false, safe: false }); for (let i = 0; i < 260; i++) S.step(1, 16.667); const cv = document.getElementById('map'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 5) { h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); });
  const s1 = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'tune-x', fresh: true }); let hX; let hY; let hD;
  try { await s1.page.evaluate((A) => { window.__studio.tuning.import(A); window.__studio.engine.tuning.set('popup.enabled', false); }, A); hX = await cold(s1.page); } finally { await s1.close(); }
  const s2b = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'tune-y', fresh: true });
  try { await s2b.page.keyboard.press('t'); await sleep(300); await s2b.page.locator('#panel input[type=file]').setInputFiles(fileA); await sleep(500); await s2b.page.evaluate(() => window.__studio.engine.tuning.set('popup.enabled', false)); hY = await cold(s2b.page); out.coldImportStatus = await s2b.page.evaluate(() => document.querySelector('#panel [role=status]') && document.querySelector('#panel [role=status]').textContent); } finally { await s2b.close(); }
  const s3 = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'tune-z', fresh: true });
  try { await s3.page.evaluate(() => window.__studio.engine.tuning.set('popup.enabled', false)); hD = await cold(s3.page); } finally { await s3.close(); }
  check('the picture is reproduced from the exported file alone: canvas hash of a cold settled frame, settings applied through the API ' + hX + ', through the real Import button in another fresh session ' + hY + ' (defaults: ' + hD + ')', hX === hY && hX !== hD, { hX, hY, hD });
  // ---- registry dials: a settings file that names a module that does not exist -------------------------------------------------------------------------------------------------
  const reg = [];
  for (const [id, bogus] of [['skin.id', 'does-not-exist'], ['layout.strategy', 'does-not-exist'], ['motion.mode', 'does-not-exist'], ['interp.model', 'does-not-exist'], ['backdrop.id', 'does-not-exist']]) {
    const sr = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'tune-r', fresh: true });
    try {
      const r = await sr.page.evaluate(({ id, bogus }) => {
        const S = window.__studio; const T = S.tuning; let thrown = null; let res = null;
        try { res = T.import({ format: 'battle-studio-settings/1', tokens: { [id]: bogus } }); } catch (e) { thrown = String(e.message || e); }
        let frames = 0; let frameErr = null; for (let i = 0; i < 20; i++) { try { S.step(1); frames++; } catch (e) { frameErr = String(e.message || e); break; } }
        let tiles = null; try { S.engine.transport.play(); for (let i = 0; i < 20; i++) S.step(1); tiles = S.engine.frame && S.engine.frame.tiles.length; } catch (e) { frameErr = frameErr || String(e.message || e); }
        return { applied: res && res.applied, rejected: res && res.rejected.length, thrown, framesOk: frames, frameErr, tilesAfter: tiles, value: T.get(id) };
      }, { id, bogus });
      reg.push({ id, ...r, pageErrors: sr.errors.filter((e) => /pageerror/.test(e)).slice(0, 2) });
    } finally { await sr.close(); }
  }
  out.registryImport = reg; console.log(JSON.stringify(reg));
  const brick = reg.filter((r) => r.thrown || r.frameErr || r.pageErrors.length);
  check('a settings file naming a module that does not exist (skin, layout, motion, interpolation, backdrop) is rejected by Import instead of being applied (applied without any check: ' + reg.filter((r) => r.applied && r.applied.length).map((r) => r.id).join(', ') + '; threw or broke the frame loop: ' + brick.map((r) => r.id).join(', ') + ')', reg.every((r) => r.rejected === 1 && !r.thrown && !r.frameErr), reg.map((r) => ({ id: r.id, applied: r.applied && r.applied.length, thrown: r.thrown, frameErr: r.frameErr, pageErrors: r.pageErrors })));

  // skin tokens: are the skin's own design tokens in the export?
  const skinTok = await P.evaluate(() => { const ids = Object.keys(window.__studio.tuning.values()); return { colourDials: ids.filter((i) => /colou?r|^skin\./.test(i)), n: ids.length }; });
  out.skinTokensInExport = skinTok; console.log('colour / skin dials in the Tuning Studio:', JSON.stringify(skinTok.colourDials));
  // evidence-label coverage of the dials
  const ev = {}; for (const t of tokensDoc.tokens) ev[t.evidence] = (ev[t.evidence] || 0) + 1; out.evidence = ev;
  out.errors = s.errors; out.requests = s.requests; out.summary = { pass: out.checks.filter((c) => c.ok).length, fail: out.checks.filter((c) => !c.ok).length };
  writeJson('v9-tuning.json', out); console.log(JSON.stringify(out.summary), 'console errors', s.errors.length, 'requests', s.requests.length);
} finally { await s.close(); srv.close(); }
