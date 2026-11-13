// Pure helpers of two added parts of the theatre: the marks of LATER MEMORIALS (ext/monuments.mjs) and the TOUR-STOP camera bookmarks (ext/tour.mjs).
// No DOM, no fetch, no clock: everything here runs under node as well as in the page, and the checks at the end are plain functions of the data.
//
// What the data is: the site's own Monuments list (512 monuments, memorials, markers and tablets) and the 16 stops of its Virtual Walkthrough, held read-only in
// data/site-memorials.json and data/site-tour-stops.json with the hashes of the site's own data recorded beside them.
// What the theatre does with it: nothing of it is ever part of the 1863 scene. A memorial is a flat mark over the picture, off until the viewer switches the layer on and
// labelled as a later memorial; a tour stop is a camera position. The year each memorial was put up is not in the site's data: every card says so (open gap).
import { perspective, lookAt, mul } from '../../../render/prototype/src/math.mjs';

// ---------------------------------------------------------------- the layer as a declaration (read by the gate hook below and by the module)
export const LAYER = Object.freeze({
  id: 'later-memorials',
  title: 'Later memorials (post-battle; not part of the 1863 scene)',
  defaultOn: false,            // off at every entry; nothing remembers it between visits
  inScene: false,              // never an object of the 1863 scene: a flat mark over the picture, or nothing
  tier: 'inferred',            // of what a mark says: the name and the place are the site's list as it stands (see TIER_BASIS)
  yearTier: 'open gap',        // the year each memorial was put up is not in the site's data
  gap: 'ws-world-EG-MON-01',   // the register entry proposed for that gap
  groundGap: 'ws-world-EG-MON-02',   // the register entry proposed for the places beyond the loaded ground
});
export const TOUR = Object.freeze({ id: 'tour-stops', title: 'Tour stops (camera positions)', tier: 'inferred', inScene: false });
export const COPY = Object.freeze({
  short: 'later memorial',
  what: 'A memorial of the battlefield park, as the site\'s Monuments section lists it. It was put up after the battle and is not part of the 1863 scene: the theatre shows it only as a flat mark over the picture, never as an object on the ground.',
  layer: 'These are later memorials: the monuments, memorials, markers and tablets of the site\'s Monuments section. Every one of them remembers the battle, its soldiers or a later event, so none can have stood here before the fighting it marks, and none is part of the 1863 scene. The marks are off until you switch them on; they are flat marks over the picture, never objects on the ground, at any time on the scrubber.',
  basis: 'That the memorials came later rests on what they are and on John B. Bachelder\'s guide to the field in its edition of 1889: when the first edition was compiled "no material changes had been made on the field", and in 1889 the position of each command was "being marked by monuments" along avenues built since (Gettysburg: What to See, and How to See It, 1889, pages 21 and 22).',
  year: 'The year each memorial was put up is not in the site\'s data. It is an open gap, so no memorial is ever shown as standing at a time on the scrubber.',
  position: 'Names, texts and positions are the site\'s list as it stands; nothing is corrected here.',
  tour: 'The 16 stops of the site\'s Virtual Walkthrough, its Tour Stop 1 to Tour Stop 16. They are stops of a modern tour and are used here only as places to put the camera: a stop is not an 1863 feature, and nothing is drawn for it but a labelled pin while you are there.',
  beyond: 'beyond the loaded ground',
});
// The passages the label rests on, for the notes and the tests (matched there against the library text when it is in the checkout).
export const BASIS = Object.freeze({
  source: 'Bachelder, John B. Gettysburg: What to See, and How to See It. Boston, 1889 (Internet Archive: gettysburgwhatt00bach), section "How to see the field properly".',
  library: 'BACH-WHATTOSEE-1889',
  quotes: Object.freeze([
    Object.freeze({ page: 21, text: 'with the multitude of monuments which dot the landscape' }),
    Object.freeze({ page: 22, text: 'no material changes had been made on the field' }),
    Object.freeze({ page: 22, text: 'the position of each command is being marked by monuments' }),
  ]),
});

// ---------------------------------------------------------------- small things
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtM = m => Math.round(m).toLocaleString('en-US');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// canonical JSON (object keys sorted): the form whose sha256 the data files record for their own contents
export const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));
/** sha256 (hex) of a string with the platform's own crypto; null where there is none (an address that is not a secure context). */
export async function sha256Hex(str) {
  const sub = globalThis.crypto && globalThis.crypto.subtle; if (!sub) return null;
  const b = new Uint8Array(await sub.digest('SHA-256', new TextEncoder().encode(str))); let s = ''; for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0'); return s;
}
/** Does a data file still hold what its own recorded hashes say? {checked, ok, bad: [names]}; checked is false where the page has no crypto. */
export async function selfCheck(file, parts) {
  const bad = []; let checked = true;
  for (const [key, hashKey] of parts) { const h = await sha256Hex(canon(file[key])); if (h == null) { checked = false; break; } if (!file.copy || h !== file.copy[hashKey]) bad.push(key); }
  return { checked, ok: checked && bad.length === 0, bad };
}

