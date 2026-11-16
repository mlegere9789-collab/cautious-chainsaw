#!/usr/bin/env python3
"""Gate Q25, library audit coverage: "every source in the acquisition list is ingested, blocked with register entry, or scheduled with a reason."

Defined by docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC.md (Q25.1 to Q25.6, the table of status words, K3: COVERED counts toward the verdict, X-25, X-48, A-28, DD-G11).
Command:  python3 tools/bt/gates/q25_library.py [--root DIR] [--out DIR] [--list FILE] [--ids FILE] [--no-write]    (light, python only, no network)
Output:   docs/battle-theatre/GOVERNANCE/gate_results/Q25.json  (record format bt-gate-result/1, see lib/pq_common.py)

Inputs (read, never written): the status files GOVERNANCE/library/status*.json (merged by source id, the highest-numbered file wins), the acquisition ledgers acquired*.json,
candidates.json, figures-ledger.json, terrain/terrain_sources.json (the 45 catalogue rows of B.9), medical/sources.json (the works a decision names), the register
(register_index.json and register/<id>.md), BIBLE/plan-clean.txt, and two files of this tool: lib/acquisition_list.json (the machine list of Q25.1) and lib/library_ids.json
(the id map between status rows and acquisition entries).

What the runner demands of a status row (GATE-SPEC, table of Q25; fields it reads are named here because the status files hold none of them today):
  ingested        the acquisition entries that the id map reaches carry sha256 (or text_sha256), the acquisition date, the rights basis and the text quality; for the Official Records
                  also `second_witness` {status diffed|unreachable, host, date, result}. A local file that exists is re-hashed and must match.
  scheduled       a reason (not "for now"), `next_action`, and `queue_entry` that resolves in GOVERNANCE/library/work_queue.json.
  blocked         `register_id(s)` of open entries (open or awaiting owner), `failed_lookup` records {host, locator, date, response}; a block is stale (FAIL, retry owed) when an acquisition
                  entry shows a successful request to the same host after the date of the failed lookup.
  blocked-to-prior-research   as blocked, and the earlier research is a dated record.
  print-only      the reason, an open acquisition-target register entry, `owner_step`.
  viewer-only     `terms_read` {host, locator, date, permits}, an open register entry.
  partial         two parts: the acquired part as ingested, and `remainder` {status scheduled|blocked ...} with its own record.
  targeted-lookup-only   two parts: `lookups` (each with sha256 and date) as ingested, and the bulk remainder as blocked with its reason.
  finder-not-authority   by evidence: acquired and hash-recorded gives an ingested lead, else scheduled with its next action; tier lead.
  licence-checked one part for every source the title names (split at ';'): acquired and licensed in an asset ledger (ingested), else scheduled with its record, owner step written.
  unusable        the acquired file stays hash-recorded; the failed read is a blocked part (what was tested, result, date, open entry); a route not yet tried is a scheduled part.
  any other word  FAIL: unmapped status (never skipped, never guessed).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
import pq_common as pq  # noqa: E402

GATE = 'Q25'
TERMINAL = {'ingested': 'ingested', 'scheduled': 'scheduled', 'blocked': 'blocked', 'blocked-to-prior-research': 'blocked', 'print-only': 'blocked', 'viewer-only': 'blocked',
            'partial': 'split', 'targeted-lookup-only': 'split', 'finder-not-authority': 'evidence', 'licence-checked': 'split', 'unusable': 'split'}
OPEN_REGISTER = ('open', 'awaiting owner')
BAD_REASON = re.compile(r'^\W*(for now|later|tbd|todo|someday|eventually|pending|n/?a|none|-)\W*$', re.I)
DATE = re.compile(r'\b(20\d\d-\d\d-\d\d)\b')
HOST = re.compile(r'\b((?:[a-z0-9-]+\.)+(?:com|org|gov|edu|net|us|io))\b', re.I)
COPYRIGHT_FLAG = re.compile(r'all rights reserved|copyrighted|in copyright|under copyright', re.I)
COPYRIGHT_OK = re.compile(r'not in copyright|no known|public domain|no copyright|out of copyright', re.I)
PRIORITY = ['FAIL', 'BLOCKED-INPUT', 'NOT-RUN', 'COVERED', 'PASS']


# ----------------------------------------------------------------------------------------------------------------- loading
def file_number(fn, stem):
    m = re.match(r'^%s(?:_(\d+))?\.json$' % re.escape(stem), fn)
    return None if not m else (int(m.group(1)) if m.group(1) else 1)


def numbered(libdir, stem):
    out = []
    if os.path.isdir(libdir):
        for fn in os.listdir(libdir):
            n = file_number(fn, stem)
            if n is not None:
                out.append((n, fn))
    return [fn for _, fn in sorted(out)]


def rows_of(doc):
    src = doc.get('sources', doc) if isinstance(doc, dict) else doc
    if isinstance(src, dict):
        return [dict(v, id=v.get('id', k)) for k, v in src.items()]
    return list(src or [])


def load_status(rec, libdir):
    """Merge the status files by source id: the highest-numbered file that holds an id wins; a later entry that says 'unchanged' keeps the earlier record."""
    files = numbered(libdir, 'status')
    merged, hist = {}, {}
    for fn in files:
        doc = rec.read_json(os.path.join(libdir, fn), 'status file')
        for r in rows_of(doc):
            sid = r.get('id')
            if not sid:
                continue
            hist.setdefault(sid, []).append((fn, r))
    for sid, lst in hist.items():
        row = {}
        texts = []
        for fn, r in lst:
            for k, v in r.items():
                if k in ('status',) or not pq.is_placeholder(v) or k not in row:
                    row[k] = v
            for k in ('title', 'where', 'note', 'reason'):
                if r.get(k):
                    texts.append(str(r[k]))
        row['_files'] = [fn for fn, _ in lst]
        row['_words'] = {fn: r.get('status') for fn, r in lst}
        row['_text'] = ' '.join(texts)
        row['_title'] = next((r['title'] for _, r in lst if r.get('title')), sid)
        row['_unchanged_later'] = any(str(r.get('reason', '')).lower().startswith('unchanged') for _, r in lst[1:])
        merged[sid] = row
    return merged, files


def load_acquired(rec, libdir, ids, status_ids=()):
    """All acquisition entries as dicts {ledger, id, status_id, sha, date, rights, quality, url, host, local_path, fetched_at, entry} plus the blocked/failed lists."""
    out, blocked = [], []
    for fn in numbered(libdir, 'acquired'):
        doc = rec.read_json(os.path.join(libdir, fn), 'acquisition ledger')
        rules = (ids.get('acquired_to_status') or {}).get(fn) or {}
        for it in doc.get('items') or []:
            eid = it.get('source_id') or it.get('id')
            e = {'ledger': fn, 'id': eid, 'entry': it}
            e['sha'] = it.get('sha256') or it.get('text_sha256') or it.get('pointer_sha256') or it.get('sha256_of_pdfs') or next((f.get('sha256') for f in (it.get('files') or []) if isinstance(f, dict) and f.get('sha256')), None)
            e['date'] = it.get('acquired') or it.get('fetched_at') or it.get('retrieved')
            e['rights'] = it.get('licence_note') or it.get('licence_basis') or it.get('rights_basis')
            e['quality'] = it.get('ocr_quality') or it.get('text_quality')
            e['url'] = it.get('url')
            e['local_path'] = it.get('local_path')
            e['fetched_at'] = it.get('fetched_at')
            e['host'] = host_of(it)
            e['status_id'] = map_entry(fn, eid, it, rules) or (eid if eid in status_ids else None)
            out.append(e)
        for b in doc.get('blocked') or doc.get('blocked_or_failed') or []:
            blocked.append({'ledger': fn, 'entry': b})
    for fn, key in (('candidates.json', 'candidates'),):
        p = os.path.join(libdir, fn)
        if os.path.isfile(p):
            doc = rec.read_json(p, 'candidate list')
            rules = (ids.get('acquired_to_status') or {}).get(fn) or {}
            for cid in sorted((doc.get(key) or {})):
                out.append({'ledger': fn, 'id': cid, 'entry': {}, 'sha': None, 'date': doc.get('probed'), 'rights': None, 'quality': None, 'url': None, 'local_path': None,
                            'fetched_at': None, 'host': None, 'status_id': (rules.get('map') or {}).get(cid) or (cid if cid in status_ids else None), 'candidate': True})
    p = os.path.join(libdir, 'figures-ledger.json')
    if os.path.isfile(p):
        doc = rec.read_json(p, 'figures ledger')
        rules = (ids.get('acquired_to_status') or {}).get('figures-ledger.json') or {}
        for it in doc.get('entries') or []:
            eid = it.get('id')
            out.append({'ledger': 'figures-ledger.json', 'id': eid, 'entry': it, 'sha': None, 'date': it.get('accessed'), 'rights': it.get('licence'), 'quality': None, 'url': None, 'local_path': None,
                        'fetched_at': None, 'host': None, 'status_id': (rules.get('map') or {}).get(eid) or (eid if eid in status_ids else None), 'figures': True})
    return out, blocked


def load_queue(rec, path):
    """GOVERNANCE/library/work_queue.json: a list of entries {id, source_id, next_action, ...} or a map id -> entry. None when the file does not exist."""
    rec.add_input(path, 'work queue')
    if not os.path.isfile(path):
        return None
    d = rec.read_json(path, 'work queue')
    d = d.get('entries', d) if isinstance(d, dict) else d
    if isinstance(d, dict):
        return dict(d)
    return {x['id']: x for x in d if isinstance(x, dict) and 'id' in x}


def host_of(it):
    u = it.get('url') or ''
    m = re.match(r'https?://([^/\s]+)', u)
    if m:
        return m.group(1).lower()
    if it.get('archive_identifier'):
        return 'archive.org'
    h = (it.get('host') or '').strip().split(' ')[0].lower()
    return h or None


def map_entry(fn, eid, it, rules):
    """The status id an acquisition entry belongs to (library_ids.json rules, in the order of its _doc), or None."""
    if eid in (rules.get('map') or {}):
        return rules['map'][eid]
    for p, sid in sorted((rules.get('prefix') or {}).items(), key=lambda kv: -len(kv[0])):
        if str(eid).startswith(p):
            return sid
    qs = it.get('queue_source')
    if qs and qs in (rules.get('queue_source') or {}):
        return rules['queue_source'][qs]
    u = it.get('url') or ''
    m = re.match(r'https?://([^/\s]+)(/[^\s]*)?', u)
    if m:
        for r in rules.get('url_rules') or []:
            if m.group(1).lower() == r.get('host') and (r.get('path_contains') or '') in (m.group(2) or ''):
                return r['status']
    return None


# ----------------------------------------------------------------------------------------------------------------- record checks
class Ctx:
    def __init__(self, env, rec, status, acquired, register, queue, ids):
        self.env, self.rec, self.status, self.acquired, self.register, self.queue, self.ids = env, rec, status, acquired, register, queue, ids
        self.by_status = {}
        for e in acquired:
            if e.get('status_id') and not e.get('candidate') and not e.get('figures'):     # a probed candidate or a figures-ledger read is tracked by a row but is no acquisition evidence
                self.by_status.setdefault(e['status_id'], []).append(e)
        self.host_success = {}
        for e in acquired:
            if e.get('host') and e.get('fetched_at') and (e.get('sha') or e.get('local_path')):
                self.host_success.setdefault(e['host'], []).append((str(e['fetched_at']), e['id']))

    # -- helpers
    def reg_open(self, rid):
        e = self.register.get(rid)
        if e is None:
            return False, 'register id %s is not in register_index.json' % rid
        st = e.get('status')
        if st not in OPEN_REGISTER:
            return False, 'register entry %s has status %s (a link counts only for open or awaiting owner)' % (rid, st)
        if not os.path.isfile(os.path.join(self.env.gov, 'register', rid + '.md')):
            return False, 'register entry %s has no file register/%s.md' % (rid, rid)
        return True, ''

    def reg_ids(self, row):
        v = row.get('register_ids', row.get('register_id', row.get('register')))
        if v is None:
            return []
        if isinstance(v, str):
            v = [v]
        return [x for x in v if isinstance(x, str) and x.strip()]


def as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def check_register(ctx, row, what):
    ids = ctx.reg_ids(row)
    if not ids:
        return ['no register id (%s needs an open entry)' % what]
    bad = []
    for rid in ids:
        ok, why = ctx.reg_open(rid)
        if not ok:
            bad.append(why)
    return bad


def check_failed_lookup(row):
    fl = as_list(row.get('failed_lookup', row.get('failed_lookups')))
    if not fl:
        return ['no failed-lookup record (host, locator, date, response)'], []
    bad, dates = [], []
    for i, f in enumerate(fl):
        if not isinstance(f, dict):
            bad.append('failed_lookup[%d] is not a record' % i)
            continue
        miss = [k for k in ('host', 'locator', 'date', 'response') if pq.is_placeholder(f.get(k))]
        if miss:
            bad.append('failed_lookup[%d] lacks %s' % (i, ', '.join(miss)))
        d = DATE.search(str(f.get('date') or ''))
        if d:
            dates.append((d.group(1), str(f.get('host') or '').lower()))
    return bad, dates


def stale_block(ctx, row, lookups):
    """A block is stale when a request to the same host succeeded after the failed lookup."""
    text_dates = DATE.findall(row.get('_text', ''))
    last_fail = max([d for d, _ in lookups] + text_dates) if (lookups or text_dates) else None
    hosts = {h for _, h in lookups if h} | {h.lower() for h in HOST.findall(row.get('_text', ''))}
    hits = []
    for h in hosts:                                      # an undated block counts every later-or-unknown success: the strict reading (the block cannot be shown to be newer)
        for hh, lst in ctx.host_success.items():
            if hh == h or hh.endswith('.' + h) or h.endswith('.' + hh):
                hits += [(t, i, hh) for t, i in lst if t[:10] > (last_fail or '')]
    return sorted(hits)[:5], last_fail, sorted(hosts)


def check_scheduled_record(ctx, row, label=''):
    bad = []
    reason = row.get('reason') if not pq.is_placeholder(row.get('reason')) else row.get('note')
    if pq.is_placeholder(reason) or BAD_REASON.match(str(reason)) or 'for now' in str(reason).lower():
        bad.append('no reason that is not "for now"')
    na = row.get('next_action')
    if pq.is_placeholder(na) or BAD_REASON.match(str(na)):
        bad.append('no named next action')
    q = row.get('queue_entry', row.get('work_queue'))
    if pq.is_placeholder(q):
        bad.append('no work-queue entry')
    elif ctx.queue is None:
        bad.append('input missing: GOVERNANCE/library/work_queue.json (the work queue the entry %s would be in)' % q)
    elif str(q) not in ctx.queue:
        bad.append('work-queue entry %s is not in work_queue.json' % q)
    return bad


def check_ingested_evidence(ctx, sid, entries, second_witness_needed=False, row=None):
    """The Q25.3 evidence of every acquisition entry that reaches a row, and the re-hash of a local file that exists."""
    if not entries:
        return ['no acquisition entry (hash, date, rights, quality) reaches this row through the id map'], {}
    bad, ev = [], {'entries': len(entries), 'local_files_hashed': 0, 'local_files_missing': 0}
    for e in entries:
        miss = []
        if not e['sha']:
            miss.append('sha256')
        if not e['date']:
            miss.append('acquisition date')
        if pq.is_placeholder(e['rights']):
            miss.append('rights basis')
        if pq.is_placeholder(e['quality']):
            miss.append('text quality')
        if miss:
            bad.append('%s/%s lacks %s' % (e['ledger'], e['id'], ', '.join(miss)))
        lp = e.get('local_path')
        if lp and e.get('sha'):
            p = os.path.join(ctx.env.root, *str(lp).split('/'))
            if os.path.isfile(p) and os.path.getsize(p) <= 64 * 1024 * 1024:
                ev['local_files_hashed'] += 1
                if pq.sha256_file(p) not in (e['sha'], (e['entry'] or {}).get('text_sha256')):
                    bad.append('%s/%s: the stored file %s does not match the recorded sha256' % (e['ledger'], e['id'], lp))
            elif not os.path.isfile(p):
                ev['local_files_missing'] += 1
    if second_witness_needed:
        sw = (row or {}).get('second_witness')
        if not isinstance(sw, dict) or sw.get('status') not in ('diffed', 'unreachable') or pq.is_placeholder(sw.get('date')) or pq.is_placeholder(sw.get('host')):
            bad.append('no second-witness record for the Official Records (X.3 a: status diffed or unreachable, with host and date)')
    return bad, ev


def eval_status_row(ctx, sid):
    """The parts of one status row: [(part_id, terminal, result, reason, evidence)]."""
    row = ctx.status[sid]
    word = row.get('status')
    entries = ctx.by_status.get(sid, [])
    ev = {'status_word': word, 'files': row['_files'], 'acquisition_entries': len(entries)}
    if len({w for w in row['_words'].values() if w}) > 1:
        ev['status_words_by_file'] = row['_words']
    if word not in TERMINAL:
        return [(sid, None, 'FAIL', 'unmapped status word %r (not one of the eleven words of the table of Q25)' % (word,), ev)]
    kind = TERMINAL[word]
    is_or = sid.startswith('OR-27-')
    parts = []

    def res(bad, ok_result):
        return ('FAIL', '; '.join(bad)) if bad else (ok_result, 'complete record')

    def part(pid, terminal, bad, ok_result, extra=None):
        r, why = res(bad, ok_result)
        e = dict(ev)
        e.update(extra or {})
        if bad:
            e['missing'] = bad
        parts.append((pid, terminal, r, why, e))

    def blocked_checks(r, label):
        bad = check_register(ctx, r, 'a blocked source')
        fb, lookups = check_failed_lookup(r)
        bad += fb
        stale, last_fail, hosts = stale_block(ctx, row, lookups)
        extra = {'hosts': hosts, 'last_failed_lookup_date': last_fail}
        if stale:
            bad.append('stale block, retry owed: a request to the same host succeeded %s (%s)' % (('after ' + last_fail) if last_fail else 'and the block is undated', '; '.join('%s %s' % (t[:10], i) for t, i, _ in stale[:3])))
            extra['later_successes'] = [{'at': t, 'entry': i} for t, i, _ in stale]
        return bad, extra

    if word == 'ingested':
        bad, e2 = check_ingested_evidence(ctx, sid, entries, is_or, row)
        part(sid, 'ingested', bad, 'PASS', e2)
    elif word == 'scheduled':
        part(sid, 'scheduled', check_scheduled_record(ctx, row), 'COVERED')
    elif word == 'blocked':
        bad, extra = blocked_checks(row, 'blocked')
        part(sid, 'blocked', bad, 'COVERED', extra)
    elif word == 'blocked-to-prior-research':
        bad, extra = blocked_checks(row, 'blocked')
        if not DATE.search(row.get('_text', '')) and pq.is_placeholder(row.get('earlier_research')):
            bad.append('the earlier research is not a dated record')
        part(sid, 'blocked', bad, 'COVERED', extra)
    elif word == 'print-only':
        bad = check_register(ctx, row, 'a print-only work (acquisition target)')
        if pq.is_placeholder(row.get('owner_step')):
            bad.append('no owner step (a purchase or a loan) written beside it')
        if not re.search(r'print', (row.get('reason') or '') + ' ' + (row.get('note') or ''), re.I):
            bad.append('the reason does not say print-only')
        part(sid, 'blocked', bad, 'COVERED')
    elif word == 'viewer-only':
        bad = check_register(ctx, row, 'a viewer-only source')
        tr = row.get('terms_read')
        if not isinstance(tr, dict) or any(pq.is_placeholder(tr.get(k)) for k in ('host', 'locator', 'date', 'permits')):
            bad.append('no terms-read record (host, locator, date, what the terms permit)')
        part(sid, 'blocked', bad, 'COVERED')
    elif word == 'partial':
        bad, e2 = check_ingested_evidence(ctx, sid, entries, is_or, row)
        part(sid + '#ingested', 'ingested', bad, 'PASS', e2)
        rem = row.get('remainder')
        if not isinstance(rem, dict) or rem.get('status') not in ('scheduled', 'blocked'):
            part(sid + '#remainder', None, ['no record of the remainder (a partial row needs a remainder that is scheduled or blocked, with its own record)'], 'COVERED')
        elif rem['status'] == 'scheduled':
            part(sid + '#remainder', 'scheduled', check_scheduled_record(ctx, dict(rem)), 'COVERED')
        else:
            b, extra = blocked_checks(dict(rem, _text=row.get('_text', '')), 'blocked')
            part(sid + '#remainder', 'blocked', b, 'COVERED', extra)
    elif word == 'targeted-lookup-only':
        lk = as_list(row.get('lookups'))
        if not lk:
            part(sid + '#lookups', 'scheduled', ['no lookup recorded: with no lookup made the whole row is scheduled with its next action'] + check_scheduled_record(ctx, row), 'COVERED')
        else:
            bad = [('lookups[%d] lacks sha256 or date' % i) for i, x in enumerate(lk) if not isinstance(x, dict) or pq.is_placeholder(x.get('sha256')) or pq.is_placeholder(x.get('date'))]
            part(sid + '#lookups', 'ingested', bad, 'PASS', {'lookups': len(lk)})
        rem = row.get('remainder')
        why = (rem or {}).get('reason') if isinstance(rem, dict) else None
        bad = check_register(ctx, rem if isinstance(rem, dict) else {}, 'the bulk remainder (blocked)')
        if pq.is_placeholder(why):
            bad.append('no reason for the block of the bulk remainder (bulk use needs a permission nobody is asked for, DEC-019)')
        part(sid + '#bulk', 'blocked', bad, 'COVERED')
    elif word == 'finder-not-authority':
        if entries:
            bad, e2 = check_ingested_evidence(ctx, sid, entries, False, row)
            part(sid, 'ingested', bad + ([] if str(row.get('tier', '')).lower() == 'lead' else ['the tier is not recorded as lead (p. 134, E.1, E.7)']), 'PASS', e2)
        else:
            part(sid, 'scheduled', check_scheduled_record(ctx, row) + ([] if str(row.get('tier', '')).lower() == 'lead' else ['the tier is not recorded as lead (p. 134, E.1, E.7)']), 'COVERED')
    elif word == 'licence-checked':
        names = [s.strip() for s in re.split(r';', row.get('_title', '')) if s.strip()]
        if not names:
            part(sid, None, ['the row names no source'], 'COVERED')
        for i, nm in enumerate(names):
            m = asset_match(ctx, nm)
            pid = '%s#%s' % (sid, re.sub(r'[^A-Za-z0-9]+', '-', nm).strip('-')[:40])
            if m is not None and m['entries'] and not m['bad']:
                part(pid, 'ingested', [], 'PASS', {'source': nm, 'asset_ledger_entries': m['entries']})
            else:
                why = (['asset ledger entries for %s are incomplete: %s' % (nm, '; '.join(m['bad'][:3]))] if m and m['entries'] else []) + check_scheduled_record(ctx, dict(row)) + \
                      ([] if not pq.is_placeholder(row.get('owner_step')) else ['no owner step (an account or a licence acceptance is an owner-only act) written beside it'])
                part(pid, 'scheduled', why, 'COVERED', {'source': nm})
    elif word == 'unusable':
        part(sid + '#file', 'ingested', check_ingested_evidence(ctx, sid, entries, False, row)[0], 'PASS')
        fr = row.get('failed_read')
        bad = check_register(ctx, row, 'an unreadable source (X.3 k)')
        if not isinstance(fr, dict) or any(pq.is_placeholder(fr.get(k)) for k in ('tested', 'result', 'date')):
            bad.append('no failed-read record (what was tested, the result, the date)')
        part(sid + '#failed-read', 'blocked', bad, 'COVERED')
        rt = row.get('route_not_tried')
        if not pq.is_placeholder(rt):
            part(sid + '#route', 'scheduled', check_scheduled_record(ctx, row), 'COVERED')
    return parts


def asset_match(ctx, name):
    """Entries of the asset ledgers that belong to a named licence-checked source (library_ids.json `asset_matchers`)."""
    for m in ctx.ids.get('asset_matchers') or []:
        if m['name'].lower() in name.lower():
            p = os.path.join(ctx.env.root, *m['file'].split('/'))
            if not os.path.isfile(p):
                return None
            doc = ctx.rec.read_json(p, 'asset ledger')
            lst = doc.get(m.get('list', 'sources')) or []
            hit = [x for x in lst if m['contains'].lower() in str(x.get(m['field'], '')).lower()]
            bad = []
            for x in hit:
                for k in m.get('require', []):
                    if pq.is_placeholder(x.get(k)):
                        bad.append('%s lacks %s' % (x.get(m.get('id_field', 'id')), k))
            return {'entries': len(hit), 'bad': bad}
    return None


# ----------------------------------------------------------------------------------------------------------------- assets (Q25.5) and requests (Q25.4)
def dig(doc, path):
    node = doc
    for k in path:
        node = node.get(k) if isinstance(node, dict) else None
    return node


def asset_tables(env, rec, ids):
    """Q25.5: each motion clip, sample, texture and model has a licence, source and method in the asset manifest; restricted licences (NC, ND, SA) are excluded from a release export; every
    binary asset file of the page's data folder is covered by a manifest."""
    cfg = ids.get('asset_tables') or []
    if not cfg:
        rec.blocked('Q25/Q25.5/asset-tables', 'tools/bt/gates/lib/library_ids.json asset_tables', 'the asset manifests that the check reads are not named')
        return
    covered = set()
    for c in cfg:
        p = os.path.join(env.root, *c['file'].split('/'))
        iid = 'Q25/Q25.5/%s' % c['id']
        if not os.path.isfile(p):
            rec.add_input(p, 'asset manifest')
            rec.blocked(iid, c['file'], 'asset manifest')
            continue
        doc = rec.read_json(p, 'asset manifest')
        top = lambda keys: any(not pq.is_placeholder(dig(doc, k.split('.'))) for k in keys)
        if c.get('pack'):
            miss = [w for w in ('licence', 'source', 'method') if not top(c[w])]
            covered.add(('prefix', c['covers']))
            rec.item(iid, 'PASS' if not miss else 'FAIL', 'the pack record has licence, source and method' if not miss else 'the pack record lacks %s' % ', '.join(miss),
                     {'file': c['file'], 'covers': c['covers'], 'missing': miss}, check='Q25.5')
            continue
        node = dig(doc, c['list'])
        if isinstance(node, dict):
            entries = [dict(v if isinstance(v, dict) else {}, _id=k) for k, v in sorted(node.items())]
            for k in node:
                covered.add(('path', c.get('prefix', '') + k))
        else:
            entries = [dict(x, _id=x.get(c.get('id_field', 'id'))) for x in (node or []) if isinstance(x, dict)]
            for x in entries:
                if x.get(c.get('file_field', 'file')):
                    covered.add(('path', str(x[c['file_field']]).replace('\\', '/')))
        if not entries:
            rec.item(iid, 'FAIL', 'the manifest lists no entry', {'file': c['file']}, check='Q25.5')
            continue
        bad, nc_bad = [], []
        for x in entries:
            miss = [w for w in ('licence', 'source', 'method') if not any(not pq.is_placeholder(x.get(k)) for k in c[w]) and not top(c[w])]
            if miss:
                bad.append('%s lacks %s' % (x['_id'], ', '.join(miss)))
            lic = str(x.get(c.get('licence_field', 'licence')) or '')
            if c.get('restricted_check') and re.search(r'(^|[^A-Za-z])(NC|ND|SA)([^A-Za-z]|$)', lic) and x.get(c['restricted_check']) is not False:
                nc_bad.append('%s (%s) is not excluded from a release export (%s is not false)' % (x['_id'], lic, c['restricted_check']))
        ok = not bad and not nc_bad
        rec.item(iid, 'PASS' if ok else 'FAIL', ('every entry has licence, source and method; every restricted licence is excluded from export' if ok else
                                                  '%d of %d entries lack licence, source or method; %d restricted entries are not excluded from export' % (len(bad), len(entries), len(nc_bad))),
                 {'file': c['file'], 'entries': len(entries), 'incomplete': pq.first_n(bad), 'incomplete_count': len(bad), 'restricted_not_excluded': pq.first_n(nc_bad)}, check='Q25.5')
    # census of the binary asset files of the page's data folder
    root = os.path.join(env.bt, 'app', 'data')
    exts = tuple(ids.get('asset_extensions') or ['.png', '.webp', '.glb', '.gltf', '.ogg', '.mp3', '.wav', '.bin', '.jpg', '.jpeg'])
    files = []
    if os.path.isdir(root):
        for dp, dn, fn in os.walk(root):
            dn.sort()
            for f in sorted(fn):
                if f.lower().endswith(exts):
                    files.append(os.path.relpath(os.path.join(dp, f), root).replace(os.sep, '/'))
    paths = {x[1] for x in covered if x[0] == 'path'}
    prefixes = [x[1] for x in covered if x[0] == 'prefix']
    unl = [f for f in files if f not in paths and not any(f.startswith(p) for p in prefixes)]
    if not files:
        rec.item('Q25/Q25.5/asset-census', 'BLOCKED-INPUT', 'input missing: no binary asset file found under docs/battle-theatre/app/data', {}, check='Q25.5')
    else:
        rec.item('Q25/Q25.5/asset-census', 'PASS' if not unl else 'FAIL', 'every binary asset file of the data folder is listed in an asset manifest' if not unl else
                 '%d of %d binary asset files are in no asset manifest' % (len(unl), len(files)), {'files': len(files), 'not_in_a_manifest': len(unl), 'first': pq.first_n(unl)}, check='Q25.5')


