// v14-skin-routes.mjs - the popup registry, and the two routes by which a skin's own tokens (colours, motion) can be changed: the URL parameter skinset and the console object window.__skinKit.
// Neither is in the Tuning Studio panel or in its exported settings file.   -> results/v14-skin-routes.json
import { serve, launch, PROTO, writeJson } from './lib.mjs';
const srv = await serve(PROTO, 9733); const out = {};
let s = await launch({ port: 9733, query: 'welcome=0&manual=1', profile: 'reg' });
out.popups = await s.page.evaluate(() => window.__studio.kernel.popups.list().map((p) => p.id));
out.skinKit = await s.page.evaluate(() => (window.__skinKit ? Object.keys(window.__skinKit) : null));
await s.close();
s = await launch({ port: 9733, query: 'welcome=0&manual=1&skin=field-manual&skinset=' + encodeURIComponent(JSON.stringify({ 'field-manual': { 'color.union': '#ff00ff' } })), profile: 'reg2' });
out.skinsetColourUnion = await s.page.evaluate(() => { const k = window.__skinKit; const e = k && k.exportTokens ? k.exportTokens('field-manual') : null; return e && e['field-manual'] && e['field-manual']['color.union']; });
out.colourOrSkinKeysInTuningExport = await s.page.evaluate(() => Object.keys(window.__studio.tuning.export().tokens).filter((k) => /color|skinset/.test(k)));
await s.close(); srv.close(); console.log(JSON.stringify(out)); writeJson('v14-skin-routes.json', out);
