#!/usr/bin/env python3
"""Gate Q23, marking check: "every non-documented item carries a render flag; no unmarked procedural content."

Defined by docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC.md (Q23.1 to Q23.8, U-14, U-24, X-28, A-26, A-52, DD-14, DD-22, DEC-006).
Command:  python3 tools/bt/gates/q23_marking.py [--root DIR] [--out DIR] [--layer-dump FILE] [--app-result FILE] [--no-write]
          (heavy: it builds the history layer and drives the app's overlay code in node; run it through tools/horde/bench.sh in the background. No network.)
Output:   docs/battle-theatre/GOVERNANCE/gate_results/Q23.json

Reading adopted for "render flag" (recorded, stricter where it can be): the product has no field named render_flag in app/src; the render-time flag that carries a tier into the engine is
the `tier` read through TIER_STYLE (glyph, outline pattern, colour) by `tierName`/`tierMark`. A datum is flagged when the product reads a tier from it; an explicit render_flag that disagrees with
that tier is FAIL; a statement from which the product reads no tier is an unmarked item (GATE-HOOKS.md: a `null` tier on content the viewer sees is an unmarked item).

Checks:
  Q23.1  census: every name of the plan's list of content classes is covered by a class of tools/bt/gates/content_classes.json; every folder of app/src is in a class or declared non-content;
         a class the product does not have is BLOCKED-INPUT (not in the product), never skipped.
  Q23.2  flag in data: for every datum class the product loads (the registry of Q02), every member has a tier that the product reads, and an explicit render_flag agrees with it.
  Q23.3  flag in the product: the style table (glyph, outline pattern and colour differ, never colour alone), the hooks (tierName, tierMark, tierMark.style), the overlay run with a recording
         canvas over every unit and every work, the code that shows the tier on cards and lists (static search), the register link of every non-documented unit, the declared marks of the figure
         choices. The picture part (frames) is NOT-RUN here: it needs a browser (tools/horde/bench.sh, app/tests/ui.spec.mjs) and a person looking at the frames (U-10).
  Q23.4  substitutes: the sound panel disclosure (DD-14), the motion bases, the register entries for audio, motion and textures.
  Q23.5  individual soldiers are marked plausible-procedural (EG-0001) in the register and in the overlay.
  Q23.6  night legibility: NOT-RUN (needs frames, Q10.6).
  Q23.7  register: every entry whose tier is not documented has a non-placeholder `marking` (the existing check, with the entry files that are not in the index).
  Q23.8  gaps visible: every open gap member has a register entry and a marker class; units that are not drawn have no map marker.
"""
import json
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'lib'))
import pq_common as pq  # noqa: E402
import datum_scan as ds  # noqa: E402
import q02_provenance as q02  # noqa: E402

GATE = 'Q23'
APP_SRC = 'docs/battle-theatre/app/src'