// ---------------------------------------------------------------- what kind of thing a list entry is
const KIND_WORDS = ['Monument', 'Memorial', 'Marker', 'Tablet', 'Statue', 'Flagpole', 'Shaft', 'Relief', 'Portrait', 'Urn'];
const KIND_RE = new RegExp('\\b(' + KIND_WORDS.join('|') + ')\\b', 'g');
/** The memorial words of a name, in order, lower case ("memorial flagpole", "marker"); null when the name has none (then the entry is not taken for a memorial without a look). */
export function memorialKind(name) { const w = []; for (const m of String(name ?? '').matchAll(KIND_RE)) { const k = m[1].toLowerCase(); if (!w.includes(k)) w.push(k); } return w.length ? w.join(' ') : null; }
export const SIDES = Object.freeze(['Union', 'Confederate', 'Other']);
// the nine state memorials the site also holds in a second list (data/monuments.json), matched to the Monuments list by name
export const STAR_MATCH = Object.freeze({ 'pa-state': 46, 'ny-state': 44, 'in-state': 43, 'soldiers-national': 511, 'va-state': 14, 'nc-state': 8, 'la-state': 6, 'al-state': 1, 'ga-state': 5 });
export const POSITION_CHOICES = Object.freeze([
  Object.freeze({ key: 'list', label: 'The Monuments list (all 512)' }),
  Object.freeze({ key: 'state-list', label: 'The second list, for the nine state memorials it holds' }),
]);
const metres = (lat1, lng1, lat2, lng2) => Math.hypot((lng2 - lng1) * 111320 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180), (lat2 - lat1) * 110574);
const keyWords = s => String(s).toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !['state', 'monument', 'memorial'].includes(w));

/** Everything that would make the memorial file unfit to draw from. An empty list means fit. */
export function validateMemorials(d) {
  const p = []; if (!d || !Array.isArray(d.monuments) || !Array.isArray(d.stars)) return ['the memorial file has no monuments or no second list'];
  const M = d.monuments, want = d.source && d.source.monuments ? d.source.monuments.count : null;
  if (want !== M.length) p.push(`the file holds ${M.length} memorials, its source record says ${want}`);
  const seen = new Set();
  M.forEach((m, i) => {
    const w = `memorial ${m && m.no != null ? m.no : 'row ' + (i + 1)}`;
    if (!m || !Number.isInteger(m.no) || m.no < 1) { p.push(`${w}: no list number`); return; } if (seen.has(m.no)) p.push(`${w}: number used twice`); seen.add(m.no);
    if (typeof m.name !== 'string' || !m.name.trim()) p.push(`${w}: no name`); else if (!memorialKind(m.name)) p.push(`${w}: "${m.name}" does not name a monument, memorial, marker, tablet or statue; it is not taken for a later memorial without a look`);
    if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng) || m.lat < 39.7 || m.lat > 39.92 || m.lng < -77.4 || m.lng > -77.08) p.push(`${w}: position ${m.lat}, ${m.lng} is not near Gettysburg`);
    if (!SIDES.includes(m.side)) p.push(`${w}: side "${m.side}" is not one of ${SIDES.join(', ')}`);
    for (const k of ['honors', 'loc', 'mn', 'group', 'src']) if (typeof m[k] !== 'string') p.push(`${w}: field ${k} is not text`);
  });
  const byNo = new Map(M.filter(m => m && Number.isInteger(m.no)).map(m => [m.no, m]));
  for (const s of d.stars) {
    const no = STAR_MATCH[s.id], m = byNo.get(no);
    if (!m) { p.push(`second list: ${s.id} (${s.name}) has no match in the Monuments list`); continue; }
    const dist = metres(s.lat, s.lng, m.lat, m.lng), a = keyWords(s.name), b = keyWords(m.name);
    if (!a.some(x => b.includes(x))) p.push(`second list: ${s.id} (${s.name}) is matched to ${m.no} (${m.name}), which shares no word with it`);
    if (dist > 40) p.push(`second list: ${s.id} (${s.name}) lies ${Math.round(dist)} m from ${m.no} (${m.name}); a match must be within 40 m`);
  }
  if (d.stars.length !== Object.keys(STAR_MATCH).length) p.push(`the second list holds ${d.stars.length} memorials, ${Object.keys(STAR_MATCH).length} are matched`);
  return p;
}
export function validateTour(d) {
  const p = []; if (!d || !Array.isArray(d.tour)) return ['the tour file has no stops'];
  const want = d.source && d.source.tour ? d.source.tour.count : null; if (want !== d.tour.length) p.push(`the file holds ${d.tour.length} stops, its source record says ${want}`);
  d.tour.forEach((s, i) => {
    const w = `tour stop ${s && s.id != null ? s.id : 'row ' + (i + 1)}`;
    if (!s || s.id !== i + 1) p.push(`${w}: the stops are not numbered 1 to ${d.tour.length} in order`);
    if (!s || typeof s.name !== 'string' || !s.name.trim() || typeof s.label !== 'string' || typeof s.day !== 'string') p.push(`${w}: name, label or day missing`);
    if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) p.push(`${w}: no position`);
    if (s && s.view != null && (!Number.isFinite(s.view.lat) || !Number.isFinite(s.view.lng) || !Number.isFinite(s.view.heading))) p.push(`${w}: the viewpoint is incomplete`);
  });
  return p;
}

// ---------------------------------------------------------------- places and the loaded ground (x east, z south, metres from the centre of the ground)
const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
/** Where a point is against the loaded ground: inside (the rule of geo.inside with no pad), or how far beyond which edge. */
export function against(T, x, z) {
  const hx = T.W / 2, hz = T.H / 2, inside = Math.abs(x) < hx && Math.abs(z) < hz;
  const ox = Math.max(0, Math.abs(x) - hx), oz = Math.max(0, Math.abs(z) - hz);
  let dir = null; if (!inside) { const ns = z <= -hz ? 'north' : z >= hz ? 'south' : '', ew = x <= -hx ? 'west' : x >= hx ? 'east' : ''; dir = ns && ew ? ns + '-' + ew : ns || ew; }
  return { inside, beyondM: inside ? 0 : Math.hypot(ox, oz), dir };
}
export const compass = (dx, dz) => DIRS[Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360) / 45) % 8];      // of a direction; 0 = north, clockwise

