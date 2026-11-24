#!/usr/bin/env python3
"""Fill the library status bookkeeping behind gate Q25 from the acquisition ledgers and the files that exist.

    python3 -I tools/bt/library_status_fill.py [--root DIR] [--dry-run]

Deterministic and idempotent.  Writes only: GOVERNANCE/library/status.json (rows added, absent keys filled; nothing existing is overwritten),
GOVERNANCE/register/EG-LIB-*.md + register_index.json (new open entries), tmp/q25/library_status_fill_summary.json.

Rules (never invented; every fact comes from a ledger, a status row, a medical/sources.json record or the file itself):
  * an acquisition entry (ledger item, candidate, figures-ledger entry) that no status row reaches gets a row with its own id:
      ingested   only when the local file exists and its sha256 equals the ledger's sha256 or text_sha256;
      scheduled  otherwise, with the reason the ledger gives (file absent / hash differs / no local path / candidate only / figures read through fetch).
  * the works named by decision_sources of lib/acquisition_list.json get a row with their own id from medical/sources.json, by the same rule.
  * blocked / blocked-to-prior-research / print-only / viewer-only / unusable rows, a targeted-lookup bulk remainder: an open register entry
    EG-LIB-<id> is created and linked (`register_ids`); `failed_lookup` / `failed_read` / `second_witness` / `owner_step` are written only
    where a ledger or the row's own text gives host, locator, date and response.  A fact that is not recorded is NOT written as a value that the
    runner would accept: the key stays absent and is named in the row's `not_recorded` list, so the gate item stays FAIL.
  * a partial row without a remainder gets remainder {status: scheduled, reason: the row's own reason}; next_action / queue_entry are never
    invented (work_queue.json does not exist), so those items stay FAIL.
"""
import argparse
import hashlib
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DATE = re.compile(r'\b(20\d\d-\d\d-\d\d)\b')
HOSTRE = re.compile(r'\b((?:[a-z0-9-]+\.)+(?:com|org|gov|edu|net|us|io))\b', re.I)
MARK = 'EG-LIB-'
SCRIPT_NOTE = 'tools/bt/library_status_fill.py'


class Shim:                                   # the part of the runner's recorder that the loaders use
    def read_json(self, path, label=''):
        with open(path, encoding='utf-8') as f:
            return json.load(f)

    def add_input(self, *a, **k):
        pass


