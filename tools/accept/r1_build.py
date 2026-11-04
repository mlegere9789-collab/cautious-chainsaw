#!/usr/bin/env python3
"""Scratch build of the Release 1 candidate: R1c + every candidate patch group together, WITHOUT editing trains.json, tools/t0/patches, tools/t0/overlay or release/.

    python tools/accept/r1_build.py --out tmp/r1/cand [--no-gate] [--groups CLOCK,DATA,MON,ANIM,POLISH,PERF2,BASE1863] [--no-img] [--no-copy2]

What it does (everything in memory or under <out>/..):
  * trains.json is read in memory; the listed fixed groups are appended to optional_groups in the order given (BASE1863 last: it anchors on the finished text of the others);
  * tools/t0/patches/* plus tools/t0/patches-next/<group>.json and <group>+*.json for the fixed groups are copied to a scratch patch directory;
  * page groups copied as they are: PG-polish, PG-perf2 (the page halves of POLISH and PERF2); IMG.json is staged as the page group PG-zimg (as tools/t0/images/img_build.py does);
    COPY2.json is staged as the page group PG-zcopy2 (it anchors on the finished text of historian.html, so it must follow PG-core);
  * overlay: tools/t0/overlay with the IMG edits (img_build.stage_overlay) + the staged BASE1863 tile pyramid, service worker and headers hook of BASE1863 (as combo_build.py does);
  * the unmodified builder tools/t0/build.py builds the train R1c into --out.
Registration the integrator needs is printed at the end (REGISTRATION).
Exit codes: 0 ok, 2 anchors/preconditions, 3 gate.
"""
import argparse, copy, json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO0 = os.path.dirname(os.path.dirname(HERE))
T0 = os.path.join(REPO0, 'tools', 't0')
for p in (T0, os.path.join(T0, 'base1863'), os.path.join(T0, 'images')):
    sys.path.insert(0, p)
import build as B  # noqa: E402
from t0build import mechanism as M  # noqa: E402
from t0build.util import REPO, load_json, rmtree_safe  # noqa: E402
import b63_build as BB  # noqa: E402
import img_build as IB  # noqa: E402

DEFAULT = 'CLOCK,DATA,MON,ANIM,POLISH,PERF2,PERF3,BASE1863'
PAGE_GROUPS = {'POLISH': ['PG-polish'], 'PERF2': ['PG-perf2'], 'PERF3': ['PG-perf3', 'PG-zperf3']}


def dump(path, obj):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        json.dump(obj, f, indent=1, ensure_ascii=False); f.write('\n')


