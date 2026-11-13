// Read-only reader of the site's own tour-stop and monument data, and the writer of the theatre's copies (app/data/site-memorials.json, app/data/site-tour-stops.json).
// The site keeps the 16 tour stops (d2) and the 512 monuments (_A) as literals inside its entry bundle (<tree>/assets/index-*.js) and a second, nine-row list of
// state memorials in <tree>/data/monuments.json. Nothing under baseline/, legacy/, release/ or data-src/ is ever written here.
//   node docs/battle-theatre/app/tests/ext-site-source.mjs            report: every site tree found, its hashes, whether the copies are current
//   node docs/battle-theatre/app/tests/ext-site-source.mjs --check    exit 1 when a copy differs from the site's data in any tree (drift)
//   node docs/battle-theatre/app/tests/ext-site-source.mjs --write    rewrite the copies from the primary tree (refused when the trees disagree or a pin differs)
// What is copied: the fields a mark, a list row and a camera bookmark need. What is not: the walkthrough's narration, video links, street-level image ids and any key.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url'; import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, '../../../..');
export const DATA = path.resolve(here, '../data');
export const FILES = { memorials: path.join(DATA, 'site-memorials.json'), tour: path.join(DATA, 'site-tour-stops.json') };
export const PRIMARY = 'baseline/dist';                       // tracked in the repository; the release trees are build output and are compared when they are there
export const GUARD = 'tests/t0/walkthrough-guard.spec.mjs';   // the site's own guard pins the canonical hashes of both datasets
export const STAR_PINS = ['data-src/legacy-manifest.tsv', 'data-src/build/data-manifest.json'];

export const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
// canonical JSON: object keys sorted, arrays in order (the form the site's guard hashes)
export const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));

// ---- the site trees in this checkout that carry an entry bundle
export function siteTrees() {
  const out = [], add = t => { const a = path.join(REPO, t, 'assets'); if (fs.existsSync(a) && fs.readdirSync(a).some(f => /^index-.*\.js$/.test(f))) out.push(t); };
  add('baseline/dist'); add('legacy/dist');
  const rel = path.join(REPO, 'release'); if (fs.existsSync(rel)) for (const d of fs.readdirSync(rel).sort()) add(`release/${d}/dist`);
  return out;
}
function entryOf(tree) {
  const dist = path.join(REPO, tree), vf = path.join(dist, 'version.json');
  if (fs.existsSync(vf)) { try { const v = JSON.parse(fs.readFileSync(vf, 'utf8')); if (v.entry && fs.existsSync(path.join(dist, 'assets', v.entry))) return path.join(dist, 'assets', v.entry); } catch { /* fall through to the largest bundle */ } }
  const a = path.join(dist, 'assets'); const f = fs.readdirSync(a).filter(x => /^index-.*\.js$/.test(x)).sort((x, y) => fs.statSync(path.join(a, y)).size - fs.statSync(path.join(a, x)).size)[0];
  return path.join(a, f);
}
// a literal of the bundle, found with the parser (never by a regular expression over the data)
function literal(src, marker) {
  const acorn = createRequire(path.join(REPO, 'package.json'))('acorn');
  const at = src.indexOf(marker); if (at < 0) return null; const start = at + marker.indexOf('[');
  let n = acorn.parseExpressionAt(src, start, { ecmaVersion: 'latest' }); if (n.type === 'SequenceExpression') n = n.expressions[0];
  return new Function(`return (${src.slice(n.start, n.end)})`)();
}
export const MARKERS = { tour: 'd2=[{id:1,name:"McPherson Ridge"', monuments: '_A=[{no:1,name:"Alabama State Monument"' };
export function readTree(tree) {
  const entry = entryOf(tree), buf = fs.readFileSync(entry), src = buf.toString('utf8');
  const tour = literal(src, MARKERS.tour), monuments = literal(src, MARKERS.monuments);
  const starFile = path.join(REPO, tree, 'data/monuments.json'), starBuf = fs.existsSync(starFile) ? fs.readFileSync(starFile) : null;
  return { tree, entry: path.posix.join('assets', path.basename(entry)), entrySha256: sha256(buf), tour, monuments, tourSha256: tour ? sha256(canon(tour)) : null, monumentsSha256: monuments ? sha256(canon(monuments)) : null,
    stars: starBuf ? JSON.parse(starBuf.toString('utf8')) : null, starsSha256: starBuf ? sha256(starBuf) : null };
}
// ---- the pins other parts of the repository already hold for the same data
export function pins() {
  const g = fs.readFileSync(path.join(REPO, GUARD), 'utf8');
  const tour = (/tourSha256:\s*'([0-9a-f]{64})'/.exec(g) || [])[1] || null, monuments = (/monsSha256:\s*'([0-9a-f]{64})'/.exec(g) || [])[1] || null;
  const tsv = fs.readFileSync(path.join(REPO, STAR_PINS[0]), 'utf8'); const row = tsv.split(/\r?\n/).map(l => l.split('\t')).find(c => c[0] === 'monuments.json');
  let manifest = null; try { manifest = JSON.parse(fs.readFileSync(path.join(REPO, STAR_PINS[1]), 'utf8')).files.monuments.sha256; } catch { /* reported as null */ }
  return { tour, monuments, stars: row ? row[2] : null, starsManifest: manifest };
}