def load_runner():
    gates = os.path.join(HERE, 'gates')
    sys.path.insert(0, os.path.join(gates, 'lib'))
    spec = importlib.util.spec_from_file_location('q25_library', os.path.join(gates, 'q25_library.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def read(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def dump(p, d, ascii_only=False):
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(d, f, indent=1, ensure_ascii=ascii_only)


def verify(root, local_path, hashes):
    """('ingested'|'absent'|'mismatch'|'nopath', detail)"""
    hashes = [h for h in hashes if h]
    if not local_path:
        return 'nopath', 'the ledger names no local file'
    p = os.path.join(root, *str(local_path).split('/'))
    if not os.path.isfile(p):
        return 'absent', 'local file %s does not exist in this checkout' % local_path
    if not hashes:
        return 'nohash', 'the ledger records no sha256 for %s' % local_path
    got = sha256_file(p)
    if got in hashes:
        return 'ingested', 'local file %s re-hashed: sha256 %s equals the ledger' % (local_path, got)
    return 'mismatch', 'local file %s sha256 %s differs from the ledger (%s)' % (local_path, got, ' / '.join(hashes))


# ---------------------------------------------------------------------------------------------------------------- register
REG_TEMPLATE = """# {id}: {title}

| Field | Content |
|---|---|
| ID | {id} |
| Requirement IDs | {rids} |
| Category | {cat} |
| Description | {desc} |
| Why literal 100% is not possible or blocked | {why} |
| Evidence searched | {searched} |
| Autonomous substitute applied | {subst} |
| Strongest evidence-based reconstruction | {recon} |
| Confidence tier | {tier} |
| Competing values | {competing} |
| Product marking | {marking} |
| Visual and audio impact | {impact} |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | {owner_q} |
| Agent recommendation | {rec} |
| Status | {status} |
| Owner decision and date | (filled only from the Decision Log) |
"""


def one_line(s):
    return re.sub(r'\s+', ' ', str(s or '')).replace('|', '/').strip()


def make_register(row, kind):
    sid = row['id']
    title = one_line(row.get('_title') or sid)
    text = one_line(row.get('reason') or row.get('note') or 'not recorded')
    where = one_line(row.get('where') or 'not recorded')
    cat = {'print-only': 'secondary only', 'viewer-only': 'evidence missing / rights', 'unusable': 'evidence missing / unreadable'}.get(kind, 'evidence missing / blocked')
    owner_q = {'print-only': 'Owner decides whether to purchase or borrow the print work (billing and loans are owner-only acts)',
               'viewer-only': 'Owner decides whether to ask the holder for permission beyond viewing (sending a permission request is an owner-only act)'}.get(kind, 'none (work continues)')
    return {'id': MARK + sid, 'title': ('Library source %s (%s): %s' % (sid, kind, title))[:160], 'rids': ['R21'], 'cat': cat,
            'desc': one_line('Status row %s (%s). Where: %s. Record: %s' % (sid, kind, where, text))[:700],
            'why': 'Not literal-100%% blocked by the record of the event: the source exists; the library row is %s as stated (Law cl.3, cl.4).' % kind,
            'searched': 'GOVERNANCE/library/status*.json, acquired*.json, candidates.json, figures-ledger.json as read by %s' % SCRIPT_NOTE,
            'subst': 'None (no datum is taken from this source until it is acquired and read)',
            'recon': 'Re-attempt or acquire lawfully, record the exact passages, then update the status row',
            'tier': 'plausible-procedural', 'competing': '-', 'marking': 'Source row flagged in the source catalog with its status',
            'impact': 'Source availability only; no direct visual impact', 'owner_q': owner_q, 'rec': '', 'status': 'open'}


# ---------------------------------------------------------------------------------------------------------------- main
def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=DEFAULT_ROOT)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args(argv)
    root = os.path.abspath(a.root)
    gov = os.path.join(root, 'docs', 'battle-theatre', 'GOVERNANCE')
    libdir = os.path.join(gov, 'library')
    runner = load_runner()
    shim = Shim()
    ids = read(os.path.join(HERE, 'gates', 'lib', 'library_ids.json'))
    lst = read(os.path.join(HERE, 'gates', 'lib', 'acquisition_list.json'))

    status_path = os.path.join(libdir, 'status.json')
    sdoc = read(status_path)
    rows = sdoc['sources']
    own = {r['id']: r for r in rows}
    merged, _ = runner.load_status(shim, libdir)
    acquired, blocked = runner.load_acquired(shim, libdir, ids, set(merged))
    summary = {'rows_added': [], 'rows_enriched': {}, 'register_added': [], 'ingested_rows_written': [], 'not_recorded': {}}

    def add_row(r):
        rows.append(r)
        own[r['id']] = r
        merged[r['id']] = dict(r, _files=['status.json'], _words={'status.json': r.get('status')}, _text=' '.join(str(r.get(k, '')) for k in ('title', 'where', 'note', 'reason')), _title=r.get('title', r['id']))
        summary['rows_added'].append({'id': r['id'], 'status': r['status']})

    def enrich(sid, key, val):
        """Set a key on the status.json row of sid (a supplement row when the id lives only in status_2/3); never overwrite a non-empty value of any file."""
        cur = merged.get(sid, {}).get(key)
        if cur not in (None, '', [], {}):
            return False
        if sid not in own:
            own[sid] = {'id': sid, 'supplement': 'keys added by ' + SCRIPT_NOTE + '; status word and reason live in status_2.json / status_3.json'}
            rows.append(own[sid])
        own[sid][key] = val
        merged.setdefault(sid, {})[key] = val
        summary['rows_enriched'].setdefault(sid, []).append(key)
        return True

    # ---- 1. acquisition entries that no status row reaches
    known = set(merged)
    for e in acquired:
        sid = e['id']
        if not sid or e.get('status_id') in known or sid in known:
            continue
        it = e.get('entry') or {}
        base = {'id': sid, 'title': it.get('title') or it.get('name') or sid, 'where': it.get('url') or it.get('where') or e['ledger']}
        if e.get('candidate'):
            base.update(status='scheduled', reason='candidate probed %s (candidates.json); no acquisition record exists for it: it was found, not fetched' % (e.get('date') or 'not recorded'),
                        not_recorded=['next_action', 'queue_entry'])
        elif e.get('figures'):
            base.update(title=it.get('title') or sid, where=it.get('where') or e['ledger'], status='scheduled',
                        reason=one_line('figures-ledger entry accessed %s: %s' % (it.get('accessed') or 'not recorded', it.get('how_read') or 'how read: not recorded'))[:500],
                        not_recorded=['sha256 (no file hash exists)', 'next_action', 'queue_entry'])
        else:
            hashes = [e.get('sha'), it.get('text_sha256'), it.get('sha256')]
            state, why = verify(root, e.get('local_path'), hashes)
            if state == 'ingested':
                base.update(status='ingested', reason='ledger %s: %s; acquired %s' % (e['ledger'], why, e.get('date') or 'not recorded'))
                summary['ingested_rows_written'].append(sid)
            else:
                base.update(status='scheduled', reason='ledger %s records the entry (acquired %s) but it cannot be verified here: %s' % (e['ledger'], e.get('date') or 'not recorded', why),
                            not_recorded=['next_action', 'queue_entry'])
        add_row(base)
        known.add(sid)

    # ---- 2. works named by a recorded decision (decision_sources)
    for ds in lst.get('decision_sources') or []:
        mp = os.path.join(root, *ds['registry'].split('/'))
        if not os.path.isfile(mp):
            continue
        med = read(mp)
        for sid in sorted(med.get('sources') or {}):
            if not any(sid.startswith(p) for p in ds['id_prefixes']) or sid in known:
                continue
            m = med['sources'][sid]
            main_f = (m.get('files') or {}).get('main') or {}
            state, why = verify(root, main_f.get('path'), [main_f.get('sha256')])
            base = {'id': sid, 'title': m.get('title') or sid, 'where': m.get('origin') or 'medical/sources.json'}
            if state == 'ingested':
                base.update(status='ingested', reason='%s (%s); rights: %s' % (why, ds['decision'], one_line(m.get('rights')) or 'not recorded'))
                summary['ingested_rows_written'].append(sid)
            else:
                base.update(status='scheduled', reason='medical/sources.json names the work (%s) but it cannot be verified here: %s' % (ds['decision'], why), not_recorded=['next_action', 'queue_entry'])
            add_row(base)
            known.add(sid)

    # ---- 3. register entries and record fields for blocked / print-only / viewer-only / unusable / bulk / partial rows
    reg_dir = os.path.join(gov, 'register')
    idx_path = os.path.join(gov, 'register_index.json')
    idx = read(idx_path)
    have_reg = {e['id'] for e in idx}
    new_reg = []

    def ensure_register(sid, kind):
        rid = MARK + sid
        if rid not in have_reg:
            e = make_register(merged[sid], kind)
            new_reg.append(e)
            have_reg.add(rid)
            summary['register_added'].append(rid)
        return rid

    ledger_blocked = [(b['ledger'], b['entry']) for b in blocked]
    for sid in sorted(merged):
        row = merged[sid]
        word = row.get('status')
        text = row.get('_text', '')
        kind = None
        if word in ('blocked', 'blocked-to-prior-research'):
            kind = 'blocked'
        elif word in ('print-only', 'viewer-only', 'unusable'):
            kind = word
        elif word == 'targeted-lookup-only':
            kind = 'blocked'
        elif word == 'partial':
            rem = row.get('remainder')
            if not isinstance(rem, dict) or rem.get('status') not in ('scheduled', 'blocked'):
                enrich(sid, 'remainder', {'status': 'scheduled', 'reason': one_line(row.get('reason') or row.get('note')) or 'not recorded',
                                          'not_recorded': ['next_action', 'queue_entry']})
            continue
        else:
            if word == 'ingested' and sid.startswith('OR-27-') and not isinstance(row.get('second_witness'), dict):
                for lg, b in ledger_blocked:
                    src = str(b.get('source', ''))
                    m = DATE.search(str(b.get('reason', '')))
                    if 'babel.hathitrust.org' in src and m:
                        enrich(sid, 'second_witness', {'status': 'unreachable', 'host': 'babel.hathitrust.org', 'date': m.group(1), 'result': one_line(b['reason']) + ' (%s)' % lg})
                        break
            continue
        if row.get('register_ids') or row.get('register_id'):
            rid = None
        else:
            rid = ensure_register(sid, kind)
            if word == 'targeted-lookup-only':
                rem = dict(row.get('remainder') or {})
                rem.setdefault('status', 'blocked')
                rem.setdefault('reason', one_line(row.get('note') or row.get('reason')))
                rem.setdefault('register_ids', [rid])
                enrich(sid, 'remainder', rem)
            else:
                enrich(sid, 'register_ids', [rid])
        if word == 'targeted-lookup-only' and not (row.get('remainder') or {}).get('register_ids'):
            rid = rid or MARK + sid
            if rid in have_reg:
                rem = dict(row.get('remainder') or {})
                rem.setdefault('status', 'blocked')
                rem.setdefault('reason', one_line(row.get('note') or row.get('reason')))
                rem.setdefault('register_ids', [rid])
                enrich(sid, 'remainder', rem)
        if kind == 'print-only':
            enrich(sid, 'owner_step', 'Owner decides whether to purchase or borrow the print work (an owner act); until then the work is cited only, with no digital copy ingested')
            if not re.search(r'print', text, re.I):
                if sid in own and 'print-only work' not in str(own[sid].get('note', '')):
                    own[sid]['note'] = one_line((own[sid].get('note') or '') + '; print-only work: no digital copy acquired')
                    summary['rows_enriched'].setdefault(sid, []).append('note')
        elif kind == 'viewer-only':
            enrich(sid, 'owner_step', 'Owner decides whether to ask the holder for permission beyond viewing (sending a permission request is an owner act)')
            summary['not_recorded'].setdefault(sid, []).append('terms_read (host, locator, date, what the terms permit): no ledger records the terms read')
        elif kind == 'unusable':
            led = next((b for lg, b in ledger_blocked if b.get('id') == sid), None)
            dm = DATE.search(str(row.get('reason', ''))) or DATE.search(str((led or {}).get('reason', '')))
            if led and dm and led.get('url') and led.get('reason'):
                enrich(sid, 'failed_read', {'tested': led['url'], 'result': one_line(led['reason']), 'date': dm.group(1)})
            else:
                summary['not_recorded'].setdefault(sid, []).append('failed_read (what was tested, the result, the date)')
        elif kind == 'blocked' and not row.get('failed_lookup') and not row.get('failed_lookups'):
            fl = []
            hosts = {h.lower() for h in HOSTRE.findall(' '.join(str(row.get(k, '')) for k in ('where', 'note', 'reason')))}
            for lg, b in ledger_blocked:
                bh = {h.lower() for h in HOSTRE.findall(str(b.get('source', '')) + ' ' + str(b.get('url', '')))}
                dm = DATE.search(str(b.get('reason', '')))
                direct = b.get('id') == sid
                if (direct or (hosts & bh)) and dm and b.get('reason'):
                    if direct and b.get('url'):
                        h = (HOSTRE.findall(str(b['url'])) or [None])[0]
                        loc = re.sub(r'^https?://[^/]+', '', str(b['url'])) or '/'
                    else:
                        h = sorted(hosts & bh)[0]
                        loc = '/' if 'root' in str(b.get('reason', '')).lower() else None
                    if h and loc:
                        fl.append({'host': h, 'locator': loc, 'date': dm.group(1), 'response': one_line(b['reason']) + ' (%s)' % lg})
            if fl:
                enrich(sid, 'failed_lookup', fl)
            else:
                summary['not_recorded'].setdefault(sid, []).append('failed_lookup (host, locator, date, response): no ledger record gives all four')

    # ---- write
    if a.dry_run:
        print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in summary.items()}, indent=1)[:1500])
        return 0
    if new_reg:
        for e in new_reg:
            body = REG_TEMPLATE.format(id=e['id'], title=e['title'], rids=', '.join(e['rids']), cat=e['cat'], desc=e['desc'], why=e['why'], searched=e['searched'], subst=e['subst'],
                                       recon=e['recon'], tier=e['tier'], competing=e['competing'], marking=e['marking'], impact=e['impact'],
                                       owner_q=e['owner_q'] or 'none (work continues)', rec=e['rec'] or '-', status=e['status'])
            with open(os.path.join(reg_dir, e['id'] + '.md'), 'w', encoding='utf-8', newline='\n') as f:
                f.write(body)
        idx.extend(new_reg)
        dump(idx_path, idx)
    if summary['rows_added'] or summary['rows_enriched']:
        dump(status_path, sdoc, ascii_only=True)
    out = os.path.join(root, 'tmp', 'q25')
    os.makedirs(out, exist_ok=True)
    sp = os.path.join(out, 'library_status_fill_summary.json')
    if os.path.isfile(sp) and not (summary['rows_added'] or summary['rows_enriched'] or summary['register_added']):
        print('no change (idempotent run); summary of the first run kept at', sp)
        return 0
    dump(sp, {'script': SCRIPT_NOTE, 'rows_added': len(summary['rows_added']), 'ingested_rows_written': len(summary['ingested_rows_written']),
              'register_entries_added': len(summary['register_added']), 'rows_enriched': summary['rows_enriched'], 'register_added': summary['register_added'],
              'status_of_added_rows': summary['rows_added'], 'facts_not_recorded': summary['not_recorded']})
    print('rows added %d (ingested %d), rows enriched %d, register entries added %d' % (len(summary['rows_added']), len(summary['ingested_rows_written']), len(summary['rows_enriched']), len(summary['register_added'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