def main(argv=None):
    for st in (sys.stdout, sys.stderr):
        try: st.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError): pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', required=True)
    ap.add_argument('--train', default='R1c', choices=['R1c'])
    ap.add_argument('--groups', default=DEFAULT)
    ap.add_argument('--no-gate', action='store_true')
    ap.add_argument('--no-img', action='store_true')
    ap.add_argument('--no-copy2', action='store_true')
    ap.add_argument('--with-legal', action='store_true', help='also build the opt-in page groups PG-legal and PG-polish-legal (interim privacy/terms text; trains.json legal.effective_date)')
    ap.add_argument('--guide', default='docs/guide/out/user-guide.pdf', help='tutorial PDF copied over user-guide.pdf ("none" keeps the published one)')
    ap.add_argument('--stage', default=BB.STAGE_DEFAULT)
    a = ap.parse_args(argv)
    BB.lowprio()
    out_abs = os.path.abspath(os.path.join(REPO, a.out))
    if os.path.normcase(out_abs) == os.path.normcase(os.path.join(REPO, 'release', a.train)):
        raise SystemExit('refusing to build into release/%s' % a.train)
    groups = [g for g in a.groups.split(',') if g]
    cfg = copy.deepcopy(load_json(os.path.join(T0, 'trains.json')))
    for g in groups:
        if g in cfg.get('group_order', []) or g in cfg.get('optional_groups', []):
            raise SystemExit('%s is registered in trains.json: use tools/t0/build.py --with' % g)
    cfg['optional_groups'] = list(cfg.get('optional_groups', [])) + groups
    pscratch = os.path.join(os.path.dirname(out_abs), '_r1-patches-' + os.path.basename(out_abs))
    BB.stage_patches(pscratch, [g for g in groups if g != 'BASE1863'], 'BASE1863' in groups)
    nxt = os.path.join(T0, 'patches-next')
    pgs = []
    for g in groups:
        for pg in PAGE_GROUPS.get(g, []):
            shutil.copyfile(os.path.join(nxt, pg + '.json'), os.path.join(pscratch, pg + '.json')); pgs.append(pg)
    if a.with_legal:
        for pg in ('PG-legal', 'PG-polish-legal'):
            if pg == 'PG-polish-legal': shutil.copyfile(os.path.join(nxt, pg + '.json'), os.path.join(pscratch, pg + '.json'))
            pgs.append(pg)
    if not a.no_copy2:
        g = load_json(os.path.join(nxt, 'COPY2.json')); g['group'] = 'PG-zcopy2'; g['optional'] = True; g['train'] = 'R1a'
        dump(os.path.join(pscratch, 'PG-zcopy2.json'), g); pgs.append('PG-zcopy2')
    if not a.no_img:
        g = load_json(os.path.join(nxt, 'IMG.json')); g['group'] = IB.PG_NAME; g['optional'] = True; g['train'] = 'R1a'
        dump(os.path.join(pscratch, IB.PG_NAME + '.json'), g); pgs.append(IB.PG_NAME)
    oscratch = os.path.join(os.path.dirname(out_abs), '_r1-overlay-' + os.path.basename(out_abs))
    IB.stage_overlay(oscratch, not a.no_img, None)
    if a.guide != 'none':
        shutil.copyfile(os.path.join(REPO, a.guide), os.path.join(oscratch, 'common', 'user-guide.pdf'))
    # Release 1 overlay edit: data/moments.json (group DL's overlay file, not patchable by the page phase) - the Culp's Hill moment follows the DATA chronology
    # (DATA moved "Colgrove's charge" from tick 460 to 483; the recapture of the lower works by the XII Corps is the event at tick 480, 7:05 AM).  The page link (turning-points.html tick:) is PG-polish POL-F03.
    mp = os.path.join(oscratch, 'R1c', 'data', 'moments.json')
    if 'DATA' in groups and os.path.isfile(mp):
        txt = open(mp, encoding='utf-8', newline='').read()
        import re
        rx = re.compile(r'("id":\s*"tp-culps-hill-retaken",\s*"kind":\s*"turning-point",\s*"tick":\s*)460\b')
        if len(rx.findall(txt)) != 1: raise SystemExit('overlay moments.json: the tp-culps-hill-retaken row was not found exactly once (the overlay changed?)')
        open(mp, 'w', encoding='utf-8', newline='').write(rx.sub(lambda m: m.group(1) + '480', txt))
    orig = M._tmpl
    hook = None
    if 'BASE1863' in groups:
        top = os.path.join(os.path.abspath(os.path.join(REPO, a.stage)), 'tiles1863')
        if not os.path.isdir(top): raise SystemExit('no staged tile set: run python tools/t0/base1863/stage_assets.py')
        BB.link_tree(top, os.path.join(oscratch, cfg['trains'][a.train]['overlay'][-1], 'tiles1863'))
        def tmpl(name):
            t = orig(name)
            return BB.sw_with_tiles(t) if name == 'sw.js.tmpl' else t
        M._tmpl = tmpl
        if cfg['trains'][a.train].get('config'): hook = os.path.join('tools', 'accept', 'r1_config_hook.mjs')
    ns = argparse.Namespace(train=a.train, all=False, out=a.out, with_groups=groups + pgs, record=False, no_gate=a.no_gate, keep_failed=True, order='fixed', dump_stage=None,
                            legacy=None, base_dir=None, base_lock=None, patches=pscratch, overlay=oscratch, ledger=None, config_hook=hook)
    try:
        r = B.build_train(a.train, ns, cfg)
    except B.GateFailed as e:
        print('GATE FAILED:', e); return 3
    except B.BuildError as e:
        print('BUILD FAILED:', e); return 2
    finally:
        M._tmpl = orig
    print('OK: %s=%s (with %s)' % (r['train'], r['rid'], ','.join(groups + pgs)))
    print('REGISTRATION: optional_groups += %s ; page groups %s ; patches dir = %s ; overlay = %s' % (groups, pgs, pscratch, oscratch))
    return 0


if __name__ == '__main__':
    sys.exit(main())