// ---- the projection: which fields of the site's records the theatre keeps (everything else is left in the site)
export const KEPT = {
  monuments: ['no', 'name', 'honors', 'loc', 'lat', 'lon', 'mn', 'side', 'group', 'src'],
  tour: ['id', 'name', 'label', 'day', 'dayClass', 'lat', 'lng', 'sv.lat', 'sv.lng', 'sv.heading'],
  stars: ['id', 'name', 'side', 'lat', 'lng', 'source'],
};
export const NOT_KEPT = { tour: ['the walkthrough narration of a stop', 'the video link of a stop', 'the street-level image id of a stop'], stars: ['the note at the head of the file'] };
const need = (o, k, where) => { if (!(k in o)) throw new Error(`${where}: field ${k} is missing in the site's record`); return o[k]; };
export function projectMonuments(mons) {
  return mons.map((m, i) => { const w = `monument row ${i + 1}`; for (const k of Object.keys(m)) if (!KEPT.monuments.includes(k)) throw new Error(`${w}: the site's record has a field this copy does not know: ${k}`);
    return { no: need(m, 'no', w), name: need(m, 'name', w), honors: need(m, 'honors', w), loc: need(m, 'loc', w), lat: need(m, 'lat', w), lng: need(m, 'lon', w), mn: need(m, 'mn', w), side: need(m, 'side', w), group: need(m, 'group', w), src: need(m, 'src', w) }; });
}
export function projectTour(tour) {
  return tour.map((s, i) => { const w = `tour stop row ${i + 1}`;
    return { id: need(s, 'id', w), name: need(s, 'name', w), label: need(s, 'label', w), day: need(s, 'day', w), dayClass: need(s, 'dayClass', w), lat: need(s, 'lat', w), lng: need(s, 'lng', w),
      view: s.sv ? { lat: need(s.sv, 'lat', w), lng: need(s.sv, 'lng', w), heading: need(s.sv, 'heading', w) } : null }; });
}
export function projectStars(stars) {
  return stars.monuments.map((s, i) => { const w = `state memorial row ${i + 1}`; return { id: need(s, 'id', w), name: need(s, 'name', w), side: need(s, 'side', w), lat: need(s, 'lat', w), lng: need(s, 'lng', w), source: need(s, 'source', w) }; });
}