// ---------------------------------------------------------------- camera positions. A pose is {x, y, z, yaw, pitch, fov} as controls.flyTo takes it (fov in degrees).
const LIFT = 4;                                   // a mark stands this far above the ground, in metres
/** The shell's own view of a point (theatre.viewFor), turned so that the camera stands over the loaded ground where it can. */
export function poseAround(T, x, z, o = {}) {
  const g = T.h(x, z), dist = o.dist ?? 90, h = o.height ?? 30, hx = T.W / 2 - 20, hz = T.H / 2 - 20;
  let yaw = o.yaw ?? Math.PI * .75;                // the camera stands south-west of the point and looks north-east
  if (o.yaw == null) for (const y of [.75, .25, -.25, -.75]) { const cx = x - Math.sin(y * Math.PI) * dist, cz = z - Math.cos(y * Math.PI) * dist; if (Math.abs(cx) < hx && Math.abs(cz) < hz) { yaw = y * Math.PI; break; } }
  const cx = x - Math.sin(yaw) * dist, cz = z - Math.cos(yaw) * dist, cy = Math.max(T.h(cx, cz) + 3, g + h), dx = x - cx, dy = g + 3 - cy, dz = z - cz;
  return { x: cx, y: cy, z: cz, yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)), fov: 62 };
}
/** The shell's own view of a tour stop (theatre.flyToLngLat with a viewpoint): from the site's viewpoint, 30 m up, looking at the stop, or along the site's heading when the two are one place. */
export function poseFromViewpoint(T, x, z, vx, vz, headingDeg, height = 30) {
  const y = T.h(vx, vz) + height, dx = x - vx, dz = z - vz, d = Math.hypot(dx, dz);
  return { x: vx, y, z: vz, yaw: d > 25 ? Math.atan2(dx, dz) : Math.PI - headingDeg * Math.PI / 180, pitch: d > 25 ? Math.atan2(T.h(x, z) + 3 - y, d) : -.2, fov: 62 };
}
/** For a place beyond the loaded ground: the camera stands over the nearest loaded ground, a little back from the edge and well up, and looks toward the place. */
export function poseFromEdge(T, x, z, o = {}) {
  const inset = o.inset ?? 60, back = o.back ?? 220, up = o.height ?? 140, hx = T.W / 2 - inset, hz = T.H / 2 - inset;
  const ex = clamp(x, -hx, hx), ez = clamp(z, -hz, hz), d = Math.hypot(x - ex, z - ez) || 1, ux = (x - ex) / d, uz = (z - ez) / d;
  const cx = clamp(ex - ux * back, -hx, hx), cz = clamp(ez - uz * back, -hz, hz), cy = T.h(cx, cz) + up, dx = x - cx, dz = z - cz;
  return { x: cx, y: cy, z: cz, yaw: Math.atan2(dx, dz), pitch: Math.atan2(T.h(x, z) + LIFT - cy, Math.hypot(dx, dz)), fov: 55 };
}

// ---------------------------------------------------------------- the memorial index: every memorial with its place on (or beyond) the loaded ground
/** positions: 'list' (the Monuments list for all) or 'state-list' (the second list's position for the nine memorials it holds). */
export function buildIndex(d, T, o = {}) {
  const positions = o.positions === 'state-list' ? 'state-list' : 'list', M = d.monuments, n = M.length;
  const stars = new Map(); for (const s of d.stars) { const no = STAR_MATCH[s.id]; if (no != null) stars.set(no, s); }
  const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n), flag = new Uint8Array(n), items = new Array(n), byNo = new Map();
  const counts = { total: n, inside: 0, beyond: 0, side: { Union: 0, Confederate: 0, Other: 0 }, withSource: 0, withoutSource: 0, twoPositions: stars.size, groups: [] }, groups = new Map();
  for (let i = 0; i < n; i++) {
    const m = M[i], s = stars.get(m.no) || null, useAlt = !!s && positions === 'state-list', lat = useAlt ? s.lat : m.lat, lng = useAlt ? s.lng : m.lng;
    const [x, z] = T.xz(lng, lat), a = against(T, x, z), y = T.h(x, z);           // beyond the ground T.h answers with the height of the nearest loaded ground
    X[i] = x; Y[i] = y + LIFT; Z[i] = z; flag[i] = (a.inside ? 1 : 0) | (Math.max(0, SIDES.indexOf(m.side)) << 1);
    const it = { i, no: m.no, name: m.name, honors: m.honors, loc: m.loc, mn: m.mn, side: m.side, group: m.group, src: m.src, kind: memorialKind(m.name), lat, lng, x, z, y, inside: a.inside, beyondM: a.beyondM, dir: a.dir,
      second: s ? { id: s.id, name: s.name, lat: s.lat, lng: s.lng, source: s.source, apartM: metres(s.lat, s.lng, m.lat, m.lng), used: useAlt, listLat: m.lat, listLng: m.lng } : null,
      hay: [m.name, m.honors, m.loc, m.group, m.mn].join(' \n ').toLowerCase(), lbl: '', lblW: 0 };
    it.lbl = labelText(it); it.lblW = it.lbl.length * LABEL.charW + LABEL.pad;          // the name on the picture and its width, made once (the frame loop makes no strings)
    items[i] = it; byNo.set(m.no, it);
    if (a.inside) counts.inside++; else counts.beyond++; counts.side[m.side] = (counts.side[m.side] || 0) + 1; if (m.src) counts.withSource++; else counts.withoutSource++;
    groups.set(m.group, (groups.get(m.group) || 0) + 1);
  }
  counts.groups = [...groups].map(([name, k]) => ({ name, n: k })).sort((a, b) => a.name.localeCompare(b.name));
  return { n, items, byNo, X, Y, Z, flag, counts, positions };
}
/** The list of the panel: text (name, honors, location, group, number), side, group, and whether on the loaded ground ('on') or beyond it ('beyond'). List order is the site's. */
export function filterMemorials(index, f = {}) {
  const q = String(f.q || '').trim().toLowerCase(), side = f.side && f.side !== 'all' ? f.side : null, group = f.group && f.group !== 'all' ? f.group : null, where = f.where === 'on' || f.where === 'beyond' ? f.where : 'all';     // a value that is none of the three narrows nothing
  return index.items.filter(it => (!side || it.side === side) && (!group || it.group === group) && (where === 'all' || (where === 'on') === it.inside) && (!q || it.hay.includes(q)));
}
export const memorialPose = (T, it) => (it.inside ? poseAround(T, it.x, it.z, { dist: 90, height: 30 }) : poseFromEdge(T, it.x, it.z));
export const memorialSay = it => (it.inside ? `Flying to ${it.name}, a later memorial.` : `${it.name} is a later memorial ${fmtM(it.beyondM)} m beyond the ${it.dir} edge of the loaded ground. The camera goes to the edge and looks toward it.`);