# ------------------------------------------------------------------------------------------------------------- Q23.1
def census(env, rec, cc):
    src = os.path.join(env.bt, 'app', 'src')
    spec_list = cc.get('spec_list') or []
    covered = {n: [c['id'] for c in cc['classes'] if n in c.get('spec_names', [])] for n in spec_list}
    missing_names = sorted(n for n, v in covered.items() if not v)
    modules = []
    for c in cc['classes']:
        modules += [m for m in c.get('modules', []) if not m.startswith('..')]
    non = cc.get('non_content') or {}
    dirs, uncovered = [], []
    if os.path.isdir(src):
        for name in sorted(os.listdir(src)):
            p = os.path.join(src, name)
            if os.path.isdir(p):
                dirs.append(name + '/')
                if not any(m == name + '/' or m.startswith(name + '/') for m in modules) and (name + '/') not in non:
                    uncovered.append(name + '/')
    ext_list = []
    ip = os.path.join(src, 'ext', 'index.mjs')
    if os.path.isfile(ip):
        ext_list = re.findall(r"^\s*'([^']+\.mjs)'", open(ip, encoding='utf-8').read(), re.M)
    ext_unc = [e for e in ext_list if not any(('ext/' + e).startswith(m) or m == 'ext/' for m in modules)]
    absent = []
    for c in cc['classes']:
        if c.get('present', True):
            for m in c.get('modules', []):
                if m.startswith('..'):
                    t = os.path.normpath(os.path.join(src, m))
                else:
                    t = os.path.join(src, m)
                if not os.path.exists(t) and not os.path.exists(t.rstrip('/')):
                    absent.append('%s: %s' % (c['id'], m))
    ev = {'spec_names': len(spec_list), 'spec_names_not_covered': missing_names, 'folders_of_app_src': dirs, 'folders_in_no_class': uncovered, 'ext_modules': ext_list, 'ext_modules_in_no_class': ext_unc,
          'module_paths_not_on_disk': absent, 'classes': len(cc['classes'])}
    bad = missing_names or uncovered or ext_unc or absent
    if not os.path.isdir(src):
        rec.blocked('Q23/Q23.1/census', 'docs/battle-theatre/app/src', 'the app code the census reads')
    elif bad:
        why = []
        if missing_names:
            why.append('%d name(s) of the plan\'s list are in no class' % len(missing_names))
        if uncovered or ext_unc:
            why.append('%d folder(s) or ext module(s) of app/src are in no class (%s)' % (len(uncovered) + len(ext_unc), ', '.join(uncovered + ext_unc)))
        if absent:
            why.append('%d module path(s) named by a class are not on disk' % len(absent))
        rec.item('Q23/Q23.1/census', 'FAIL', '; '.join(why), ev, check='Q23.1')
    else:
        rec.item('Q23/Q23.1/census', 'PASS', 'every name of the plan\'s list of content classes and every folder of app/src is in a class', ev, check='Q23.1')
    for c in cc['classes']:
        if not c.get('present', True):
            rec.item('Q23/Q23.1/class-%s' % c['id'], 'BLOCKED-INPUT', 'input missing: the product has no module for this class (%s): %s' % (c['label'], c.get('note', '')), {'class': c['id'], 'spec_names': c.get('spec_names')}, check='Q23.1')


# ------------------------------------------------------------------------------------------------------------- Q23.2
def flag_in_data(env, rec, sc, style_tiers):
    for cid in sorted(sc.classes):
        c = sc.classes[cid]
        ms = sc.members(cid)
        iid = 'Q23/Q23.2/%s' % cid
        if ms is None:
            rec.item(iid, 'BLOCKED-INPUT', 'input missing: %s' % sc.error(cid), {'class': cid}, check='Q23.2')
            continue
        if c.get('conflicts') or c.get('exempt') or c.get('register_entries'):
            rec.item(iid, 'N/A', 'not a content class of this check (%s)' % ('a conflict register' if c.get('conflicts') else ('exempt: ' + c['exempt'][:70]) if c.get('exempt') else 'the register: judged by Q23.7'), {'class': cid}, check='Q23.2')
            continue
        if not ms:
            rec.item(iid, 'FAIL', 'a class the page loads in which no record carries a tier the product could flag', {'class': cid, 'files': c.get('files')}, check='Q23.2')
            continue
        non_doc = [m for m in ms if m['tier'] != 'documented']
        bad = []
        for m in non_doc:
            if m['tier'] is None:
                bad.append((m['id'], 'no tier the product reads (%s)' % ('statement %r' % m['tier_raw'][:50] if m['tier_raw'] else 'none stated')))
            elif m['tier'] not in style_tiers:
                bad.append((m['id'], 'tier %s has no style in TIER_STYLE' % m['tier']))
            elif m['render_flag'] is not None and m['render_flag'] != pq.FLAG_OF.get(m['tier'], m['render_flag']) and m['tier'] != 'open gap':
                bad.append((m['id'], 'render_flag %s disagrees with the tier %s (flag %s)' % (m['render_flag'], m['tier'], pq.FLAG_OF[m['tier']])))
        for m in ms:
            if m['tier'] == 'documented' and m['render_flag'] not in (None, 0):
                bad.append((m['id'], 'render_flag %s on a documented datum (flag 0)' % m['render_flag']))
        ev = {'class': cid, 'scanned': len(ms), 'non_documented': len(non_doc), 'failing': len({i for i, _ in bad}), 'reasons': q02.top_reasons(bad), 'first': pq.first_n([i for i, _ in bad]),
              'with_explicit_render_flag': sum(1 for m in ms if m['render_flag'] is not None), 'tier_counts': q02.tier_counts(ms)}
        if len(bad) > 20:
            ev['sidecar'] = rec.sidecar('Q232-%s' % cid.replace('.', '_'), [{'id': i, 'reason': r} for i, r in sorted(bad)])
        if bad:
            rec.item(iid, 'FAIL', '%d of %d members are not flagged: %s' % (len({i for i, _ in bad}), len(ms), '; '.join('%s (%d)' % (r, n) for r, n in list(ev['reasons'].items())[:3])), ev, check='Q23.2')
        else:
            rec.item(iid, 'PASS', 'all %d members carry a tier that the product reads (%d not documented)' % (len(ms), len(non_doc)), ev, check='Q23.2')