// ---- the two files of the theatre
export function buildCopies(src, also = []) {
  const P = pins(), monuments = projectMonuments(src.monuments), tour = projectTour(src.tour), stars = projectStars(src.stars);
  const from = { tree: src.tree, entry: src.entry, entrySha256: src.entrySha256, sameDataIn: also };
  const memorials = {
    _about: 'The monuments, memorials, markers and tablets of the site\'s Monuments section, as the site lists them. They are later memorials: none is part of the 1863 scene. Positions, names and texts are the site\'s; nothing is corrected here.',
    source: { ...from, monuments: { literal: '_A', count: src.monuments.length, canonSha256: src.monumentsSha256, guardPin: P.monuments }, stars: { file: 'data/monuments.json', count: src.stars.monuments.length, sha256: src.starsSha256, pin: P.stars } },
    kept: { monuments: KEPT.monuments.map(k => (k === 'lon' ? 'lng' : k)), stars: KEPT.stars }, notKept: { stars: NOT_KEPT.stars }, renamed: { lon: 'lng' },
    copy: { monumentsSha256: sha256(canon(monuments)), starsSha256: sha256(canon(stars)) },
    monuments, stars,
  };
  const tourFile = {
    _about: 'The 16 stops of the site\'s Virtual Walkthrough, as camera positions. They are stops of a modern tour, not 1863 features.',
    source: { ...from, tour: { literal: 'd2', count: src.tour.length, canonSha256: src.tourSha256, guardPin: P.tour } },
    kept: { tour: KEPT.tour.map(k => k.replace(/^sv\./, 'view.')) }, notKept: { tour: NOT_KEPT.tour }, renamed: { sv: 'view' },
    copy: { tourSha256: sha256(canon(tour)) },
    tour,
  };
  return { memorials, tour: tourFile };
}
export const serialise = o => JSON.stringify(o) + '\n';