// ---------------------------------------------------------------- which memorials are marked, and how (the one rule the drawing and the gate hook share)
/** state: {on, selected} (selected: a list number or -1). With the layer off nothing is marked but the one memorial the viewer picked from the list. */
export const isMarked = (it, state) => !!state && (state.on === true || (state.selected != null && state.selected === it.no));
const markLabel = it => `${it.name} · ${COPY.short}${it.inside ? '' : ` · ${fmtM(it.beyondM)} m ${COPY.beyond}`}`;
export function marksFor(index, state) {
  const out = []; for (const it of index.items) if (isMarked(it, state)) out.push({ no: it.no, label: markLabel(it), tier: LAYER.tier, postBattle: true, scene: false, onGround: it.inside });
  return out;
}
/** What the memorial layer adds to the 1863 scene at a time: nothing, at any time. (Gate Q03: no modern object appears in the scene.) */
export const sceneObjectsAt = () => [];

// ---------------------------------------------------------------- screen layout of the marks (no allocation per frame)
const vV = new Float32Array(16), vP = new Float32Array(16), eye = [0, 0, 0], ctr = [0, 0, 0], UP = [0, 1, 0];
/** The view-projection of a camera as the renderer builds it later in the same frame (camera.mjs update): fresh, so the marks never lag the picture. */
export function viewProj(cam, aspect, out) {
  const cp = Math.cos(cam.pitch); eye[0] = cam.x; eye[1] = cam.y; eye[2] = cam.z; ctr[0] = cam.x + Math.sin(cam.yaw) * cp; ctr[1] = cam.y + Math.sin(cam.pitch); ctr[2] = cam.z + Math.cos(cam.yaw) * cp;
  lookAt(eye, ctr, UP, vV); perspective(cam.fov, aspect, cam.near, cam.far, vP); return mul(vP, vV, out);
}
/** world -> css pixels; false when behind the camera (out: [x, y, w]). The same arithmetic as the shell's overlay. */
export function project(m, x, y, z, w, h, out) {
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw <= 0.05) return false; out[0] = (cx / cw * .5 + .5) * w; out[1] = (1 - (cy / cw * .5 + .5)) * h; out[2] = cw; return true;
}
export const LABEL = Object.freeze({ max: 12, range: 420, charW: 6.3, pad: 22, h: 18, cap: 46 });
export const labelText = it => (it.name.length > LABEL.cap ? it.name.slice(0, LABEL.cap - 2) + '…' : it.name) + ' · ' + COPY.short;
const CAND = 64;
export function newLayout(n) { return { n: 0, idx: new Uint16Array(n), sx: new Float32Array(n), sy: new Float32Array(n), r: new Float32Array(n), nLabels: 0, lab: new Int16Array(LABEL.max + 1), cd: new Float32Array(CAND), ci: new Int16Array(CAND), p: [0, 0, 0] }; }
/** Fills L with the marks in view: their screen places and sizes (nearer is larger), and which of them get a name (the nearest that do not sit on one another). */
export function layoutMarks(index, vp, cam, w, h, state, L) {
  const { X, Y, Z, items, n } = index, p = L.p; let k = 0, nc = 0; const selNo = state && state.selected != null ? state.selected : -1; let selK = -1;
  if (state && (state.on === true || selNo >= 0)) for (let i = 0; i < n; i++) {
    const it = items[i]; if (!(state.on === true || it.no === selNo)) continue;
    if (!project(vp, X[i], Y[i], Z[i], w, h, p)) continue; if (p[0] < -30 || p[0] > w + 30 || p[1] < -30 || p[1] > h + 30) continue;
    const d = Math.hypot(X[i] - cam.x, Y[i] - cam.y, Z[i] - cam.z);
    L.idx[k] = i; L.sx[k] = p[0]; L.sy[k] = p[1]; L.r[k] = d < 260 ? 7 : d < 900 ? 5.5 : d < 2600 ? 4 : 3;
    if (it.no === selNo) selK = k;
    else if (d < LABEL.range && (nc < CAND || d < L.cd[CAND - 1])) {                 // the CAND nearest, nearest first
      let j = nc < CAND ? nc++ : CAND - 1; while (j > 0 && L.cd[j - 1] > d) { L.cd[j] = L.cd[j - 1]; L.ci[j] = L.ci[j - 1]; j--; } L.cd[j] = d; L.ci[j] = k;
    }
    k++;
  }
  L.n = k; let nl = 0; if (selK >= 0) L.lab[nl++] = selK;
  for (let c = 0; c < nc && nl < LABEL.max + (selK >= 0 ? 1 : 0); c++) {
    const a = L.ci[c], ax = L.sx[a] + 9, ay = L.sy[a] - 16, aw = items[L.idx[a]].lblW; let free = ax + aw < w + 40 && ay > -4;
    for (let q = 0; q < nl && free; q++) { const b = L.lab[q], bx = L.sx[b] + 9, by = L.sy[b] - 16, bw = items[L.idx[b]].lblW; if (ax < bx + bw && bx < ax + aw && Math.abs(ay - by) < LABEL.h + 2) free = false; }
    if (free) L.lab[nl++] = a;
  }
  L.nLabels = nl; return L;
}
/** The mark under a point of the screen (css pixels), or -1: the nearest within reach px. Returns a list number. */
export function pickMark(index, L, px, py, reach = 14) {
  let best = -1, bd = reach; for (let k = 0; k < L.n; k++) { const d = Math.hypot(L.sx[k] - px, L.sy[k] - py - L.r[k] * .3); if (d < bd) { bd = d; best = index.items[L.idx[k]].no; } }
  return best;
}