# ------------------------------------------------------------------------------------------------------------- Q23.3
def static_evidence(env, rec, c):
    found, missing = [], []
    for e in c.get('mark_evidence', []):
        p = os.path.join(env.root, *e['file'].split('/'))
        if not os.path.isfile(p):
            missing.append('%s: file not found' % e['file'])
            continue
        t = rec.read_text(p, 'code searched for marks')
        for pat in e['patterns']:
            if pat in t:
                found.append('%s: %s' % (e['file'].replace(APP_SRC + '/', ''), pat))
            else:
                missing.append('%s: pattern %r not found (%s)' % (e['file'].replace(APP_SRC + '/', ''), pat, e['what']))
    return found, missing


def marks_in_product(env, rec, cc, app):
    style = (app or {}).get('style')
    hooks = (app or {}).get('hooks')
    if app is None or style is None:
        rec.blocked('Q23/Q23.3/style-table', 'the result of node tools/bt/gates/q23_app.mjs', 'the app\'s own marking code')
    else:
        rec.item('Q23/Q23.3/style-table', 'FAIL' if style['problems'] else 'PASS', ('; '.join(style['problems'][:3])) if style['problems'] else 'the four tiers differ in glyph, outline pattern and colour, so a tier never depends on colour alone',
                 {'tiers': style['tiers'], 'problems': style['problems']}, check='Q23.3')
    if app is None or hooks is None:
        rec.blocked('Q23/Q23.3/hooks', 'the result of node tools/bt/gates/q23_app.mjs', 'tierName, tierMark and tierMark.style')
    else:
        rec.item('Q23/Q23.3/hooks', 'FAIL' if hooks['problems'] else 'PASS', ('; '.join(hooks['problems'][:3])) if hooks['problems'] else 'tierName, tierMark and tierMark.style give the four tiers their label, glyph and data-tier, and a statement without a tier is marked "Tier not stated"',
                 {'problems': hooks['problems']}, check='Q23.3')
    for c in cc['classes']:
        if not c.get('present', True):
            continue
        iid = 'Q23/Q23.3/class-%s' % c['id']
        found, missing = static_evidence(env, rec, c)
        node_problems, node_facts = [], {}
        for nk in c.get('node_checks', []):
            r = (app or {}).get(nk)
            if r is None:
                node_problems.append('the app check %s did not run' % nk)
                continue
            if nk == 'overlay_units':
                for mode, v in r['modes'].items():
                    node_facts['units_%s' % mode] = {'drawn': v['drawn'], 'problems': v['problem_count']}
                    node_problems += ['unit overlay (%s mode): %s' % (mode, p) for p in v['problems'][:3]]
            elif nk == 'overlay_objects':
                node_facts['objects'] = {'objects': r['objects'], 'colour_only': r['colour_only_count'], 'not_marked': len(r['problems'])}
                node_problems += ['works overlay: %s' % p for p in (r['colour_only'][:3] + r['problems'][:6])]
            elif nk == 'audio':
                node_facts['audio'] = {'mode': r['mode'], 'rows': r['panel_rows']}
                node_problems += ['sound panel: %s' % p for p in r['problems'][:3]]
        ev = {'class': c['id'], 'spec_names': c.get('spec_names'), 'mechanism_found': found, 'mechanism_missing': missing, 'node': node_facts, 'node_problems': node_problems[:12]}
        if not c.get('mark_evidence') and not c.get('node_checks'):
            rec.item(iid, 'FAIL', 'no code that draws or prints a tier mark for this class was found in the interface files searched (overlay.mjs, structures/overlay.mjs, ui/*.mjs, ext/*): %s' % (c.get('note') or ''),
                     dict(ev, searched=['overlay.mjs', 'structures/overlay.mjs', 'ui/', 'ext/']), check='Q23.3')
        elif missing or node_problems:
            rec.item(iid, 'FAIL', '; '.join((missing + node_problems)[:4]), ev, check='Q23.3')
        else:
            rec.item(iid, 'PASS', 'the product draws or prints the tier mark of this class (static search of the code; the app code run under node where named)', ev, check='Q23.3')


