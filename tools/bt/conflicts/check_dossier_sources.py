#!/usr/bin/env python3
"""Check that the ledger SOURCES.md holds every source the 47 dossiers cite.

    python3 -I tools/bt/conflicts/check_dossier_sources.py [--json] [--list]        exit 1 when a cited source has no row in the ledger

What a dossier cites and what the ledger must hold for it (every rule reads the dossier text, nothing is assumed):
  1. section 5, the candidate passages: the bold source id of each passage, and every Official Records record id [OR27-n-Rnnn]: a ledger row that has a local text.
  2. anywhere in the dossier: every Official Records record id (OR27-n-Rnnn, OR27-3-Dnnnn): the ledger row OR27-n.
  3. section 6, the sources worth acquiring: every key of the table: a ledger row (section 9 planned, section 10 acquired, or a source already local).
  4. section 1, the register record: every source key the PDF row prints (EPP, SS1, W-D1 ...): a ledger lead row (PDF-*) that names it.
  5. section 4, the shards: every "source_id" that a quoted shard line names: a ledger row, or a spelling of one (ALIASES), or a record that has no text to quote (NO_TEXT).
`NO_TEXT` and `ALIASES` below each carry the reason; an id that is in none of the three places is reported and the check fails: add it with add_source.py (a local text) or
decide it here with its reason. Run it after build_dossiers.py; write_ready.py runs it too.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L

L.utf8_stdout()

# spellings of a ledger id that the shards use (shard id -> ledger id)
ALIASES = {
    'OR-27-1': 'OR27-1', 'OR27-pt1': 'OR27-1',
    'WEB-F-161': 'NPS-CONFEDERATE-COMMANDERS',          # the shard's name of the NPS page saved as tmp/library/web/retry/F-161
}
# ids that name something with no text to quote: a catalogue record, a saved page outside the library; each with its reason
NO_TEXT = {
    'NPS-WEB-LEISTER-FARM': 'NPS web page "Lydia Leister Farm: Meade\'s Headquarters", saved under tmp/fence-3/web (scratch of another workstream, outside tmp/library, so add_source.py refuses it); the fence-3 shard cites it for the state of the Leister house (R14.S-059), not for a value of the 47',
}
NO_TEXT_PREFIX = {
    'LOC-': 'a Library of Congress catalogue record (the photo-match shards identify photographs by it); the ledger holds texts and a catalogue record has none to quote',
}
# labels that stand for several ledger rows
LABELS = {'OR27': ('OR27-1', 'OR27-2', 'OR27-3')}


def sections(text):
    out = {}
    ms = list(re.finditer(r'^## (\d+)\. ', text, re.M))
    for i, m in enumerate(ms):
        out[int(m.group(1))] = text[m.end(): ms[i + 1].start() if i + 1 < len(ms) else len(text)]
    return out


def pdf_key_rows(ledger):
    rows = {}
    for sid, r in ledger.items():
        if sid.startswith('PDF-'):
            rows[sid] = (r.get('title', '') + ' ' + r.get('notes', ''))
    return rows


def key_named(key, rows):
    pat = re.compile(r'(?<![A-Za-z0-9-])' + re.escape(key) + r'(?![A-Za-z0-9-])')
    return [sid for sid, t in rows.items() if pat.search(t)]


def check():
    ctx = L.new_ctx()
    led = {k: v for k, v in ctx.ledger().items() if k != '__duplicates__'}
    pdf_rows = pdf_key_rows(led)
    cited = {}          # id -> {rule: set(cids)}
    problems, accepted = [], {}

    def note(sid, rule, cid):
        cited.setdefault(sid, {}).setdefault(rule, set()).add(cid)

    for cid in L.IDS:
        p = os.path.join(L.DOSSIERS, cid + '.md')
        if not os.path.exists(p):
            problems.append('%s: the dossier does not exist' % cid)
            continue
        text = L.read_text(p)
        sec = sections(text)
        for line in sec.get(5, '').splitlines():
            m = re.match(r'^- \*\*([^*]+)\*\*', line)
            if m:
                sid = m.group(1).split(' ')[0]
                if sid != 'OR27':
                    note(sid, 'passage', cid)
        for m in re.finditer(r'\b(OR27-(\d))-[RD]\d+', text):
            note(m.group(1), 'official_records_id', cid)
        for line in sec.get(6, '').splitlines():
            if line.startswith('| ') and not line.startswith('| key') and not line.startswith('|---'):
                note(line.split('|')[1].strip(), 'to_acquire', cid)
        for k in L.keys_in_text(L.register()[cid]['text']):
            note('PDF key ' + k, 'pdf_key', cid)
        for m in re.finditer(r'"source_id":[ \t]*\\?"([A-Za-z0-9][A-Za-z0-9._-]*)\\?"', sec.get(4, '')):      # a snippet cut at 200 characters has no closing quote: not a whole id, not read
            note(m.group(1), 'shard_source_id', cid)

    for sid, rules in sorted(cited.items()):
        where = ', '.join('%s: %s' % (r, ' '.join(sorted(c)[:4]) + (' ...' if len(c) > 4 else '')) for r, c in sorted(rules.items()))
        if sid.startswith('PDF key '):
            key = sid[8:]
            if not key_named(key, pdf_rows):
                problems.append('PDF source key %s (%s) is named by no PDF-* lead row of the ledger' % (key, where))
            continue
        if sid in led:
            if 'passage' in rules and (led[sid].get('class') == 'lead' or led[sid].get('text') in (None, '', '-')):
                problems.append('%s is cited as a passage source but the ledger row has no local text or is a lead (%s)' % (sid, where))
            continue
        if sid in ALIASES:
            if ALIASES[sid] in led:
                accepted[sid] = 'spelling of ledger row %s' % ALIASES[sid]
            else:
                problems.append('%s is declared a spelling of %s, which is not in the ledger (%s)' % (sid, ALIASES[sid], where))
            continue
        if sid in LABELS:
            if all(x in led for x in LABELS[sid]):
                accepted[sid] = 'a label of the ledger rows ' + ', '.join(LABELS[sid])
            else:
                problems.append('%s is a label of %s, one of which is not in the ledger' % (sid, ', '.join(LABELS[sid])))
            continue
        if sid in NO_TEXT:
            accepted[sid] = 'no text: ' + NO_TEXT[sid]
            continue
        hit = [pre for pre in NO_TEXT_PREFIX if sid.startswith(pre)]
        if hit and set(rules) == {'shard_source_id'}:
            accepted[sid] = 'no text: ' + NO_TEXT_PREFIX[hit[0]]
            continue
        problems.append('%s is cited by the dossiers (%s) and has no row in SOURCES.md' % (sid, where))
    return {'dossiers': len(L.IDS), 'distinct_ids_cited': len(cited), 'ledger_rows': len(led), 'accepted_without_row': accepted, 'problems': problems}


def main(argv):
    res = check()
    if '--json' in argv:
        print(json.dumps(res, indent=1, ensure_ascii=False))
    else:
        print('dossiers %d, distinct sources and keys cited %d, ledger rows %d, %d accepted without a row of their own, %d problems' % (
            res['dossiers'], res['distinct_ids_cited'], res['ledger_rows'], len(res['accepted_without_row']), len(res['problems'])))
        for sid, why in sorted(res['accepted_without_row'].items()):
            print('  accepted  %s: %s' % (sid, why))
        for p in res['problems']:
            print('  PROBLEM   ' + p)
    return 1 if res['problems'] else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