// ---------------------------------------------------------------- drawing (a 2D canvas context; nothing else)
export const SIDE_COLOR = Object.freeze({ Union: '#6fb0ee', Confederate: '#cdb994', Other: '#c3c4d0' });
const GLYPH = {
  circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); },
  diamond(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); },
  triangle(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * .95, y + r * .8); c.lineTo(x - r * .95, y + r * .8); c.closePath(); },
  square(c, x, y, r) { c.beginPath(); c.rect(x - r * .8, y - r * .8, r * 1.6, r * 1.6); },
};
// the shape of a memorial mark: a small standing stone. It is none of the four tier shapes, so a memorial is never mistaken for a unit or a structure.
function stone(c, x, y, r) { c.moveTo(x, y - r * 1.55); c.lineTo(x + r * .42, y - r * .95); c.lineTo(x + r * .62, y + r * .9); c.lineTo(x - r * .62, y + r * .9); c.lineTo(x - r * .42, y - r * .95); c.closePath(); }
/** Draws the marks of a layout and returns how many. tier: {color, dash, glyph} of the layer's tier (ctx.tierMark.style). The tier shows as the dashed outline in the tier's
 *  colour on every mark and as the tier's own shape beside every name, so it never depends on colour alone. The fill says the side the site's list gives; a memorial beyond
 *  the loaded ground is drawn hollow. One path per fill and one for all outlines: a few canvas calls however many marks are in view. */
export function drawMarks(c, index, L, state, tier) {
  const items = index.items, flag = index.flag, n = L.n, selNo = state && state.selected != null ? state.selected : -1, dashed = !!(tier.dash && tier.dash.length);
  for (let g = 0; g < 4; g++) {                                   // 0..2: on the loaded ground, by side; 3: beyond it
    let any = false; c.beginPath();
    for (let k = 0; k < n; k++) { const f = flag[L.idx[k]]; if (((f & 1) ? (f >> 1) : 3) !== g) continue; stone(c, L.sx[k], L.sy[k], L.r[k]); any = true; }
    if (any) { c.fillStyle = g < 3 ? SIDE_COLOR[SIDES[g]] + 'b8' : 'rgba(14,14,25,.5)'; c.fill(); }
  }
  if (n) { c.beginPath(); for (let k = 0; k < n; k++) stone(c, L.sx[k], L.sy[k], L.r[k]); c.lineWidth = 1.3; c.strokeStyle = tier.color; c.setLineDash(dashed ? [3, 2] : []); c.stroke(); c.setLineDash([]); }
  c.textBaseline = 'alphabetic';
  for (let q = L.nLabels - 1; q >= 0; q--) {                      // the picked memorial last, on top
    const k = L.lab[q], it = items[L.idx[k]], sel = it.no === selNo, txt = sel ? (it.selLbl || (it.selLbl = markLabel(it))) : it.lbl, x = L.sx[k] + 9, y = L.sy[k] - 16;
    c.font = sel ? '600 12.5px system-ui, sans-serif' : '11.5px system-ui, sans-serif';
    if (sel) { c.lineWidth = 2.2; c.strokeStyle = '#e8d5a3'; c.beginPath(); c.arc(L.sx[k], L.sy[k] - L.r[k] * .3, L.r[k] * 1.9 + 4, 0, 6.2832); c.stroke(); }
    const w = c.measureText(txt).width + LABEL.pad;
    c.fillStyle = sel ? 'rgba(14,14,25,.88)' : 'rgba(14,14,25,.78)'; c.fillRect(x, y - 13, w, LABEL.h);
    (GLYPH[tier.glyph] || GLYPH.square)(c, x + 8, y - 4, 4); c.fillStyle = tier.color + '55'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = tier.color; c.setLineDash(dashed ? [2, 1.5] : []); c.stroke(); c.setLineDash([]);
    c.fillStyle = sel ? '#e8d5a3' : '#ecebe6'; c.fillText(txt, x + 16, y);
  }
  return n;
}

