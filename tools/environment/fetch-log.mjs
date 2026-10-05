// Writes docs/facts/FETCH-LOG.md from the cache metadata (url, bytes, sha256, retrieved) of every source used: node tools/environment/fetch-log.mjs
import fs from 'node:fs';
import path from 'node:path';
const C = 'tmp/env-cache';
const metas = fs.readdirSync(C).filter((f) => f.endsWith('.meta.json')).map((f) => ({ name: f.replace(/\.meta\.json$/, ''), ...JSON.parse(fs.readFileSync(path.join(C, f), 'utf8')) }));
const row = (m) => `| \`${m.name}\` | ${m.url.replace(/\|/g, '%7C')} | ${m.status} | ${m.bytes} | \`${m.sha256.slice(0, 16)}\` | ${m.retrieved.slice(0, 10)} |`;
const groups = [
  ['Internet Archive: OCR text layers and scan metadata of the books quoted (djvu.xml, abbyy.gz, scandata.xml, page_numbers.json, item metadata)', (m) => /archive\.org\/(download|metadata)\//.test(m.url) && !/\/page\/n/.test(m.url) && !/_djvu\.txt$/.test(m.url) && !/advancedsearch/.test(m.url)],
  ['Internet Archive: page images read for the second extraction method (one request per page; not committed)', (m) => /\/page\/n\d+/.test(m.url)],
  ['Internet Archive: searches and plain-text copies used only to locate editions', (m) => /advancedsearch|_djvu\.txt$/.test(m.url)],
  ['USNO Astronomical Applications API (one request per day) and NASA/Espenak', (m) => /aa\.usno\.navy\.mil\/api|eclipse\.gsfc\.nasa\.gov\/phase/.test(m.url)],
  ['Weather: the 1885 article witnesses, the NCEI catalogue record, the MRCC station list, background pages, the Library of Congress negative finding', (m) => /civilwarrx|emergingcivilwar|ncei\.noaa|mrcc\.purdue|loc\.gov|gettysburgexperience|historynet|wikipedia/.test(m.url)],
  ['National Park Service pages (US Government works)', (m) => /nps\.gov/.test(m.url) && !/robots/.test(m.url)],
  ['robots.txt files read before any page of that host was fetched', (m) => /robots\.txt$/.test(m.url)],
];
const used = new Set();
let out = `# Fetch log (2026-10-04)\n\nEvery network read this work made, from the metadata the fetcher (tools/environment/fetch.mjs) wrote beside each cached file under tmp/env-cache/. User-Agent \`Gettysburg-QC/1.0 (read-only polite fetch; contact mlegere9789@gmail.com)\`; at most one request per second per host (and each host's robots.txt Crawl-delay where it set one: emergingcivilwar.com 10 s, loc.gov 5 s, mrcc.purdue.edu 30 s); robots.txt obeyed; no login, form or download flow was used; a 403 (headlines.ametsoc.org) was recorded and not retried or circumvented. The SHA-256 is truncated to 16 hex characters here; the full hashes of the quoted page images are in data-src/*/visual_readings.json and of the weather witnesses in weather_by_day.json. Cached copies are git-ignored and are re-fetched by the builders.\n\n`;
for (const [title, test] of groups) {
  const list = metas.filter((m) => !used.has(m.name) && test(m)).sort((a, b) => a.name.localeCompare(b.name));
  list.forEach((m) => used.add(m.name));
  out += `## ${title} (${list.length})\n\n| cache name | URL | HTTP | bytes | sha256 | date |\n|---|---|---|---|---|---|\n${list.map(row).join('\n')}\n\n`;
}
const rest = metas.filter((m) => !used.has(m.name));
if (rest.length) out += `## Other (${rest.length})\n\n| cache name | URL | HTTP | bytes | sha256 | date |\n|---|---|---|---|---|---|\n${rest.map(row).join('\n')}\n\n`;
out += `Blocked or not fetched on purpose: aa.usno.navy.mil robots.txt (404: no restrictions); headlines.ametsoc.org (HTTP 403, kept as the answer); mrcc.purdue.edu data-download flow (asks for a contact form: not used); the NCEI NERMS images (controlled access: never fetched); americanbattlefieldtrust.org and stonesentinels.com (link-out sources: not fetched); Busey and Martin, Krick, Nese and Harding (copyrighted books: not opened).\n`;
fs.mkdirSync('docs/facts', { recursive: true });
fs.writeFileSync('docs/facts/FETCH-LOG.md', out);
console.log('metas', metas.length, 'written', out.length);