def check_requests(env, rec, ctx, ids, blocked_entries):
    """Q25.4: the throttle, the terms record, the hosts that answered with a bot block, copyrighted works."""
    # throttle: entries with a second-resolution fetched_at, per host, at least one second apart
    by_host = {}
    for e in ctx.acquired:
        if e.get('host') and e.get('fetched_at') and re.match(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d', str(e['fetched_at'])):
            by_host.setdefault(e['host'], []).append((str(e['fetched_at'])[:19], e['id']))
    viol = []
    for h, lst in by_host.items():
        lst.sort()
        for (a, ia), (b, ib) in zip(lst, lst[1:]):
            if a == b:
                viol.append('%s: %s and %s both at %s' % (h, ia, ib, a))
    coarse = sorted({e['ledger'] for e in ctx.acquired if e.get('date') and not e.get('fetched_at') and not e.get('candidate') and not e.get('figures')})
    if by_host:
        rec.item('Q25/Q25.4/throttle', 'PASS' if not viol else 'FAIL',
                 'no two requests to one host share a second (about one request per second, X.4)' if not viol else '%d pair(s) of acquisition entries from one host with the same second-resolution time' % len(viol),
                 {'hosts': len(by_host), 'entries_with_time': sum(len(v) for v in by_host.values()), 'violations': pq.first_n(viol), 'ledgers_with_day_resolution_only': coarse}, check='Q25.4')
        if coarse:
            rec.note('Q25.4 throttle: %s record only the day of acquisition, so the one-request-per-second rule cannot be read from them' % ', '.join(coarse))
    else:
        rec.blocked('Q25/Q25.4/throttle', 'acquisition entries with a second-resolution fetched_at', 'the request log')
    # terms and robots record per host
    hosts = sorted({e['host'] for e in ctx.acquired if e.get('host') and (e.get('fetched_at') or e.get('local_path'))})
    tp = os.path.join(env.gov, 'library', 'terms.json')
    rec.add_input(tp, 'terms and robots record')
    if not os.path.isfile(tp):
        rec.blocked('Q25/Q25.4/terms-record', 'GOVERNANCE/library/terms.json', 'a record per host that terms and robots rules were checked (host, date, what they permit)')
    else:
        doc = rec.read_json(tp, 'terms and robots record')
        recs = doc.get('hosts', doc) if isinstance(doc, dict) else {}
        miss = [h for h in hosts if not (isinstance(recs.get(h), dict) and recs[h].get('robots_checked') and recs[h].get('terms_checked') and not pq.is_placeholder(recs[h].get('date')))]
        rec.item('Q25/Q25.4/terms-record', 'PASS' if not miss else 'FAIL', 'terms and robots rules are recorded for every host a request was made to' if not miss else '%d host(s) have no complete terms and robots record' % len(miss),
                 {'hosts': len(hosts), 'missing': pq.first_n(miss)}, check='Q25.4')
    # hosts that answered with their own bot block: recorded as blocked and never retried
    bb = ids.get('bot_blocked_hosts') or []
    if bb:
        probs = []
        for b in bb:
            h = b['host']
            recorded = any(h in (r.get('_text', '') + json.dumps(r.get('failed_lookup', r.get('failed_lookups', ''))) ) and r.get('status') in ('blocked', 'blocked-to-prior-research') for r in ctx.status.values())
            if not recorded:
                probs.append('%s is not recorded as blocked in any status row (answered with a bot block on %s)' % (h, b['date']))
            later = [(e['fetched_at'], e['id']) for e in ctx.acquired if e.get('host') and (e['host'] == h or e['host'].endswith('.' + h)) and e.get('fetched_at') and str(e['fetched_at'])[:10] > b['date']]
            if later:
                probs.append('%s was requested again after the block (%s): retried' % (h, later[0][1]))
        rec.item('Q25/Q25.4/blocked-hosts', 'PASS' if not probs else 'FAIL', 'the hosts that answered with a bot block are recorded as blocked and were not requested again' if not probs else '; '.join(probs),
                 {'hosts': [b['host'] for b in bb], 'problems': probs}, check='Q25.4')
    # copyrighted works are never bulk-copied
    flagged = [e['id'] for e in ctx.acquired if e.get('rights') and COPYRIGHT_FLAG.search(str(e['rights'])) and not COPYRIGHT_OK.search(str(e['rights']))]
    rec.item('Q25/Q25.4/copyrighted', 'PASS' if not flagged else 'FAIL', 'no acquisition entry has a copyrighted rights basis' if not flagged else '%d acquisition entr(ies) are marked copyrighted: a copyrighted work is cited and never bulk-copied' % len(flagged),
             {'flagged': pq.first_n(flagged)}, check='Q25.4')


# ----------------------------------------------------------------------------------------------------------------- the list (Q25.1)
def plan_pages(text):
    parts = re.split(r'=== PAGE (\d+) ===', text)
    return {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}


def fold_ws(s):
    return re.sub(r'\s+', ' ', s)


def aggregate(results):
    for r in PRIORITY:
        if r in results:
            return r
    return 'FAIL'


def main(argv=None):
    ap = pq.base_parser(__doc__.split('\n')[0])
    ap.add_argument('--list', default=os.path.join(HERE, 'lib', 'acquisition_list.json'))
    ap.add_argument('--ids', default=os.path.join(HERE, 'lib', 'library_ids.json'))
    args = ap.parse_args(argv)
    env = pq.Env(args.root, args.out)
    rec = pq.Record(GATE, env, covered_counts=True, argv=['python3', 'tools/bt/gates/q25_library.py'] + (argv if argv is not None else sys.argv[1:]))
    libdir = os.path.join(env.gov, 'library')
    rec.threshold('T-Q02-1', pq.MAX_QUOTE_WORDS, 'PLAN (p. 134, E.6; working limit 14 words)', 'words in a quotation (not used by Q25)')
    # ---- the tool's own files
    try:
        lst = rec.read_json(args.list, 'acquisition list')
        ids = rec.read_json(args.ids, 'id map')
    except pq.InputMissing as e:
        rec.blocked('Q25/Q25.1/list', str(e), 'the machine list and the id map of the gate')
        return pq.finish_cli(rec, args)
    # ---- status files and ledgers
    try:
        status, status_files = load_status(rec, libdir)
        if not status_files:
            raise pq.InputMissing('GOVERNANCE/library/status*.json')
    except pq.InputMissing as e:
        rec.blocked('Q25/Q25.2/status-files', str(e), 'the status files: nothing can be judged')
        return pq.finish_cli(rec, args)
    try:
        acquired, blocked_entries = load_acquired(rec, libdir, ids, set(status))
    except pq.InputMissing as e:
        rec.blocked('Q25/Q25.3/ledgers', str(e), 'the acquisition ledgers')
        acquired, blocked_entries = [], []
    reg = {}
    rp = os.path.join(env.gov, 'register_index.json')
    try:
        reg = {e['id']: e for e in rec.read_json(rp, 'register index') if isinstance(e, dict) and 'id' in e}
    except pq.InputMissing as e:
        rec.note('register index missing (%s): every register id of a status row is unresolved' % e)
    wq = load_queue(rec, os.path.join(libdir, 'work_queue.json'))
    ctx = Ctx(env, rec, status, acquired, reg, wq, ids)

    # ---- Q25.1 plan anchors
    planp = os.path.join(env.bt, 'BIBLE', 'plan-clean.txt')
    pages = None
    try:
        pages = plan_pages(rec.read_text(planp, 'governing text'))
    except pq.InputMissing as e:
        rec.blocked('Q25/Q25.1/plan-anchors', str(e), 'the governing text; the list cannot be checked against it')
    rows = list(lst.get('rows') or [])
    if pages is not None:
        miss = [r['id'] for r in rows if fold_ws(r['anchor']) not in fold_ws(pages.get(r['page'], ''))]
        rec.item('Q25/Q25.1/plan-anchors', 'PASS' if not miss else 'FAIL', 'every row of the list is anchored in the plan text on its page' if not miss else '%d list row(s) have an anchor that is not on the page it names' % len(miss),
                 {'rows': len(rows), 'missing': pq.first_n(miss)}, check='Q25.1')
    # ---- source rows: list rows, the 45 catalogue rows, the works a decision names, the candidates
    src_rows = []
    for r in rows:
        src_rows.append({'id': r['id'], 'label': r['name'], 'status_ids': list(r.get('status_ids') or []), 'group': r['group'], 'sub_requirements': []})
    tp = os.path.join(env.bt, 'terrain', 'terrain_sources.json')
    try:
        terr = rec.read_json(tp, 'terrain source catalogue (B.9)')
        r12 = (ids.get('r12_to_status') or {})
        for r in terr.get('rows') or []:
            n = r['number']
            src_rows.append({'id': 'R12.%03d' % n, 'label': r['name'][:100], 'status_ids': list(r12.get(str(n), [])), 'group': 'B.9 table %s' % r['table'], 'sub_requirements': ['R12.%03d' % n]})
    except pq.InputMissing as e:
        rec.blocked('Q25/Q25.1/catalogue-B9', str(e), 'the 45 catalogue items of B.9 are rows of the list')
    for ds in lst.get('decision_sources') or []:
        mp = os.path.join(env.root, *ds['registry'].split('/'))
        try:
            med = rec.read_json(mp, 'works named by %s item %s' % (ds['decision'], ds['item']))
            for sid in sorted((med.get('sources') or {})):
                if any(sid.startswith(p) for p in ds['id_prefixes']):
                    src_rows.append({'id': '%s/%s' % (ds['decision'], sid), 'label': (med['sources'][sid].get('title') or sid)[:100], 'status_ids': [sid] if sid in status else [], 'group': ds['decision'], 'sub_requirements': []})
        except pq.InputMissing as e:
            rec.blocked('Q25/Q25.1/decision-sources-%s' % ds['decision'], str(e), 'the works that %s item %s names are rows of the list' % (ds['decision'], ds['item']))
    # the status ids a row names must exist
    unresolved = sorted({(r['id'], s) for r in src_rows for s in r['status_ids'] if s not in status})
    # ---- evaluate every status row once
    evald = {sid: eval_status_row(ctx, sid) for sid in sorted(status)}
    reached = set()
    for r in src_rows:
        for s in r['status_ids']:
            if s in status:
                reached.add(s)
    for e in acquired:
        if e.get('status_id') in status:
            reached.add(e['status_id'])
    # ---- one item per source row
    for r in src_rows:
        ids_ok = [s for s in r['status_ids'] if s in status]
        bad_ids = [s for s in r['status_ids'] if s not in status]
        if not r['status_ids'] or (bad_ids and not ids_ok):
            rec.item('Q25/Q25.2/row/%s' % r['id'], 'FAIL',
                     ('no status row names this source (silently skipped, p. 138 Z.7)' if not r['status_ids'] else 'the status id(s) %s named for this row do not exist in any status file' % ', '.join(bad_ids)),
                     {'label': r['label'], 'group': r['group']}, check='Q25.2', sub_requirements=r['sub_requirements'] or None)
            continue
        parts = [p for s in ids_ok for p in evald[s]]
        res = aggregate([p[2] for p in parts] + (['FAIL'] if bad_ids else []))
        reason = {'PASS': 'ingested, with its evidence', 'COVERED': 'recorded as blocked or scheduled with its record (the gate text allows it)'}.get(res)
        if res == 'FAIL':
            reason = '; '.join('%s: %s' % (p[0], p[3]) for p in parts if p[2] == 'FAIL')[:600] or 'FAIL'
            if bad_ids:
                reason = ('status id(s) %s do not exist; ' % ', '.join(bad_ids)) + reason
        rec.item('Q25/Q25.2/row/%s' % r['id'], res, reason,
                 {'label': r['label'], 'group': r['group'], 'status_ids': r['status_ids'], 'parts': [{'part': p[0], 'terminal': p[1], 'result': p[2], 'reason': p[3][:300]} for p in parts]},
                 check='Q25.2', sub_requirements=r['sub_requirements'] or None)
    # ---- status rows that no source row reaches are sources of the library all the same
    for sid in sorted(status):
        if sid in {s for r in src_rows for s in r['status_ids']}:
            continue
        for (pid, terminal, result, why, e) in evald[sid]:
            rec.item('Q25/Q25.2/status/%s' % pid, result, why if result == 'FAIL' else ('ingested, with its evidence' if result == 'PASS' else 'recorded as blocked or scheduled with its record'),
                     dict(e, terminal=terminal, title=status[sid]['_title'][:120]), check='Q25.2')
    # ---- untracked acquisition entries
    untracked = [e for e in acquired if not e.get('status_id') or e['status_id'] not in status]
    for e in untracked:
        why = 'no status row reaches this %s entry through the id map (untracked source, silently skipped, p. 138 Z.7)' % ('candidate' if e.get('candidate') else 'figures-ledger' if e.get('figures') else 'acquisition')
        if e.get('status_id') and e['status_id'] not in status:
            why = 'the id map sends this entry to status id %s, which is in no status file' % e['status_id']
        rec.item('Q25/Q25.1/untracked/%s:%s' % (e['ledger'], e['id']), 'FAIL', why, {'ledger': e['ledger'], 'host': e.get('host'), 'date': e.get('date')}, check='Q25.1')
    if unresolved:
        rec.item('Q25/Q25.1/status-ids-resolve', 'FAIL', '%d status id(s) named by list rows are in no status file' % len(unresolved), {'unresolved': [list(x) for x in unresolved[:20]]}, check='Q25.1')
    else:
        rec.item('Q25/Q25.1/status-ids-resolve', 'PASS', 'every status id that a list row names exists in a status file', {'rows': len(src_rows)}, check='Q25.1')
    # ---- Q25.4 and Q25.5
    check_requests(env, rec, ctx, ids, blocked_entries)
    asset_tables(env, rec, ids)
    # ---- owner steps (Q25.6): what the rows say the owner has to do, written as exact steps
    for sid in sorted(status):
        w = status[sid].get('status')
        if w in ('print-only', 'viewer-only', 'licence-checked'):
            step = status[sid].get('owner_step')
            rec.owe('owner step for %s (%s): %s' % (sid, w, step if not pq.is_placeholder(step) else 'NOT WRITTEN: the status row has no owner_step (Q25.6)'))
    rec.owe('Q25.3 second witness of the Official Records (HathiTrust, eHistory) is blocked by the hosts; the row needs a dated `unreachable` record, not a retry')
    rec.extra['status_summary'] = {'status_ids': len(status), 'words': dict(sorted(__import__('collections').Counter(str(s.get('status')) for s in status.values()).items())),
                                   'acquisition_entries': len(acquired), 'untracked_entries': len(untracked), 'source_rows': len(src_rows), 'status_files': status_files}
    return pq.finish_cli(rec, args)


if __name__ == '__main__':
    pq.guarded_main(main)