// ---------------------------------------------------------------- the words of a memorial (card and list; pure HTML strings)
const deg = (v, pos, neg) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;
export const groundLine = it => (it.inside ? 'On the loaded ground' : `${fmtM(it.beyondM)} m beyond the ${it.dir} edge of the loaded ground. The ground there is not loaded, so the mark stands at the height of the nearest loaded ground.`);
/** The card of one memorial. tierMark: the shell's tier pill (ctx.tierMark). */
export function memorialCardHTML(it, tierMark) {
  const pos = it.second && it.second.used ? `${deg(it.lat, 'N', 'S')}, ${deg(it.lng, 'E', 'W')}<br><span class="mini">from the site's second list (${esc(it.second.source)})</span>` : `${deg(it.lat, 'N', 'S')}, ${deg(it.lng, 'E', 'W')}<br><span class="mini">from the site's Monuments list; ${it.src ? 'its note on the position: ' + esc(it.src) : 'the list states no source for it'}</span>`;
  const second = it.second ? `<tr><th>Second position</th><td>${it.second.used ? `The Monuments list puts it at ${deg(it.second.listLat, 'N', 'S')}, ${deg(it.second.listLng, 'E', 'W')}` : `The site's second list (${esc(it.second.name)}; ${esc(it.second.source)}) puts it at ${deg(it.second.lat, 'N', 'S')}, ${deg(it.second.lng, 'E', 'W')}`}, ${fmtM(it.second.apartM)} m away. Both are the site's; the panel lets you choose which the mark follows.</td></tr>` : '';
  return `<div class="card-head"><h2 id="xm-card-title">${esc(it.name)}</h2><button type="button" class="icon-btn" data-act="close" aria-label="Close the memorial card"><svg class="ic"><use href="#i-close"/></svg></button></div>
    <div class="card-body">
      <p class="ph"><b>Later memorial.</b> ${esc(COPY.what)}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${tierMark(LAYER.tier)}<span class="pill" data-xm="post-battle">Post-battle</span><span class="pill">${esc(it.side)}</span><span class="pill">No. ${it.no} of the list</span></div>
      <dl>
        <div class="row"><dt>Remembers</dt><dd>${esc(it.honors)}</dd></div>
        <div class="row"><dt>Where</dt><dd>${esc(it.loc)}</dd></div>
        <div class="row"><dt>Group</dt><dd>${esc(it.group)}</dd></div>
        <div class="row"><dt>Park number</dt><dd>${it.mn ? esc(it.mn) : 'none in the list'}</dd></div>
        <div class="row"><dt>Put up</dt><dd>${tierMark(LAYER.yearTier)}<br><span class="mini">The year is not in the site's data.</span></dd></div>
        <div class="row"><dt>Ground</dt><dd>${esc(groundLine(it))}</dd></div>
      </dl>
      <h3>Evidence</h3>
      <table class="table"><tr><th>Tier</th><td>${tierMark(LAYER.tier)} <span class="mini">of the name, the text and the position: the site's list as it stands. It says nothing about July 1863.</span></td></tr>
        <tr><th>Position</th><td>${pos}</td></tr>${second}
        <tr><th>After the battle</th><td><span class="mini">${esc(COPY.basis)}</span></td></tr>
        <tr><th>Open gap</th><td><span class="mini">${esc(COPY.year)} Gap ${esc(LAYER.gap)}${it.inside ? '' : '; the unloaded ground: ' + esc(LAYER.groundGap)}.</span></td></tr></table>
      <div class="actions"><button type="button" class="btn-s" data-act="fly"><svg class="ic"><use href="#i-focus"/></svg>Fly to</button></div>
    </div>`;
}
export function memorialRowsHTML(list, from, to, selected) {
  let h = ''; for (let i = from; i < Math.min(to, list.length); i++) { const it = list[i];
    h += `<li><button type="button" class="item" data-no="${it.no}"${it.no === selected ? ' aria-current="true"' : ''}><span class="glyph"><svg class="ic"><use href="#i-pin"/></svg></span><span class="when">${esc(it.side)}${it.mn ? ' · ' + esc(it.mn) : ''}${it.inside ? '' : ` · ${fmtM(it.beyondM)} m ${COPY.beyond} (${it.dir})`}</span><span class="what">${esc(it.name)}</span></button></li>`; }
  return h;
}
/** The notice that stays on the picture for as long as the layer is on (the two buttons are handled by the module: data-act "about" and "hide"). */
export function noticeHTML(counts, tm) {
  return `<span>${tm(LAYER.tier)}</span><span><b style="color:var(--text)">Later memorials shown</b></span><span>${counts.total} marks, ${counts.beyond} of them ${COPY.beyond}. Put up after the battle: not part of the 1863 scene.</span><span><button type="button" class="btn-s" data-act="about" style="min-height:28px">About them</button> <button type="button" class="btn-s" data-act="hide" style="min-height:28px">Hide</button></span>`;
}
/** The memorial panel above its list. o: {on, positions, integrity: {checked}, list: {q, side, group, where}}. The list itself is memorialRowsHTML under #xm-list. */
export function memorialPanelHTML(index, o, tm) {
  const c = index.counts, f = o.list, e = esc, two = index.items.filter(it => it.second), far = two.reduce((m, it) => Math.max(m, it.second.apartM), 0), near = two.reduce((m, it) => Math.min(m, it.second.apartM), Infinity);
  return `<p class="mini" style="margin-bottom:10px">${e(COPY.layer)}</p>
    <label class="check"><input type="checkbox" id="xm-on" ${o.on ? 'checked' : ''}> Show the marks of the later memorials</label>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 8px">${tm(LAYER.tier)}<span class="pill" data-xm="post-battle">Post-battle</span><span class="pill">${c.total} memorials</span><span class="pill">${c.inside} on the loaded ground</span><span class="pill">${c.beyond} beyond it</span></div>
    <p class="mini" id="xm-key" style="margin:0 0 10px;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center"><span><span aria-hidden="true" style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${SIDE_COLOR.Union};vertical-align:-1px"></span> Union</span><span><span aria-hidden="true" style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${SIDE_COLOR.Confederate};vertical-align:-1px"></span> Confederate</span><span><span aria-hidden="true" style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${SIDE_COLOR.Other};vertical-align:-1px"></span> Other</span><span><span aria-hidden="true" style="display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid ${SIDE_COLOR.Other}"></span> hollow: beyond the loaded ground</span><span>The dashed outline is the tier, inferred.</span></p>
    <details style="margin:0 0 10px"><summary class="mini" style="cursor:pointer">What this rests on, and what is not known</summary>
      <p class="mini" style="margin-top:8px">${e(COPY.basis)}</p>
      <p class="mini" style="margin-top:8px">${tm(LAYER.yearTier)} ${e(COPY.year)} Gap ${e(LAYER.gap)}.</p>
      <p class="mini" style="margin-top:8px">${e(COPY.position)} The list states no source for ${c.withoutSource} of the ${c.total} positions; for ${c.withSource} it names a web listing. A mark says where the list puts a memorial today and nothing about July 1863.</p>
      <p class="mini" style="margin-top:8px">${c.beyond} memorials lie beyond the loaded ground (6.2 by 6.1 km). They are listed and marked like the rest: the camera goes to the edge of the ground and looks toward them, and the mark stands at the height of the nearest loaded ground because the ground there is not loaded. Gap ${e(LAYER.groundGap)}.</p>
      ${o.integrity && o.integrity.checked ? '' : '<p class="mini" style="margin-top:8px">This address gives the page no way to check the list against the hash recorded with it; the check was left out.</p>'}</details>
    ${two.length ? `<h3>Where the site holds two positions</h3><p class="mini">${two.length} state memorials are also in a second list of the site, ${fmtM(near)} to ${fmtM(far)} m from where the Monuments list puts them. Both are carried; the marks open on the Monuments list, the list this layer copies.</p>
    <select class="field" id="xm-pos" aria-label="Which of the site's positions the nine state memorials follow" style="height:38px;margin-top:6px">${POSITION_CHOICES.map(p => `<option value="${p.key}" ${p.key === o.positions ? 'selected' : ''}>${e(p.label)}</option>`).join('')}</select>` : ''}
    <h3>Find a memorial</h3>
    <input class="field" type="search" id="xm-q" placeholder="Search ${c.total} later memorials" aria-label="Search later memorials" value="${e(f.q)}" data-autofocus>
    <div class="seg" id="xm-side" role="group" aria-label="Side">${['all', ...SIDES].map(k => `<button type="button" data-side="${k}" aria-pressed="${f.side === k}">${k === 'all' ? 'All' : k}</button>`).join('')}</div>
    <select class="field" id="xm-group" aria-label="Group of the list" style="height:38px;margin-top:6px"><option value="all">All groups</option>${c.groups.map(g => `<option value="${e(g.name)}" ${f.group === g.name ? 'selected' : ''}>${e(g.name)} (${g.n})</option>`).join('')}</select>
    <div class="seg" id="xm-where" role="group" aria-label="On or beyond the loaded ground">${[['all', 'Everywhere'], ['on', 'On the loaded ground'], ['beyond', 'Beyond it']].map(([k, t]) => `<button type="button" data-where="${k}" aria-pressed="${f.where === k}">${t}</button>`).join('')}</div>
    <p class="mini" id="xm-count" aria-live="polite" style="margin-top:8px"></p><ul class="list" id="xm-list"></ul>`;
}

// ---------------------------------------------------------------- the tour stops as camera bookmarks
/** All stops of the file, each with a camera position. kind: 'viewpoint' (the site's own viewpoint), 'place' (a view of the stop) or 'edge' (the stop lies beyond the loaded ground). */
export function tourBookmarks(d, T) {
  return d.tour.map(s => {
    const [x, z] = T.xz(s.lng, s.lat), a = against(T, x, z); let v = null, va = null; if (s.view) { v = T.xz(s.view.lng, s.view.lat); va = against(T, v[0], v[1]); }
    let kind, pose;
    if (!a.inside) { kind = 'edge'; pose = poseFromEdge(T, x, z); }
    else if (v && va.inside) { kind = 'viewpoint'; pose = poseFromViewpoint(T, x, z, v[0], v[1], s.view.heading, 30); }
    else { kind = 'place'; pose = poseAround(T, x, z, { dist: 140, height: 45 }); }
    return { id: s.id, name: s.name, label: s.label, day: s.day, lat: s.lat, lng: s.lng, x, z, y: T.h(x, z) + LIFT, inside: a.inside, beyondM: a.beyondM, dir: a.dir, kind, pose };
  });
}
export const tourSay = b => (b.inside ? `Flying to ${b.label}, ${b.name}.` : `${b.label}, ${b.name}, lies ${fmtM(b.beyondM)} m beyond the ${b.dir} edge of the loaded ground. The camera goes to the edge and looks toward it.`);
export const tourPinText = b => `${b.label} · ${b.name} · modern tour stop${b.inside ? '' : ` · ${fmtM(b.beyondM)} m ${COPY.beyond}`}`;
export function tourRowsHTML(B, active) {
  return B.map(b => `<li><button type="button" class="item" data-stop="${b.id}"${b.id === active ? ' aria-current="true"' : ''}><span class="glyph"><svg class="ic"><use href="#i-pin"/></svg></span><span class="when">${esc(b.label)} · ${esc(b.day)}${b.inside ? '' : ` · ${fmtM(b.beyondM)} m ${COPY.beyond} (${b.dir})`}</span><span class="what">${esc(b.name)}${b.inside ? '' : ' · view from the edge of the loaded ground'}</span></button></li>`).join('');
}
/** The tour panel: the words, the marks, the list of the 16 stops and the button that takes the pin away. */
export function tourPanelHTML(B, active, tm) {
  const e = esc, on = B.filter(b => b.inside).length, off = B.length - on;
  return `<p class="mini" style="margin-bottom:10px">${e(COPY.tour)}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px">${tm(TOUR.tier)}<span class="pill">Modern tour</span><span class="pill">${B.length} stops</span><span class="pill">${on} on the loaded ground</span><span class="pill">${off} beyond it</span></div>
    <details style="margin:0 0 6px"><summary class="mini" style="cursor:pointer">Where the camera goes</summary>
      <p class="mini" style="margin-top:8px">For a stop on the loaded ground the camera stands at the viewpoint the site's walkthrough uses for it, 30 m above the ground, and looks at the stop; where the two are one place it looks along the walkthrough's own heading.</p>
      <p class="mini" style="margin-top:8px">For a stop beyond the loaded ground (6.2 by 6.1 km) the camera stands over the edge of the ground, 140 m up, and looks toward the stop; the pin stands at the height of the nearest loaded ground because the ground there is not loaded. Gap ${e(LAYER.groundGap)}.</p>
      <p class="mini" style="margin-top:8px">The positions are the site's list as it stands; nothing is corrected here. The day beside a stop is the day the site gives it; choosing a stop moves the camera only, never the clock.</p></details>
    <ul class="list" id="xt-list">${tourRowsHTML(B, active)}</ul>
    <div class="actions" style="margin-top:12px"><button type="button" class="btn-s" id="xt-clear" ${active < 0 ? 'disabled' : ''}>Remove the pin</button></div>`;
}

// ---------------------------------------------------------------- checks for the gate runner (pure; listed in docs/GATE-HOOKS.md)
/** Gates Q03 and Q23 for the memorial layer. mem: data/site-memorials.json parsed. T: optional terrain ({W, H, h, xz}); with it the places are checked too.
 *  -> {ok, problems: [text], facts}. ok means: the data is fit; the layer is off by default; it puts nothing in the 1863 scene at any time; with it off nothing is marked;
 *  with it on every memorial is marked, each mark says "later memorial" and carries the layer's tier; no year is claimed for any. */
export function checkLaterMemorials(mem, T = null) {
  const problems = validateMemorials(mem); const n = mem && Array.isArray(mem.monuments) ? mem.monuments.length : 0;
  if (LAYER.defaultOn !== false) problems.push('the layer is not off by default'); if (LAYER.inScene !== false) problems.push('the layer is declared part of the scene');
  for (const t of [0, 46000, 47520, 49000, 60000, 246240]) if (sceneObjectsAt(t).length) problems.push(`the layer adds objects to the scene at minute ${t}`);
  const flat = { W: 1, H: 1, h: () => 0, xz: (lng, lat) => [lng, -lat] }; let idx = null;
  try { idx = n ? buildIndex(mem, T || flat) : null; } catch (e) { problems.push('the memorial index could not be built: ' + (e && e.message)); }
  let off = 0, on = 0, unlabelled = 0, untiered = 0, inScene = 0, withYear = 0;
  if (idx) {
    off = marksFor(idx, { on: false, selected: -1 }).length; const all = marksFor(idx, { on: true, selected: -1 }); on = all.length;
    for (const m of all) { if (!m.postBattle || !/later memorial/.test(m.label)) unlabelled++; if (m.tier !== LAYER.tier) untiered++; if (m.scene) inScene++; }
    for (const m of mem.monuments) if ('year' in m || 'dedicated' in m || 'erected' in m) withYear++;
    if (withYear) problems.push(`${withYear} memorials claim a year in the list; the year is an open gap and may be shown only from a documented source`);
    if (off) problems.push(`${off} memorials are marked while the layer is off`); if (on !== n) problems.push(`${on} of ${n} memorials are marked while the layer is on`);
    if (unlabelled) problems.push(`${unlabelled} marks do not say "later memorial"`); if (untiered) problems.push(`${untiered} marks do not carry the tier ${LAYER.tier}`); if (inScene) problems.push(`${inScene} marks are flagged as scene objects`);
    if (marksFor(idx, { on: false, selected: mem.monuments[0].no }).length !== 1) problems.push('picking one memorial with the layer off does not mark exactly that one');
  }
  return { ok: problems.length === 0, problems, facts: { memorials: n, defaultOn: LAYER.defaultOn, sceneObjects: 0, marksWhenOff: off, marksWhenOn: on, tier: LAYER.tier, withoutLabel: unlabelled, yearClaimed: withYear, yearOpenGap: n - withYear,
    onLoadedGround: T && idx ? idx.counts.inside : null, beyondLoadedGround: T && idx ? idx.counts.beyond : null, positionsWithNoStatedSource: idx ? idx.counts.withoutSource : null, twoPositions: idx ? idx.counts.twoPositions : null } };
}
/** The tour stops as bookmarks. tour: data/site-tour-stops.json parsed; T: the terrain. -> {ok, problems, facts}. ok means: every stop of the file has a camera position that stands
 *  over the loaded ground and looks toward the stop (or along the site's heading), and a stop beyond the ground is said to be beyond it. */
export function checkTourBookmarks(tour, T) {
  const problems = validateTour(tour); let B = [];
  try { B = tourBookmarks(tour, T); } catch (e) { problems.push('the bookmarks could not be built: ' + (e && e.message)); }
  const hx = T.W / 2, hz = T.H / 2; let edge = 0;
  for (const b of B) {
    const p = b.pose; if (![p.x, p.y, p.z, p.yaw, p.pitch, p.fov].every(Number.isFinite)) { problems.push(`${b.label}: the camera position is not a number`); continue; }
    if (Math.abs(p.x) >= hx || Math.abs(p.z) >= hz) problems.push(`${b.label}: the camera does not stand over the loaded ground`);
    if (p.y < T.h(p.x, p.z) + 1.7) problems.push(`${b.label}: the camera is in the ground`);
    if (b.kind === 'edge') { edge++; if (b.inside || !(b.beyondM > 0) || !/beyond the/.test(tourSay(b))) problems.push(`${b.label}: a stop beyond the loaded ground is not said to be beyond it`); const dx = b.x - p.x, dz = b.z - p.z, f = Math.sin(p.yaw) * dx + Math.cos(p.yaw) * dz; if (f / Math.hypot(dx, dz) < .999) problems.push(`${b.label}: the camera does not look toward the stop`); }
  }
  if (B.length !== (tour && tour.tour ? tour.tour.length : -1)) problems.push('not every stop has a bookmark');
  return { ok: problems.length === 0, problems, facts: { stops: B.length, onLoadedGround: B.filter(b => b.inside).length, beyondLoadedGround: edge, fromTheSitesViewpoint: B.filter(b => b.kind === 'viewpoint').length } };
}
