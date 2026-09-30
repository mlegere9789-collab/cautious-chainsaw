// Baseline expiry as an explicit, visible report (replaces the silent wall-clock time bomb).
//
// Every baseline entry carries an `expires` date: known violations are debt with a due date. What was wrong with the old design is that
// the date was only ever seen when it had passed: `data:check` turned red on the day after `expires` with no change in code or data.
// Now:
//   * the content verdict of tools/data/validate.mjs (new / stale / not-run / rule-state violations) does not depend on the wall clock;
//   * every run prints the expiry report: the next dates, the entries inside the warning window (EXPIRY_WARN_DAYS before the date) and the expired ones;
//   * the explicit gate `node tools/data/expiry.mjs` (CI) WARNS from EXPIRY_WARN_DAYS before an `expires` date and FAILS after it;
//   * renewing is a logged command (`validate.mjs --renew RULE --until DATE --reason "..."`), capped at MAX_RENEWAL_DAYS ahead of the clock.
// Nothing in this module reads the wall clock: the caller passes `now` (an ISO date).

export const EXPIRY_WARN_DAYS = 30;
export const MAX_RENEWAL_DAYS = 366;
const DAY_MS = 86_400_000;

/** Day number (days since 1970-01-01, UTC) of a strict, real calendar date "YYYY-MM-DD"; null for anything else (also 2027-02-30, "2027-1-5", 20270131). */
export function parseIsoDate(s) {
  if (typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
  return Math.round(t / DAY_MS);
}

/** ISO date `n` days after an ISO date (no clock involved). */
export function addDays(iso, n) {
  const d = parseIsoDate(iso);
  if (d === null) throw new Error(`not an ISO date: ${iso}`);
  return new Date((d + n) * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `now` to `expires` (negative once expired); null when either is not a valid ISO date. */
export function daysUntil(expires, now) {
  const e = parseIsoDate(expires), n = parseIsoDate(now);
  return e === null || n === null ? null : e - n;
}

/** ok | warning (0..warnDays days left, inclusive of the expiry date itself) | expired (the day AFTER `expires`) | invalid (no usable date). */
export function expiryStatus(expires, now, warnDays = EXPIRY_WARN_DAYS) {
  const left = daysUntil(expires, now);
  if (left === null) return 'invalid';
  if (left < 0) return 'expired';
  return left <= warnDays ? 'warning' : 'ok';
}

const entryCount = (b) => (typeof b?.count === 'number' ? b.count : (b?.keys?.length ?? 0));

/**
 * @param {object} baseline  tools/data/baseline.json
 * @param {{now:string, warnDays?:number}} o
 * @returns rows sorted by expiry (soonest first): { id, sev, expires, days_left, status, count }
 */
export function expiryReport(baseline, { now, warnDays = EXPIRY_WARN_DAYS }) {
  if (parseIsoDate(now) === null) throw new Error(`the clock must be an ISO date YYYY-MM-DD, got ${JSON.stringify(now)}`);
  const rows = Object.entries(baseline?.rules ?? {})
    .map(([id, b]) => ({ id, sev: b?.sev ?? '?', expires: b?.expires ?? null, days_left: daysUntil(b?.expires, now), status: expiryStatus(b?.expires, now, warnDays), count: entryCount(b) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => (a.days_left ?? -1e9) - (b.days_left ?? -1e9) || (a.id < b.id ? -1 : 1));
  const by = (s) => rows.filter((r) => r.status === s);
  const upcoming = rows.filter((r) => r.status === 'ok' || r.status === 'warning');
  return { now, warn_days: warnDays, rows, expired: by('expired'), warning: by('warning'), invalid: by('invalid'), next: upcoming[0] ?? null };
}

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Human-readable lines. `detail` prints every entry; otherwise entries are grouped per date and only the ones that need attention are listed. */
export function renderExpiryReport(rep, { detail = false, renew = 'node tools/data/validate.mjs --renew RULE --until YYYY-MM-DD --reason "..."' } = {}) {
  const L = [];
  L.push(`baseline expiry: clock ${rep.now}, warning window ${rep.warn_days} days, ${plural(rep.rows.length, 'baselined rule')}`);
  if (detail) {
    L.push('rule  sev expires      days left  violations  status');
    for (const r of rep.rows) L.push(`${r.id.padEnd(5)} ${r.sev.padEnd(3)} ${String(r.expires ?? '-').padEnd(10)} ${String(r.days_left ?? '-').padStart(9)}  ${String(r.count).padStart(10)}  ${r.status.toUpperCase()}`);
  } else {
    const byDate = new Map();
    for (const r of rep.rows) { if (!byDate.has(r.expires)) byDate.set(r.expires, []); byDate.get(r.expires).push(r); }
    for (const [d, rs] of byDate) L.push(`  ${String(d ?? 'no date').padEnd(10)} ${rs[0].days_left === null ? 'invalid' : `${String(rs[0].days_left).padStart(4)} days`}  ${rs.map((r) => r.id).join(' ')}`);
  }
  // one line per rule in the detailed (gate) form; one line per date in the ordinary run, so a day on which fifty baselines come due is not fifty lines of log
  const groups = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.expires)) m.set(r.expires, []); m.get(r.expires).push(r); } return [...m.values()]; };
  const listing = (rows, line) => { if (detail) for (const r of rows) L.push(line([r])); else for (const g of groups(rows)) L.push(line(g)); };
  const ids = (g) => g.map((r) => r.id).join(' ');
  const viol = (g) => g.reduce((n, r) => n + r.count, 0);
  const who = (g) => (g.length === 1 ? g[0].id : `${g.length} rules (${ids(g)})`);
  for (const r of rep.invalid) L.push(`INVALID: ${r.id} has no usable expiry date (${JSON.stringify(r.expires)}): an entry without an expiry never comes due`);
  listing(rep.warning, (g) => `WARNING: ${detail ? `${g[0].id} baseline expires` : `baseline expires`} ${g[0].expires} (${g[0].days_left === 0 ? 'today is the last day' : `in ${plural(g[0].days_left, 'day')}`})${detail ? '' : ` for ${who(g)}`}, ${plural(viol(g), 'violation')} still baselined: fix them, or renew with ${renew}`);
  listing(rep.expired, (g) => `EXPIRED: ${detail ? `${g[0].id} baseline expired` : `baseline expired`} ${g[0].expires} (${plural(-g[0].days_left, 'day')} ago)${detail ? '' : ` for ${who(g)}`}, ${plural(viol(g), 'violation')} still baselined: fix them, or renew with ${renew}`);
  if (!rep.invalid.length && !rep.warning.length && !rep.expired.length) L.push(rep.next ? `no baseline expires within ${rep.warn_days} days (next: ${rep.next.expires}, in ${plural(rep.next.days_left, 'day')})` : 'no baselined rule: nothing can expire');
  return L;
}

/** GitHub Actions workflow commands for the same findings (printed only when GITHUB_ACTIONS is set), so CI shows them as annotations. */
export function githubAnnotations(rep) {
  const L = [];
  for (const r of rep.warning) L.push(`::warning title=baseline expiry::${r.id} baseline expires ${r.expires} (${r.days_left} day(s) left, ${r.count} violation(s)): fix or renew`);
  for (const r of rep.expired) L.push(`::error title=baseline expired::${r.id} baseline expired ${r.expires} with ${r.count} violation(s) still baselined: fix or renew`);
  for (const r of rep.invalid) L.push(`::error title=baseline expiry invalid::${r.id} has no usable expiry date`);
  return L;
}