def register_link_check(env, rec, sc, reg_open_files):
    ms = sc.members('layer.units')
    if ms is None:
        rec.item('Q23/Q23.3/register-link-units', 'BLOCKED-INPUT', 'input missing: %s' % sc.error('layer.units'), {}, check='Q23.3')
        return
    non = [m for m in ms if m['tier'] and m['tier'] != 'documented']
    bad = []
    for m in non:
        if not m['register_ids']:
            bad.append((m['id'], 'a non-documented unit with no register link'))
        elif not all(r in reg_open_files for r in m['register_ids']):
            bad.append((m['id'], 'register entry %s has no file or is not open' % ', '.join(r for r in m['register_ids'] if r not in reg_open_files)))
    ev = {'units_not_documented': len(non), 'failing': len({i for i, _ in bad}), 'reasons': q02.top_reasons(bad), 'first': pq.first_n([i for i, _ in bad])}
    rec.item('Q23/Q23.3/register-link-units', 'FAIL' if bad else 'PASS', ('%d of %d non-documented units have no usable register link on their card' % (len(bad), len(non))) if bad else 'every non-documented unit links to an open register entry that has a file', ev, check='Q23.3')


def declared_marks(env, rec):
    p = os.path.join(env.bt, 'app', 'data', 'figures3d', 'TIERS.json')
    try:
        d = rec.read_json(p, 'the declared marks of the figure choices')
    except pq.InputMissing as e:
        rec.blocked('Q23/Q23.3/declared-marks-figures3d', str(e), 'the figure choices and the mark each one declares')
        return
    bad = []
    ch = d.get('choices') or []
    for c in ch:
        if c.get('tier') != 'documented':
            m = str(c.get('mark') or '').strip().lower()
            if m in ('', 'none', '-') :
                bad.append((c.get('id'), 'a %s choice declares mark "%s": nothing in the product marks it' % (c.get('tier'), c.get('mark'))))
    rec.item('Q23/Q23.3/declared-marks-figures3d', 'FAIL' if bad else 'PASS', ('%d of %d figure choices that are not documented declare no mark' % (len(bad), len(ch))) if bad else 'every non-documented figure choice declares a mark',
             {'choices': len(ch), 'unmarked': pq.first_n([i for i, _ in bad], 30), 'internal_choices_excluded': [c.get('id') for c in ch if str(c.get('mark') or '').lower().startswith('none (internal')]}, check='Q23.3')


# ------------------------------------------------------------------------------------------------------------- Q23.4 to Q23.8
def substitutes(env, rec, app, reg):
    a = (app or {}).get('audio')
    if a is None:
        rec.blocked('Q23/Q23.4/audio-panel', 'the result of node tools/bt/gates/q23_app.mjs (audio3d/provenance.mjs)', 'the sound panel and its disclosure')
    else:
        rec.item('Q23/Q23.4/audio-panel', 'FAIL' if a['problems'] else 'PASS', ('; '.join(a['problems'][:3])) if a['problems'] else
                 'the sound panel discloses modern recording, reconstruction and synthesized in both label modes (default %s, %s)' % (a['mode'], a['decision']), {'mode': a['mode'], 'decision': a['decision'], 'rows': a['panel_rows'], 'problems': a['problems']}, check='Q23.4')
    lp = os.path.join(env.bt, 'app', 'data', 'audio3d', 'sources.json')
    try:
        led = rec.read_json(lp, 'audio asset manifest')
        ent = led.get('sources') or []
        no_mark = [x.get('ledgerId') for x in ent if not re.search(r'modern (reconstruction|recording)', ' '.join(str(v) for v in x.values() if isinstance(v, str)), re.I)]
        rec.item('Q23/Q23.4/audio-manifest', 'FAIL' if no_mark else 'PASS', ('%d of %d entries of the audio asset manifest do not carry the "modern reconstruction" or "modern recording" mark' % (len(no_mark), len(ent))) if no_mark else 'every entry carries the mark',
                 {'entries': len(ent), 'without_the_mark': pq.first_n(no_mark, 20), 'without_the_mark_count': len(no_mark)}, check='Q23.4')
    except pq.InputMissing as e:
        rec.blocked('Q23/Q23.4/audio-manifest', str(e), 'the audio asset manifest')
    gp = os.path.join(env.bt, 'app', 'data', 'anim3d', 'gait-sources.json')
    try:
        g = rec.read_json(gp, 'motion bases')
        bases = g.get('bases') or {}
        bad = [k for k, v in bases.items() if not (v.get('src') or []) and v.get('tier') in (None, 'documented')]
        noting = [k for k, v in bases.items() if not (v.get('src') or []) and not re.search(r'modern', str(v.get('label') or ''), re.I)]
        rec.item('Q23/Q23.4/motion-bases', 'FAIL' if (bad or noting) else 'PASS', ('motion base(s) %s are documented without a source or not labelled modern' % ', '.join(bad + noting)) if (bad or noting) else
                 'every motion base without a source is labelled modern and is not documented', {'bases': {k: {'tier': v.get('tier'), 'sources': len(v.get('src') or [])} for k, v in bases.items()}}, check='Q23.4')
    except pq.InputMissing as e:
        rec.blocked('Q23/Q23.4/motion-bases', str(e), 'the motion bases')
    for name, pat in (('audio', r'audio|sound'), ('motion', r'motion|animation|mocap|clip'), ('textures-models', r'texture|model|figure')):
        hits = [e for e in reg if re.search(pat, (e.get('title', '') + ' ' + e.get('desc', '')), re.I)]
        bad = [e['id'] for e in hits if e.get('tier') != 'documented' and ds_ph(e.get('marking'))]
        rec.item('Q23/Q23.4/register-%s' % name, 'BLOCKED-INPUT' if not hits else ('FAIL' if bad else 'PASS'), ('input missing: no register entry names the substitutes of this class' if not hits else
                 ('%d register entr(ies) of this class have no marking' % len(bad)) if bad else 'every register entry of this class has a marking'), {'entries': len(hits), 'without_marking': bad[:10]}, check='Q23.4')


