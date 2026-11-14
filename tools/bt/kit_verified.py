"""Verified tables of the kit evidence pass: the order of battle (gate Q01, Q20) and the batteries (gate Q14).

    python -I tools/bt/kit_verified.py build [--ev-dir DIR] [--out-dir DIR]     writes kit/verified_oob.json and kit/verified_batteries.json
Built from the accepted evidence lines (kit_evidence_check.py: quote re-matched in the local source text) and from groups.json; never from the kit tables, which may still hold the PDF's values.
Every unit of groups.json has an entry; a unit or battery for which no non-lead source was found is listed as unverified and nothing is filled in. Deterministic: no clock.
Field status: verified (at least one documented line), inferred (only inferred lines), conflict (alternatives of a conflict set, none chosen), gap (a gap line and no evidence), unverified.
Unit status: verified when roster, commander and strength (the fields of its required set among them) are verified; partly when any field has evidence; unverified otherwise."""
import argparse, collections, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit_evidence_lib as K
import kit_evidence_check as C

KIT = os.path.join(K.BT, 'kit')
SCHEMA_OOB, SCHEMA_BAT = 'kit-verified-oob-1', 'kit-verified-batteries-1'
CORE = ('roster', 'commander', 'strength')


def cite_of(o):
    d = {'id': o['id'], 'source_id': o.get('source_id'), 'part': o.get('part'), 'report_id': o.get('report_id'), 'printed_page': o.get('printed_page'), 'offset': o.get('offset')}
    return {k: v for k, v in d.items() if v is not None}


def cas_total(v):
    """The aggregate loss of a casualties value, or None when the line does not give it.
    The printed aggregate when there is one; otherwise the sum of the three kinds when every kind is stated, as officers and enlisted men
    or as a kind total (a state volume that prints 11 killed, 62 wounded, 159 missing). A kind left blank, or half stated, makes the aggregate
    unknown: a partial sum is never presented as the total, and unknown is never 0."""
    if v.get('total') is not None:
        return v['total']
    parts = []
    for k in ('killed', 'wounded', 'missing'):
        c = v.get(k) or {}
        if c.get('total') is not None:
            parts.append(c['total'])
        elif c.get('officers') is not None and c.get('enlisted') is not None:
            parts.append(c['officers'] + c['enlisted'])
        else:
            for cb in v.get('combined') or []:                  # a statement of all three kinds together (officers and men lost) is the aggregate
                if set(cb['kinds']) == {'killed', 'wounded', 'missing'}:
                    return cb['total']
            return None
    return sum(parts)


def basis_text(field, basis, extra, lines):
    meaning = K.BASES[field].get(basis, basis)
    dates = sorted({l.get('as_of') for l in lines if l.get('as_of')})
    reports = sorted({l.get('report_id') for l in lines if l.get('report_id')})
    return '%s; %s%s; %d line%s%s' % (meaning, extra + '; ' if extra else '', ('as of ' + ' to '.join([dates[0], dates[-1]] if len(dates) > 1 else dates)) if dates else 'date not stated', len(lines), '' if len(lines) == 1 else 's', (' (' + ', '.join(reports[:6]) + ')') if reports else '')


def field_status(lines, gap):
    if any(o.get('conflict') for o in lines):
        return 'conflict'
    if any(o['tier'] == 'documented' for o in lines):
        return 'verified'
    if lines:
        return 'inferred'
    return 'gap' if gap else 'unverified'


def tier_of(lines):
    return 'documented' if lines and all(o['tier'] == 'documented' for o in lines) else 'inferred'