// ---- drift: every way a copy can differ from the site's data. Returns a list of sentences; empty means current.
export function drift(trees = siteTrees(), files = FILES, P = pins()) {        // files and pins can be handed in (the tests do, to show that a changed copy or a changed pin is noticed)
  const out = []; let mem = null, tour = null;
  try { mem = JSON.parse(fs.readFileSync(files.memorials, 'utf8')); } catch (e) { out.push(`app/data/site-memorials.json cannot be read: ${e.message}`); }
  try { tour = JSON.parse(fs.readFileSync(files.tour, 'utf8')); } catch (e) { out.push(`app/data/site-tour-stops.json cannot be read: ${e.message}`); }
  if (!trees.length) out.push('no site tree with an entry bundle was found (baseline/dist is expected in every checkout)');
  if (!trees.includes(PRIMARY)) out.push(`the primary site tree ${PRIMARY} is not in this checkout`);
  for (const t of trees) {
    let s; try { s = readTree(t); } catch (e) { out.push(`${t}: the site's data could not be read: ${e.message}`); continue; }
    if (!s.monuments) { out.push(`${t}: the monument literal was not found in ${s.entry}`); continue; }
    if (!s.tour) { out.push(`${t}: the tour-stop literal was not found in ${s.entry}`); continue; }
    if (s.monumentsSha256 !== P.monuments) out.push(`${t}: the site's 512-monument data hashes to ${s.monumentsSha256.slice(0, 12)}, the guard pins ${String(P.monuments).slice(0, 12)}`);
    if (s.tourSha256 !== P.tour) out.push(`${t}: the site's tour-stop data hashes to ${s.tourSha256.slice(0, 12)}, the guard pins ${String(P.tour).slice(0, 12)}`);
    if (!s.stars) out.push(`${t}: data/monuments.json is missing`); else if (s.starsSha256 !== P.stars) out.push(`${t}: data/monuments.json hashes to ${s.starsSha256.slice(0, 12)}, the data manifest pins ${String(P.stars).slice(0, 12)}`);
    if (mem) {
      if (mem.source.monuments.canonSha256 !== s.monumentsSha256) out.push(`${t}: the copy records the monument hash ${mem.source.monuments.canonSha256.slice(0, 12)}, the site has ${s.monumentsSha256.slice(0, 12)}`);
      try { if (canon(projectMonuments(s.monuments)) !== canon(mem.monuments)) out.push(`${t}: the copied monuments differ from the site's (a record or a field changed)`); } catch (e) { out.push(`${t}: ${e.message}`); }
      if (s.stars) { if (mem.source.stars.sha256 !== s.starsSha256) out.push(`${t}: the copy records the state-memorial file hash ${mem.source.stars.sha256.slice(0, 12)}, the site has ${s.starsSha256.slice(0, 12)}`); if (canon(projectStars(s.stars)) !== canon(mem.stars)) out.push(`${t}: the copied state memorials differ from the site's`); }
    }
    if (tour) {
      if (tour.source.tour.canonSha256 !== s.tourSha256) out.push(`${t}: the copy records the tour-stop hash ${tour.source.tour.canonSha256.slice(0, 12)}, the site has ${s.tourSha256.slice(0, 12)}`);
      try { if (canon(projectTour(s.tour)) !== canon(tour.tour)) out.push(`${t}: the copied tour stops differ from the site's (a record or a field changed)`); } catch (e) { out.push(`${t}: ${e.message}`); }
    }
  }
  if (mem) { if (mem.copy.monumentsSha256 !== sha256(canon(mem.monuments))) out.push('site-memorials.json: the monuments in the file do not match the hash the file records for them'); if (mem.copy.starsSha256 !== sha256(canon(mem.stars))) out.push('site-memorials.json: the state memorials in the file do not match the hash the file records for them');
    if (mem.source.monuments.guardPin !== P.monuments) out.push('site-memorials.json: the recorded guard pin is not the guard\'s'); if (mem.source.stars.pin !== P.stars || P.stars !== P.starsManifest) out.push('site-memorials.json: the recorded pin of data/monuments.json is not the data manifest\'s'); }
  if (tour) { if (tour.copy.tourSha256 !== sha256(canon(tour.tour))) out.push('site-tour-stops.json: the stops in the file do not match the hash the file records for them'); if (tour.source.tour.guardPin !== P.tour) out.push('site-tour-stops.json: the recorded guard pin is not the guard\'s'); }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const trees = siteTrees(), read = trees.map(readTree), P = pins();
  for (const s of read) console.log(`${s.tree.padEnd(22)} ${s.entry.padEnd(28)} tour ${s.tour ? s.tour.length : '-'} ${String(s.tourSha256).slice(0, 12)}  monuments ${s.monuments ? s.monuments.length : '-'} ${String(s.monumentsSha256).slice(0, 12)}  state memorials ${s.stars ? s.stars.monuments.length : '-'} ${String(s.starsSha256).slice(0, 12)}`);
  console.log(`pins: tour ${String(P.tour).slice(0, 12)}  monuments ${String(P.monuments).slice(0, 12)}  data/monuments.json ${String(P.stars).slice(0, 12)}`);
  if (process.argv.includes('--write')) {
    const src = read.find(s => s.tree === PRIMARY); if (!src) { console.error(`${PRIMARY} is not in this checkout; nothing written`); process.exit(2); }
    const bad = read.filter(s => s.tourSha256 !== src.tourSha256 || s.monumentsSha256 !== src.monumentsSha256 || s.starsSha256 !== src.starsSha256).map(s => s.tree);
    if (bad.length) { console.error(`the site trees disagree (${bad.join(', ')} differ from ${PRIMARY}); nothing written`); process.exit(2); }
    if (src.tourSha256 !== P.tour || src.monumentsSha256 !== P.monuments || src.starsSha256 !== P.stars) { console.error('the site\'s data differs from the pins of the guard or the data manifest; nothing written'); process.exit(2); }
    const c = buildCopies(src, read.filter(s => s.tree !== PRIMARY && fs.existsSync(path.join(REPO, s.tree)) && !s.tree.startsWith('release/')).map(s => s.tree));
    fs.writeFileSync(FILES.memorials, serialise(c.memorials)); fs.writeFileSync(FILES.tour, serialise(c.tour));
    console.log(`wrote ${path.relative(REPO, FILES.memorials)} (${fs.statSync(FILES.memorials).size} bytes) and ${path.relative(REPO, FILES.tour)} (${fs.statSync(FILES.tour).size} bytes)`);
  }
  const d = drift(trees); if (d.length) { console.log('DRIFT:'); for (const l of d) console.log('  ' + l); } else console.log(`the copies equal the site's data in ${trees.length} tree(s)`);
  if (process.argv.includes('--check') && d.length) process.exit(1);
}