def ds_ph(v):
    return pq.is_placeholder(v)


def individuals(env, rec, reg_files):
    e = reg_files.get('EG-0001')
    if e is None:
        rec.blocked('Q23/Q23.5/individuals', 'register entry EG-0001 (individual soldiers)', 'the register entry that says individual positions, actions and faces are plausible-procedural')
        return
    probs = []
    if e.get('tier') != 'plausible-procedural':
        probs.append('EG-0001 is tier %s, not plausible-procedural' % e.get('tier'))
    if pq.is_placeholder(e.get('marking')):
        probs.append('EG-0001 has no marking')
    overlay = os.path.join(env.bt, 'app', 'src', 'overlay.mjs')
    per_individual = False
    if os.path.isfile(overlay):
        t = open(overlay, encoding='utf-8').read()
        per_individual = bool(re.search(r'for \(let (?:a|k|j) = 0, nA|agent|individual|soldier', t.split('draw(tMin')[1].split('ring(c, i')[0], re.I)) if 'draw(tMin' in t else False
    if not per_individual:
        probs.append('the overlay draws one mark per unit (Overlay.draw loops over the units); no mark is drawn for an individual soldier, though the register says: %s' % str(e.get('marking'))[:90])
    rec.item('Q23/Q23.5/individuals', 'FAIL' if probs else 'PASS', '; '.join(probs) if probs else 'EG-0001 marks individuals plausible-procedural and the overlay draws that mark', {'register': {k: e.get(k) for k in ('id', 'tier', 'marking', 'status')}, 'per_individual_mark_in_overlay': per_individual}, check='Q23.5')


def read_register_files(env, rec):
    """Every register entry file (also those not in the index): the fields of the table `| Field | Content |`."""
    rd = os.path.join(env.gov, 'register')
    out = {}
    if not os.path.isdir(rd):
        return out
    for fn in sorted(os.listdir(rd)):
        if not fn.endswith('.md') or not fn.startswith('EG-'):
            continue
        t = rec.read_text(os.path.join(rd, fn), 'register entry file')
        f = {}
        for m in re.finditer(r'^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$', t, re.M):
            f[m.group(1).strip().lower()] = m.group(2).strip()
        out[fn[:-3]] = {'id': fn[:-3], 'tier': (f.get('confidence tier') or '').strip(), 'marking': f.get('product marking'), 'status': (f.get('status') or f.get('review status') or ''), 'title': f.get('id')}
    return out


