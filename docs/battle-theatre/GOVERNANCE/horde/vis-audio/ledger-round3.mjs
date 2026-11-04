// Round 3 ledger step (shard vis-audio, closes AUD-G11): adds the Commons US Army / Marine bugle calls that were fetched after the 2026-10-31 sources.json was written
// (and Fatigue / Church if the retry succeeded) to audio/pilot2/LEDGER2.csv, app/data/audio3d/sources.json, calls.json (exact-name matches only) and the catalogue is edited by hand.
// Idempotent. Run: node docs/battle-theatre/GOVERNANCE/horde/vis-audio/ledger-round3.mjs
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const BT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SRC = path.join(BT, 'app/data/audio3d/sources.json'), CALLS = path.join(BT, 'app/data/audio3d/calls.json'), CSV = path.join(BT, 'audio/pilot2/LEDGER2.csv');
const res = JSON.parse(fs.readFileSync(path.join(BT, '../../tmp/audio-research/dl_commons_result.json'), 'utf8'));
const P = 'https://commons.wikimedia.org/wiki/Commons:Copyright_tags/Public_domain';
// ledgerId, commons title, file on disk (relative to BT), Casey call name it matches EXACTLY by name (or null)
const items = [
  ['WC-DRILLCALL', 'DrillCall.mp3', 'audio/pilot2/signals/wc_DrillCall.mp3', 'Drill call'],
  ['WC-SCHOOLCALL', 'SchoolCall.mp3', 'audio/pilot2/signals/wc_SchoolCall.mp3', 'School call'],
  ['WC-FATIGUECALL', 'FatigueCall.mp3', 'audio/pilot2/signals/wc_FatigueCall.mp3', 'Fatigue call'],
  ['WC-CHURCHCALL', 'ChurchCall.mp3', 'audio/pilot2/signals/wc_ChurchCall.mp3', 'Church call'],
  ['WC-FIRSTCALL', 'FirstCall.mp3', 'audio/pilot2/signals/wc_FirstCall.mp3', null],      // not a name in Casey's 26 general calls
  ['WC-TOARMS', 'To Arms.ogg', 'audio/pilot2/signals/wc_To_Arms.ogg', null],             // not a name in Casey's lists
  ['WC-FIRECALL', 'Fire Call.ogg', 'audio/pilot2/signals/wc_Fire_Call.ogg', null],       // not a name in Casey's lists
  ['WC-DOUBLETIME', 'Double Time.ogg', 'audio/pilot2/signals/wc_Double_Time.ogg', null], // Casey: 'Double quick time' (call 8): a different name, identity NOT assumed
];
const src = JSON.parse(fs.readFileSync(SRC, 'utf8')), calls = JSON.parse(fs.readFileSync(CALLS, 'utf8'));
let csv = fs.readFileSync(CSV, 'utf8'); if (!csv.endsWith('\n')) csv += '\n';
const q = (s) => (/[",\n]/.test(s) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s));
const added = [], skipped = [];
for (const [id, title, file, callName] of items) {
  const abs = path.join(BT, file); if (!fs.existsSync(abs)) { skipped.push([id, 'file not on disk']); continue; }
  const r = res.find((x) => x.title === title); if (!r) { skipped.push([id, 'no Commons record']); continue; }
  const buf = fs.readFileSync(abs), sha256 = crypto.createHash('sha256').update(buf).digest('hex'), sha1 = crypto.createHash('sha1').update(buf).digest('hex');
  if (sha1 !== r.sha1_commons) { skipped.push([id, 'sha1 differs from Commons']); continue; }
  const artist = r.artist.replace(/(.+)\1/, '$1');
  const attribution = `${title.replace(/\.(mp3|ogg)$/, '')} by ${artist} (public domain), via Wikimedia Commons`;
  const caveats = `modern ${/Marine/.test(artist) ? 'US Marine Corps' : 'US Army'} call (Commons: Public domain; Commons Copyrighted=False, re-read 2026-11-04); notes and tempo may differ from any 1863 call; ` + (callName ? `matches Casey's call name '${callName}' only by name: identity with the 1863 notes is not verified` : 'the name is not in Casey 1862 or Hardee 1861 call lists as read, so no manual call is mapped to it');
  const row = { ledgerId: id, file, family: 'signals_bugle', weaponMatch: 'related', what: r.desc, sourceUrl: r.page, author: artist, licence: 'Public domain', licenceUrl: P, attribution, howRecorded: 'not stated by the Commons page', caveats, sha256, bytes: buf.length, measured: {}, retrieved: id === 'WC-FATIGUECALL' || id === 'WC-CHURCHCALL' ? '2026-11-04' : '2026-10-31', ledger: 'audio/pilot2/LEDGER2.csv', shippable: true, round: 3, commonsSha1: r.sha1_commons, commonsFileUrl: r.url };
  const i = src.sources.findIndex((s) => s.ledgerId === id); if (i >= 0) src.sources[i] = row; else src.sources.push(row);
  if (!csv.includes(sha256)) csv += [id, file, r.desc, r.page, artist, 'Public domain', P, attribution, caveats, buf.length, sha256, row.retrieved].map(q).join(',') + '\n';
  if (callName) { const c = calls.bugle.find((b) => b.name === callName); if (c && !c.recordings.includes(id)) { c.recordings.push(id); c.recording_note = 'modern call of the same name; identity of notes with the 1863 call not verified'; } }
  added.push(id);
}
const blk = src.blocked.find((b) => b.id === 'BL-COMMONS-RATE');
if (blk) { const left = items.filter(([id]) => !added.includes(id)).map(([id]) => id); if (!left.length) { blk.status = 'closed'; blk.reason = 'All eight were fetched (six on 2026-10-31 after the 429 pass ended, Fatigue and Church on 2026-11-04 at 60 s spacing); sha1 equals the Commons value; ledgered as WC-DRILLCALL, WC-SCHOOLCALL, WC-FATIGUECALL, WC-CHURCHCALL, WC-FIRSTCALL, WC-TOARMS, WC-FIRECALL, WC-DOUBLETIME.'; } else blk.reason += ` Round 3 (2026-11-04): still missing ${left.join(', ')}.`; }
src.generated = '2026-11-04'; src._doc = src._doc.replace(/Built from audio\/pilot\/LEDGER\.csv \(round 1\) and audio\/pilot2\/LEDGER2\.csv \(round 2\)\./, 'Built from audio/pilot/LEDGER.csv (round 1) and audio/pilot2/LEDGER2.csv (rounds 2 and 3).');
const crlf = (o) => JSON.stringify(o, null, 1).split('\n').join('\r\n'); fs.writeFileSync(SRC, crlf(src)); fs.writeFileSync(CALLS, crlf(calls)); fs.writeFileSync(CSV, csv);
console.log(JSON.stringify({ added, skipped, total: src.sources.length }));