def build(ev_dir=K.EV, out_dir=KIT, write=True):
    gdoc = K.groups_doc()
    lines_by_unit = collections.defaultdict(list)
    gaps_by = collections.defaultdict(list)
    extra_units, recon, issues = [], [], []
    inputs = {'groups_json_sha256_16': K.sha256_file(os.path.join(K.EV, 'groups.json'))[:16], 'evidence_files': {}}
    rejected = 0
    for g in gdoc['groups']:
        p = os.path.join(ev_dir, g['id'] + '.jsonl')
        if not os.path.exists(p):
            continue
        R = C.check_group(g['id'], p)
        inputs['evidence_files'][g['id']] = K.sha256_file(p)[:16]
        rejected += len(R.rejected)
        for lid in R.accepted:
            o = R.lines[lid]
            if o.get('unit_id') is None:
                extra_units.append({'id': o['id'], 'unit_name': o.get('unit_name'), 'parent_unit_id': o.get('parent_unit_id'), 'field': o['field'], 'value': o['value'], 'tier': o['tier'], 'cite': cite_of(o), 'quote': o.get('quote')})
            elif o['tier'] == 'plausible-procedural':
                recon.append({'id': o['id'], 'unit_id': o['unit_id'], 'field': o['field'], 'value': o['value'], 'note': o.get('note'), 'register_proposal': o.get('register_proposal')})
            else:
                lines_by_unit[o['unit_id']].append(o)
        for lid, o in R.lines.items():
            if o['type'] == 'gap' and lid not in R.rejected:
                for u in (o.get('unit_ids') if o.get('unit_ids') is not None else [o.get('unit_id')]):
                    for f in (o.get('fields') if o.get('fields') is not None else [o.get('field')]):
                        gaps_by[(u, f)].append({'id': o['id'], 'result': o['result'], 'searched': o['searched'], 'note': o.get('note'), 'register_proposal': o.get('register_proposal')})
    kit_art = json.load(open(os.path.join(KIT, 'artillery_batteries.json'), encoding='utf-8'))['batteries']
    units, bats, formations = collections.OrderedDict(), collections.OrderedDict(), collections.OrderedDict()
    for g in gdoc['groups']:
        for e in g['units']:
            uid = e['unit_id']
            ls = lines_by_unit.get(uid, [])
            by = collections.defaultdict(list)
            for o in ls:
                by[o['field']].append(o)
            rec = collections.OrderedDict([('name', e['name']), ('army', e['army']), ('level', e['level']), ('arm', e.get('arm')), ('parent', e.get('parent')), ('group', g['id']), ('in_roster', e['in_roster']), ('kit_ids', [k['id'] for k in e.get('kit', [])]), ('required', e['required'])])
            st = {}
            for f in e['required']:
                st[f] = field_status(by.get(f, []), gaps_by.get((uid, f)))
            rec['fields'] = st
            core = [f for f in CORE if f in e['required']]
            if core and all(st[f] == 'verified' for f in core):
                rec['status'] = 'verified'
            elif any(st.get(f) in ('verified', 'inferred', 'conflict') for f in e['required']) or ls:
                rec['status'] = 'partly'
            else:
                rec['status'] = 'unverified'
            ro = by.get('roster', [])
            if ro:
                v = [o['value'] for o in ro]
                eng = sorted({x.get('engaged', 'not_stated') for x in v})
                rec['presence'] = {'engaged': eng[0] if len(eng) == 1 else 'partly' if set(eng) <= {'yes', 'partly'} else 'conflict', 'designations': sorted({x['designation'] for x in v}), 'tier': tier_of(ro), 'evidence_ids': [o['id'] for o in ro], 'cite': [cite_of(o) for o in ro[:3]]}
            cm = sorted(by.get('commander', []), key=lambda o: (o['value']['order'], (o.get('conflict') or {}).get('alt', ''), o['id']))
            if cm:
                rec['commanders'] = [dict({'order': o['value']['order'], 'name': o['value']['name'], 'rank': o['value']['rank'], 'tier': o['tier'], 'evidence_ids': [o['id']], 'cite': cite_of(o)}, **{k: o['value'][k] for k in ('rank_printed', 'role', 'change', 'from', 'to') if o['value'].get(k) is not None},
                                      **({'alt': o['conflict']['alt']} if o.get('conflict') else {})) for o in cm]
            sg = by.get('strength', [])
            if sg:
                figs = [dict({'basis': o['basis'], 'men': o['value']['men'], 'low': o['value']['low'], 'high': o['value']['high'], 'as_of': o.get('as_of'), 'tier': o['tier'], 'evidence_ids': [o['id']], 'cite': cite_of(o)},
                             **{k: o['value'][k] for k in ('officers', 'enlisted', 'companies', 'scope') if o['value'].get(k) is not None}, **({'alt': o['conflict']['alt']} if o.get('conflict') else {})) for o in sorted(sg, key=lambda x: (x['basis'], x.get('as_of') or '', x['id']))]
                ranges = collections.OrderedDict()
                for key in sorted({(o['basis'], o['value']['men']) for o in sg}):
                    ks_ = [o for o in sg if (o['basis'], o['value']['men']) == key]
                    best = [o for o in ks_ if o['tier'] == 'documented'] or ks_
                    by_date = collections.OrderedDict()               # figures of one kind at different moments (men marching in the morning, men left in the evening) are not one range
                    for o in sorted(best, key=lambda x: (x.get('as_of') or '', x['id'])):
                        r = by_date.setdefault(o.get('as_of') or 'undated', {'low': o['value']['low'], 'high': o['value']['high'], 'lines': 0})
                        r['low'], r['high'], r['lines'] = min(r['low'], o['value']['low']), max(r['high'], o['value']['high']), r['lines'] + 1
                    ranges['%s|%s' % key] = {'low': min(o['value']['low'] for o in best), 'high': max(o['value']['high'] for o in best), 'tier': tier_of(best), 'lines': len(best), 'basis': basis_text('strength', key[0], key[1].replace('_', ' '), best),
                                             'by_as_of': by_date, 'spans_dates': len(by_date) > 1}
                rec['strength'] = {'figures': figs, 'ranges': ranges}
            cs = by.get('casualties', [])
            if cs:
                tot = lambda o: cas_total(o['value'])
                figs = [dict({'basis': o['basis'], 'period': o['value']['period'], 'killed': o['value']['killed'], 'wounded': o['value']['wounded'], 'missing': o['value']['missing'], 'total': tot(o), 'tier': o['tier'], 'evidence_ids': [o['id']], 'cite': cite_of(o)},
                             **({'combined': o['value']['combined']} if o['value'].get('combined') else {})) for o in sorted(cs, key=lambda x: (x['basis'], x['id']))]
                ranges = collections.OrderedDict()
                for key in sorted({(o['basis'], o['value']['period']) for o in cs}):
                    ks_ = [o for o in cs if (o['basis'], o['value']['period']) == key and tot(o) is not None]   # a line that gives no aggregate makes no range
                    if ks_:
                        ranges['%s|%s' % key] = {'total': {'low': min(tot(o) for o in ks_), 'high': max(tot(o) for o in ks_)}, 'tier': tier_of(ks_), 'lines': len(ks_), 'basis': basis_text('casualties', key[0], key[1], ks_)}
                rec['casualties'] = {'figures': figs, 'ranges': ranges}
            for f in ('officer', 'horses', 'ammunition', 'detachment'):
                if by.get(f):
                    rec[f + ('s' if f == 'officer' else '')] = [{'value': o['value'], 'basis': o['basis'], 'as_of': o.get('as_of'), 'tier': o['tier'], 'evidence_ids': [o['id']], 'cite': cite_of(o)} for o in sorted(by[f], key=lambda x: x['id'])]
            for f, key in (('arms', 'arms'), ('dress', 'dress')):
                if by.get(f):
                    d = collections.OrderedDict()
                    for o in sorted(by[f], key=lambda x: (x['kit_field'], x['id'])):
                        d.setdefault(o['kit_field'], []).append({'items': o['value'].get('weapons') or o['value'].get('items'), 'basis': o['basis'], 'as_of': o.get('as_of'), 'tier': o['tier'], 'evidence_ids': [o['id']], 'cite': cite_of(o)})
                    rec[key] = d
            sets = collections.defaultdict(list)
            for o in ls:
                if o.get('conflict'):
                    sets[o['conflict']['key']].append(o)
            if sets:
                rec['conflicts'] = [{'key': k, 'field': v[0]['field'], 'alternatives': [{'alt': o['conflict']['alt'], 'value': o['value'], 'tier': o['tier'], 'evidence_ids': [o['id']], 'cite': cite_of(o)} for o in sorted(v, key=lambda x: x['conflict']['alt'])]} for k, v in sorted(sets.items())]
            gl = [dict(x, field=f) for (u, f), xs in sorted(gaps_by.items()) if u == uid for x in xs]
            if gl:
                rec['gaps'] = gl
            units[uid] = rec
            gl_lines = by.get('guns', [])
            if e.get('arm') == 'artillery' and (e['level'] in ('battery', 'artillery_battalion', 'artillery_brigade', 'artillery_group') or uid.startswith(('US.ART.', 'CS.ART.'))):
                b = collections.OrderedDict([('name', e['name']), ('army', e['army']), ('level', e['level']), ('parent', e.get('parent')), ('group', g['id']), ('kit_ids', [k['id'] for k in e.get('kit', [])])])
                cards = [kit_art[k['id']] for k in e.get('kit', []) if k['id'] in kit_art] or ([kit_art[uid]] if uid in kit_art else [])
                if cards:
                    b['kit_card'] = [{'id': c['id'], 'guns_printed': c['guns_printed'], 'guns_status': c['guns_status'], 'tier': c['tier'], 'weak_source': c['weak_source'], 'source_keys': c['source_keys']} for c in cards]
                b['status'] = field_status(gl_lines, gaps_by.get((uid, 'guns')))
                figs = [{'as_of': o.get('as_of'), 'state': o['value']['state'], 'scope': o['value'].get('scope', 'battery'), 'pieces': o['value']['pieces'], 'total': o['value'].get('total'), 'tier': o['tier'], 'evidence_ids': [o['id']], 'cite': cite_of(o),
                         **({'alt': o['conflict']['alt']} if o.get('conflict') else {})} for o in sorted(gl_lines, key=lambda x: (x.get('as_of') or '', x['value']['state'], x['id']))]
                b['guns'] = figs
                by_date = collections.OrderedDict()
                for fg in figs:
                    if fg['total'] is not None:
                        r = by_date.setdefault(fg['as_of'] or 'undated', {}).setdefault(fg['state'], {'low': fg['total'], 'high': fg['total'], 'lines': 0})
                        r['low'], r['high'], r['lines'] = min(r['low'], fg['total']), max(r['high'], fg['total']), r['lines'] + 1
                b['range_by_date'] = by_date
                b['unverified'] = b['status'] in ('unverified', 'gap')
                (formations if e['level'] != 'battery' and not uid.startswith(('US.ART.', 'CS.ART.')) else bats)[uid] = b
    counts = collections.Counter(u['status'] for u in units.values())
    n_ev = sum(len(v) for v in lines_by_unit.values())
    oob = collections.OrderedDict([('schema', SCHEMA_OOB), ('_doc', 'Verified order of battle: what the Official Records and the printed state volumes say, per unit, with tier, citation ids and the basis of every range. A unit without a non-lead source is unverified; nothing is filled in. Evidence ids resolve in kit/evidence_index.json.'),
        ('rules', {'ranges': 'low is the lowest and high the highest figure of one kind (basis and men) among its documented lines (inferred lines only when no documented line exists); kinds are never mixed', 'casualty_total': 'the printed aggregate, else the sum of the three kinds when each is stated, else null (never a partial sum, never 0); a basis whose lines give no aggregate has figures and no range', 'status': 'verified = roster, commander and strength each verified; partly = some evidence; unverified = none',
                   'comparison': 'proposed for gate Q01: a layer figure passes when it lies inside the range of one kind of its unit; a unit with no verified range is reported unverified (neither pass nor failure). '
                                 'A range with spans_dates true holds figures dated differently (by_as_of gives each date its own low and high): a gate that knows the date of the figure compares it with the by_as_of entry that holds that date, and never passes it on the wide span',
                   'strength_by_as_of': 'by_as_of: each as_of of the lines of one kind with its own low, high and number of lines (undated lines under "undated"); spans_dates is true when there is more than one'}),
        ('inputs', inputs), ('totals', dict(units=len(units), evidence_lines_used=n_ev, rejected_lines=rejected, **{k: counts[k] for k in ('verified', 'partly', 'unverified')})), ('units', units), ('roster_additions', extra_units), ('reconstructions_not_verified', recon)])
    bc = collections.Counter(b['status'] for b in bats.values())
    bat = collections.OrderedDict([('schema', SCHEMA_BAT), ('_doc', 'Verified batteries: guns by date and state as the record states them, with tier and citation ids. A battery without a non-lead source is unverified. kit_card shows what the kit tables hold now, for comparison only.'),
        ('rules', {'comparison': 'proposed for gate Q14: a drawn battery passes when its gun count equals a total of its figures for the date asked (state present or engaged), or the battery is unverified', 'status': 'verified, inferred, conflict, gap or unverified (as for the order of battle)'}),
        ('inputs', inputs), ('totals', dict(batteries=len(bats), formations=len(formations), **{k: bc[k] for k in ('verified', 'inferred', 'conflict', 'gap', 'unverified')})), ('batteries', bats), ('formations', formations)])
    if write:
        os.makedirs(out_dir, exist_ok=True)
        for name, doc in (('verified_oob.json', oob), ('verified_batteries.json', bat)):
            with open(os.path.join(out_dir, name), 'w', encoding='utf-8', newline='\n') as f:
                json.dump(doc, f, ensure_ascii=False, indent=1)
                f.write('\n')
    return oob, bat


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['build'])
    ap.add_argument('--ev-dir', default=K.EV)
    ap.add_argument('--out-dir', default=KIT)
    a = ap.parse_args(argv)
    oob, bat = build(a.ev_dir, a.out_dir)
    print('verified_oob: %s' % json.dumps(oob['totals']))
    print('verified_batteries: %s' % json.dumps(bat['totals']))
    return 0


if __name__ == '__main__':
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    sys.exit(main(sys.argv[1:]))