def register_check(env, rec):
    idx = []
    try:
        idx = [e for e in rec.read_json(os.path.join(env.gov, 'register_index.json'), 'register index') if isinstance(e, dict)]
    except pq.InputMissing as e:
        rec.blocked('Q23/Q23.7/register', str(e), 'the register index')
        return idx, {}
    files = read_register_files(env, rec)
    non = [e for e in idx if e.get('tier') != 'documented']
    bad = [e['id'] for e in non if pq.is_placeholder(e.get('marking'))]
    idx_ids = {e['id'] for e in idx}
    extra = [i for i, f in files.items() if i not in idx_ids and f['tier'] and f['tier'] != 'documented' and pq.is_placeholder(f['marking'])]
    extra_all = [i for i in files if i not in idx_ids]
    ev = {'non_documented_entries': len(non), 'without_marking': pq.first_n(bad, 30), 'without_marking_count': len(bad), 'entry_files_not_in_index': extra_all, 'unindexed_without_marking': extra}
    rec.item('Q23/Q23.7/register', 'FAIL' if (bad or extra) else 'PASS', ('%d of %d non-documented register entries have no marking (plus %d unindexed entry file(s))' % (len(bad), len(non), len(extra))) if (bad or extra) else
             'every register entry whose tier is not documented has a non-placeholder marking', ev, check='Q23.7')
    return idx, files


def gaps(env, rec, sc, app, cc, reg_open_files):
    style = ((app or {}).get('style') or {}).get('tiers') or {}
    marker = style.get('open gap')
    for cid in sorted(sc.classes):
        ms = sc.members(cid)
        if not ms or sc.classes[cid].get('conflicts') or sc.classes[cid].get('exempt') or sc.classes[cid].get('register_entries'):
            continue
        g = [m for m in ms if m['tier'] == 'open gap']
        if not g:
            continue
        bad = [(m['id'], 'an open gap with no register entry' if not m['register_ids'] else 'register entry %s is not open or has no file' % ', '.join(r for r in m['register_ids'] if r not in reg_open_files)) for m in g
               if not m['register_ids'] or not all(r in reg_open_files for r in m['register_ids'])]
        miss_style = marker is None
        ev = {'class': cid, 'open_gaps': len(g), 'without_register_entry': len(bad), 'first': pq.first_n([i for i, _ in bad]), 'marker_class_in_TIER_STYLE': marker}
        rec.item('Q23/Q23.8/%s' % cid, 'FAIL' if (bad or miss_style) else 'PASS', ('%d of %d open gaps have no usable register entry' % (len(bad), len(g))) if bad else ('TIER_STYLE has no marker class for an open gap' if miss_style else
                 'every open gap of the class has an open register entry and the product has the gap marker class'), ev, check='Q23.8')
    # units that are not drawn have no map marker: the overlay draws only the units that are present on the stage
    ms = sc.members('layer.units')
    op = os.path.join(env.bt, 'app', 'src', 'overlay.mjs')
    if ms is not None and os.path.isfile(op):
        t = open(op, encoding='utf-8').read()
        only_present = 'if (!st.present[i]) continue;' in t
        nd = [m for m in ms if m['tier'] == 'open gap' and not m['extra'].get('drawn')]
        if nd:
            rec.item('Q23/Q23.8/units-map-marker', 'FAIL' if only_present else 'PASS', ('%d open-gap units are not drawn and the overlay draws a mark only for a unit that is present on the stage: they have no map marker (the Units list shows their glyph)' % len(nd)) if only_present else
                     'the overlay draws a marker for units that are not drawn', {'open_gap_units_not_drawn': len(nd), 'first': pq.first_n([m['id'] for m in nd])}, check='Q23.8')


