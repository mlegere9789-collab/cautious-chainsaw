#!/usr/bin/env python3
"""Writes docs/battle-theatre/app/data/kit-crosswalk.json: for every leaf unit of the order of battle (history/units.json), which kit record (kit/*.json unit id) its figures take their per-figure
manifests from, or none (then the shell uses the default of its army and arm and says so). One source of truth for the shell (src/history/figures.mjs) and for tools/bt/check_figures.py.
Rules (nothing is guessed; every non-rule match is an alias with its evidence):
  infantry/regiment kit ids and brigade kit ids: tools/bt/kit_presence.py (its ALIAS table + unique-suffix rule); a regiment with no record of its own takes the record of its brigade when the brigade has one.
  cavalry: kit id 'US.CAV.<suffix>' / 'CS.CAV.<suffix>' for the history id suffix, plus the aliases below (same unit, different spelling).
  artillery: a battery whose normalised name equals the normalised name of a kit battery; otherwise none (the kit batteries inherit the artillery default and add only a flag/guidon field).
  PYTHONIOENCODING=utf-8 python tools/bt/kit_crosswalk.py"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import kit_presence as KP

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KITDIR = os.path.join(ROOT, 'docs', 'battle-theatre', 'kit')
OUT = os.environ.get('KIT_CROSSWALK_OUT') or os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'data', 'kit-crosswalk.json')
HIST = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json')
CAV_ALIAS = {
    'us-cav-3d-custer-1mi': ('US.CAV.1MICH', '1st Michigan Cavalry: MI/MICH spelling'), 'us-cav-3d-custer-5mi': ('US.CAV.5MICH', '5th Michigan Cavalry: MI/MICH spelling'),
    'us-cav-3d-custer-6mi': ('US.CAV.6MICH', '6th Michigan Cavalry: MI/MICH spelling'), 'us-cav-3d-custer-7mi': ('US.CAV.7MICH', '7th Michigan Cavalry: MI/MICH spelling'),
    'cs-cav-hampton-cobbslegion': ('CS.CAV.COBB', "Cobb's Legion"), 'cs-cav-hampton-jeffdavislegion': ('CS.CAV.JDAVIS', 'Jeff Davis Legion'), 'cs-cav-hampton-phillipslegion': ('CS.CAV.PHILLIPS', "Phillips Legion"),
    'cs-cav-jenkins-34vabn': ('CS.34VACAVBN', '34th Virginia Cavalry Battalion (kit id is spelled CS.34VACAVBN)'), 'cs-2c-early-35vacavalrybn': ('CS.CAV.35VABN', '35th Virginia Cavalry Battalion'),
}
STATE = [(r'new york', 'ny'), (r'massachusetts', 'ma'), (r'connecticut', 'ct'), (r'new hampshire', 'nh'), (r'pennsylvania', 'pa'), (r'rhode island', 'ri'), (r'maryland', 'md'), (r'new jersey', 'nj'), (r'\bw\.?\s?va\.?', 'wv'), (r'\bmaine\b', 'me'), (r'\bohio\b', 'oh'), (r'\bmichigan\b', 'mi')]


def norm_battery(s):
    t = s.lower().replace('’', '').replace("'", '').replace('independent', '')
    for pat, to in STATE:
        t = re.sub(pat, to, t)
    t = re.sub(r'(\d+)(st|nd|rd|th)\b', r'\1', t)
    return re.sub(r'[^a-z0-9]', '', t)


def main():
    hist = json.load(open(HIST, encoding='utf-8'))['units']
    by = {u['id']: u for u in hist}
    cu = json.load(open(os.path.join(KITDIR, 'cavalry_units.json'), encoding='utf-8'))['units']
    ab = json.load(open(os.path.join(KITDIR, 'artillery_batteries.json'), encoding='utf-8'))['units']
    ks = json.load(open(os.path.join(KITDIR, 'kit_specs.json'), encoding='utf-8'))['units']
    kit_by_norm = {}
    for kid, k in ab.items():
        kit_by_norm.setdefault(norm_battery(k['name']), []).append(kid)
    inv = {}
    for kid in ks:
        hid = KP.history_id(kid)
        if hid:
            inv.setdefault(hid, []).append(kid)
    out, counts = {}, {}
    def put(hid, kit, how, note=None):
        out[hid] = {'kit': kit, 'how': how, 'note': note}
        counts[how] = counts.get(how, 0) + 1
    for u in hist:
        if u['children'] or u.get('arm') is None:
            continue
        hid, arm = u['id'], u['arm']
        if arm == 'cavalry':
            if hid in CAV_ALIAS:
                k, why = CAV_ALIAS[hid]
                if k in cu or k in ks:
                    put(hid, k, 'alias', why); continue
            side = 'US' if u['army'] == 'US' else 'CS'
            k = '%s.CAV.%s' % (side, hid.split('-')[-1].upper())
            if k in cu:
                put(hid, k, 'rule', 'suffix of the history id'); continue
            put(hid, None, 'default', 'no cavalry kit record of that name'); continue
        if arm == 'artillery':
            c = kit_by_norm.get(norm_battery(u['name']), [])
            if len(c) == 1:
                put(hid, c[0], 'name', 'same normalised battery name'); continue
            put(hid, None, 'default', 'no kit battery of that name' if not c else 'several kit batteries of that name'); continue
        if hid in inv:
            if len(inv[hid]) == 1:
                put(hid, inv[hid][0], 'kit_presence', 'tools/bt/kit_presence.py crosswalk'); continue
            put(hid, None, 'default', 'several kit units resolve to this unit: %s' % inv[hid]); continue
        p = u.get('parent')                          # a regiment takes the record of its brigade when the brigade has one
        if p and p in inv and len(inv[p]) == 1 and by[p]['level'] == 'brigade':
            put(hid, inv[p][0], 'brigade', 'the record of its brigade %s' % p); continue
        put(hid, None, 'default', 'no kit record for this unit or its brigade')
    doc = {'_doc': 'Crosswalk of the history units to the kit specifications. kit: the kit unit id whose spec the unit’s figures use, or null (then the default of the unit’s army and arm, tier plausible-procedural). Never guessed: aliases carry their evidence.',
           'counts': dict(sorted(counts.items())), 'units': dict(sorted(out.items()))}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=0)
        f.write('\n')
    print('kit crosswalk: %d leaf units: %s -> %s' % (len(out), doc['counts'], OUT))


if __name__ == '__main__':
    main()