# ------------------------------------------------------------------------------------------------------------- main
def main(argv=None):
    ap = pq.base_parser(__doc__.split('\n')[0])
    ap.add_argument('--registry', default=os.path.join(HERE, 'datum_classes.json'))
    ap.add_argument('--content-classes', default=os.path.join(HERE, 'content_classes.json'))
    ap.add_argument('--layer-dump', default=None)
    ap.add_argument('--app-result', default=None, help='a result of q23_app.mjs (default: run the node child)')
    ap.add_argument('--app', default=None)
    args = ap.parse_args(argv)
    env = pq.Env(args.root, args.out)
    rec = pq.Record(GATE, env, argv=['python3', 'tools/bt/gates/q23_marking.py'] + (argv if argv is not None else sys.argv[1:]))
    rec.note('Reading of "render flag": the product reads the tier of a datum through TIER_STYLE (no field named render_flag exists in app/src); an explicit render_flag must agree with the tier')
    rec.owe('Q23.3 frames: the marks drawn at the default overlay state in frames (tools/horde/bench.sh node docs/battle-theatre/app/tests/ui.spec.mjs, software GL) and a person looking at the saved images (U-10); real-GPU confirmation is owed')
    try:
        cc = rec.read_json(args.content_classes, 'content-class registry')
        registry = rec.read_json(args.registry, 'datum-class registry')
    except pq.InputMissing as e:
        rec.blocked('Q23/Q23.1/census', str(e), 'the registries of the census')
        return pq.finish_cli(rec, args)
    tmp = tempfile.mkdtemp(prefix='q23-')
    layer = None
    try:
        if args.layer_dump:
            rec.add_input(args.layer_dump, 'layer dump')
            layer = json.load(open(args.layer_dump, encoding='utf-8'))
        else:
            layer = q02.run_layer_dump(env, rec, args.app, os.path.join(tmp, 'layer.json'))
    except (pq.InputMissing, OSError, ValueError) as e:
        rec.note('the history layer could not be built: %s' % e)
    sc = ds.Scanner(env, rec, registry, layer, {})
    stm = sc.statements()
    app = None
    try:
        if args.app_result:
            rec.add_input(args.app_result, 'result of the app child')
            app = json.load(open(args.app_result, encoding='utf-8'))
        else:
            script = os.path.join(HERE, 'q23_app.mjs')
            tin = os.path.join(tmp, 'stm.json')
            json.dump(stm, open(tin, 'w', encoding='utf-8'))
            out = os.path.join(tmp, 'app.json')
            code, so, se = pq.run_node(env, script, ['--out', out, '--tiers', tin] + (['--app', args.app] if args.app else []))
            rec.add_input(script, 'node child')
            rec.tool_versions['node'] = pq.node_version()
            if code != 0:
                raise pq.InputMissing('node q23_app.mjs failed (exit %d): %s' % (code, (se or so).strip().splitlines()[-1][:200] if (se or so).strip() else ''))
            app = json.load(open(out, encoding='utf-8'))
        if app.get('errors'):
            rec.note('the app child reported: %s' % '; '.join(app['errors'])[:300])
        sc.apply_tiernames(app.get('tier_names') or {})
    except (pq.InputMissing, OSError, ValueError) as e:
        rec.note('the app\'s marking code could not be run: %s' % e)
        rec.incomplete('the app\'s own marking code (q23_app.mjs) did not run')
    # ---- register
    reg_idx, reg_files = register_check(env, rec)
    open_files = {i for i, e in ((e['id'], e) for e in reg_idx) if e.get('status') in ('open', 'awaiting owner') and os.path.isfile(os.path.join(env.gov, 'register', i + '.md'))}
    style_tiers = set((((app or {}).get('style') or {}).get('tiers') or {}).keys()) or set(pq.TIER_ALL)
    census(env, rec, cc)
    flag_in_data(env, rec, sc, style_tiers)
    marks_in_product(env, rec, cc, app)
    register_link_check(env, rec, sc, open_files)
    declared_marks(env, rec)
    rec.item('Q23/Q23.3/frames', 'NOT-RUN', 'the marks drawn in frames at the default overlay state were not looked at: this runner has no browser (software GL through tools/horde/bench.sh, app/tests/ui.spec.mjs) and a frame counts only when someone looked at the saved image', {'looked_at': False}, check='Q23.3', renderer_class='swgl')
    substitutes(env, rec, app, reg_idx)
    individuals(env, rec, reg_files)
    rec.item('Q23/Q23.6/night', 'NOT-RUN', 'legibility of the marks at night needs frames at night times with the overlay on (Q10.6, T-Q10-8): not run here', {'looked_at': False}, check='Q23.6', renderer_class='swgl')
    gaps(env, rec, sc, app, cc, open_files)
    if layer:
        rec.extra['layer'] = layer.get('layer')
    if app:
        rec.extra['app_child'] = {'errors': app.get('errors'), 'overlay_units': {k: {'drawn': v['drawn'], 'problems': v['problem_count']} for k, v in ((app.get('overlay_units') or {}).get('modes') or {}).items()}}
    return pq.finish_cli(rec, args)


if __name__ == '__main__':
    pq.guarded_main(main)
