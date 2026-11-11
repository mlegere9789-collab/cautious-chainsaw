#!/usr/bin/env python3
"""ACWII mod (Napoleon: Total War packs) -> Battle Theatre cleared assets + manifest.  Run with -I: python3 -I tools/bt/acw/convert_acw.py --extract <dir with the unpacked packs> --out docs/battle-theatre/app/data/figures3d/acw
The extract dir is UNTRUSTED data (never run anything in it). Pack unpacking is done with pfh0.py (bytes only).
Every file of the five asset packs is classified by policy.py; only cleared files are converted (DDS -> WebP); everything else is listed with its reason codes.
--selftest-dir D (outside the app) additionally writes decoder self-test GLBs of the base-game-derived meshes for LOCAL verification only; they are never part of the product."""
import argparse, collections, hashlib, io, json, os, re, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import policy, dds, vwm, vmpf, rmv2

ASSET_PACKS = ['Models_FX1', 'Models_FX2', 'Models_TXT1', 'Models_TXT2', 'Unit_VariantModels', 'Unit_Atlas']
MESH_EXT = ('.variant_weighted_mesh', '.variant_part_mesh', '.rigid_model', '.animatable_rigid_model', '.rigid_model_animation', '.fbx')
TEX_EXT = ('.dds', '.tga', '.png', '.psd')

def sha(b): return hashlib.sha256(b).hexdigest()

def parse_svn(root):
    """{relative path under root (with '/'): {author, rev, date, md5, repo_path}} from every .svn/entries (format 8 text) under root."""
    out = {}
    for r, ds, fs in os.walk(root):
        if os.path.basename(r) != '.svn' or 'entries' not in fs: continue
        wc = os.path.dirname(r); recs = open(os.path.join(r, 'entries'), 'rb').read().decode('latin1').split('\x0c\n'); url = recs[0].split('\n')[4] if len(recs[0].split('\n')) > 4 else ''
        for rec in recs[1:]:
            f = rec.split('\n')
            if len(f) < 11 or f[1] != 'file': continue
            out[os.path.relpath(os.path.join(wc, f[0]), root).replace(os.sep, '/')] = dict(author=f[10], rev=int(f[9]) if f[9].isdigit() else None, date=f[8], md5=f[7], repo_dir=url.split('empire_american_civil_war.4')[-1].strip('/'))
    return out

def classify(pack, rel, full, data, svn, placeholder_md5, lod_dups):
    key = pack + '/' + rel; low = rel.lower(); base = low.rsplit('/', 1)[-1]; codes = []; info = {}
    ext = '.' + base.rsplit('.', 1)[-1] if '.' in base else ''
    md5 = hashlib.md5(data).hexdigest(); rec = svn.get(key); svn_ok = bool(rec and rec['author'] == policy.SVN_AUTHOR and rec['md5'] == md5)
    if base.endswith('.rpfm_reserved') or '/.svn/' in '/' + low: return 'exclude', ['NOT-ART'], info
    submesh = []; texn = []
    if base.endswith('.variant_weighted_mesh'):
        kind = 'mesh_vwm'
        try:
            m = vwm.parse(data); submesh = [x['name'] for x in m['meshes']]; info.update(submeshes=len(submesh), vertices=sum(len(x['verts']) for x in m['meshes']), indices=sum(len(x['idx']) for x in m['meshes']), decoded=True)
        except ValueError as e: info.update(decoded=False, decode_error=str(e))
    elif base.endswith('.variant_part_mesh'):
        kind = 'mesh_vmpf'
        try:
            m = vmpf.parse(data); info.update(lods=len(m['sections']), vertices_lod0=len(m['sections'][0][0]), decoded=True)
        except ValueError as e: info.update(decoded=False, decode_error=str(e))
    elif base.endswith(('.rigid_model', '.animatable_rigid_model', '.rigid_model_animation')):
        kind = 'mesh_rigid'
        try: s = rmv2.scan(data); texn = s['texture_names']; info.update(version=s['version'], texture_names=texn, decoded=False)
        except ValueError: info.update(decoded=False)
    elif ext in TEX_EXT: kind = 'texture'
    elif ext == '.fbx': kind = 'mesh_other'
    else: kind = 'other'
    if kind == 'texture' and md5 in placeholder_md5: codes.append('PLACEHOLDER')
    codes += policy.stock_markers(rel, submesh, texn)
    if kind == 'mesh_vmpf' and 'unitparts/euro/' not in low and md5 in lod_dups.get('euro', set()): codes.append('S-IDENTICAL')
    if kind == 'mesh_rigid' and md5 in lod_dups.get('lodcopy', set()): codes.append('S-LODCOPY')
    if pack == 'Models_FX1' and low.startswith('acw_models/unitmodels/union/textures/'): codes.append('PAIRED-STOCK-MESH')
    if pack == 'Unit_Atlas': codes.append('OUT-OF-SCOPE' if ext in ('.unit_variant', '.rpfm_reserved') else 'ATLAS-MIXED')
    if base.startswith('babydoll'): codes.append('ANACHRONISM')
    if kind in ('other',) or low.startswith('acw_models/buildings/') or '/buildings/' in low or low.startswith('rigidmodels/'): codes.append('OUT-OF-SCOPE')
    if kind in ('mesh_rigid', 'mesh_vwm') and info.get('decoded') is not True: codes.append('DECODE-UNVERIFIED')
    if kind == 'mesh_vmpf' and svn_ok and not any(t in low for t in ('/hats/', '/belts/')): codes.append('DECODE-UNVERIFIED')   # only hat and belt placement is verified
    if not svn_ok: codes.append('NO-SVN')
    else: info['svn'] = rec
    codes = sorted(set(codes))
    if not codes: return 'include', ['INCLUDED', 'E1-SVN'], info
    return 'exclude', codes, info

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--extract', required=True); ap.add_argument('--out', required=True); ap.add_argument('--selftest-dir'); a = ap.parse_args()
    files_root = os.path.abspath(a.extract); out = os.path.abspath(a.out)
    entries = []; svn = parse_svn(files_root)
    allfiles = []
    for pack in ASSET_PACKS:
        for r, ds, fs in os.walk(os.path.join(files_root, pack)):
            for f in fs: allfiles.append((pack, os.path.relpath(os.path.join(r, f), os.path.join(files_root, pack)).replace(os.sep, '/')))
    allfiles.sort()
    md5s = collections.Counter(); datac = {}
    for pack, rel in allfiles:
        if '.svn' in rel.split('/') or rel.endswith('.rpfm_reserved'): continue
        if rel.lower().endswith('.dds') and pack == 'Unit_VariantModels': md5s[hashlib.md5(open(os.path.join(files_root, pack, rel), 'rb').read()).hexdigest()] += 1
    placeholder_md5 = {k for k, v in md5s.items() if v >= policy.PLACEHOLDER_MIN_COPIES}
    # byte-identity sets: acw-namespace part meshes identical to a euro-namespace one; rigid models whose LOD files are all identical
    euro = {}; part_md5 = collections.defaultdict(list); rig = collections.defaultdict(list)
    for pack, rel in allfiles:
        p = os.path.join(files_root, pack, rel); low = rel.lower()
        if pack == 'Unit_VariantModels' and low.endswith('.variant_part_mesh'):
            h = hashlib.md5(open(p, 'rb').read()).hexdigest(); part_md5[h].append(low)
        if pack == 'Models_FX1' and low.endswith(('.animatable_rigid_model', '.rigid_model')) and '/enginemodels/' in low:
            rig[(os.path.dirname(low), hashlib.md5(open(p, 'rb').read()).hexdigest())].append(low)
    euro_md5 = {h for h, v in part_md5.items() if any('/unitparts/euro/' in x for x in v) and any('/unitparts/acw/' in x for x in v)}
    lodcopy = {h for (d, h), v in rig.items() if len(v) >= 3 and re.search(r'lod\d', v[0])}
    lod_dups = dict(euro=euro_md5, lodcopy=lodcopy)
    tally = collections.Counter(); included = []; excluded = []
    meta_files = 0
    for pack, rel in allfiles:
        if '.svn' in rel.split('/') or rel.endswith('.rpfm_reserved'): meta_files += 1; continue   # Subversion working-copy files and RPFM housekeeping: read as evidence, not assets
        full = os.path.join(files_root, pack, rel); data = open(full, 'rb').read()
        dec, codes, info = classify(pack, rel, full, data, svn, placeholder_md5, lod_dups)
        row = dict(pack=pack, path=rel, bytes=len(data), sha256=sha(data), codes=codes)
        if info: row['info'] = info
        if dec == 'include': included.append((row, full, data))
        else: excluded.append(row)
        tally[(dec, codes[0] if dec == 'include' else 'excluded')] += 1
    # convert included textures (jacket swatch sheets) -> WebP; normal maps lossless, diffuse/gloss lossy q=92
    os.makedirs(out, exist_ok=True); inc_rows = []; swatches = {}
    for row, full, data in included:
        im, meta = dds.read_dds(full); name = row['path']; m = re.search(r'torso/([^/]+)/([^/]+)/texture_(diffuse|normal|gloss_map)\.dds$', name, re.I)
        if not m: raise SystemExit('cleared file without an output rule: ' + name)
        group, variant, chan = m.group(1), m.group(2), m.group(3).replace('gloss_map', 'gloss'); rel_out = 'textures/%s/%s_%s.webp' % (group, variant, chan)
        os.makedirs(os.path.join(out, os.path.dirname(rel_out)), exist_ok=True); buf = io.BytesIO()
        Image.fromarray(im[..., :3] if chan != 'gloss' else im[..., :4]).save(buf, 'WEBP', lossless=(chan == 'normal'), quality=92, method=6); ob = buf.getvalue()
        open(os.path.join(out, rel_out), 'wb').write(ob)
        r2 = dict(row); r2.update(output=rel_out, output_bytes=len(ob), output_sha256=sha(ob), width=meta['w'], height=meta['h'], source_format=meta['fmt'], channel=chan, group=group, variant=variant,
                  licence_basis=policy.LICENCE_BASIS, credit=policy.CREDIT, tier='plausible-procedural', authorship_evidence=policy.CODES['E1-SVN'])
        inc_rows.append(r2)
        if chan == 'diffuse':
            lin = np.where(im[..., :3] / 255 <= 0.04045, im[..., :3] / 255 / 12.92, ((im[..., :3] / 255 + 0.055) / 1.055) ** 2.4)
            mask = im[..., :3].sum(2) > 24; swatches['%s/%s' % (group, variant)] = dict(mean_srgb=[int(round(x)) for x in im[..., :3][mask].mean(0)], mean_linear=[round(float(x), 5) for x in lin[mask].mean(0)], basis='mean of non-black texels of the mod-painted jacket UV sheet; a lead colour of the mod artist, not a measurement of any 1863 garment')
    out_scope = []
    for pack in ('ACW_Animations', 'ACW_Battles', 'ACW_Data', 'ACW_Effects', 'ACW_Environment1', 'ACW_Environment2', 'ACW_Luac', 'Flags', 'SFX_Music', 'SFX_Troop', 'Unit_Icons', 'User_Interface', 'acw_local', 'boot'):
        idx = next((q for q in (os.path.join(files_root, pack + '.index.tsv'), os.path.join(os.path.dirname(files_root), pack + '.index.tsv')) if os.path.exists(q)), None)   # listing of a pack that was not unpacked
        if idx:
            n = sum(1 for _ in open(idx, encoding='utf8', errors='replace'))
            out_scope.append(dict(pack=pack, files_listed=n, reason={'SFX_Music': 'game audio: owner excluded music/sfx from the game', 'SFX_Troop': 'game audio: owner excluded sfx from the game', 'Flags': 'UI flag icons (HUD badges) of unknown authorship; the flag requirement keeps the procedural flags (EG-FIG-0003)', 'Unit_Icons': 'UI icons', 'User_Interface': 'UI skins and loading pictures', 'boot': 'UI textures', 'ACW_Data': 'database tables: leads only (acw-leads), not art assets', 'ACW_Environment1': 'terrain presets: never used for 1863 terrain (CLAUDE.md)', 'ACW_Environment2': 'terrain presets: never used for 1863 terrain (CLAUDE.md)', 'ACW_Effects': 'effect textures: out of the figures scope (FX part keeps its own)', 'ACW_Animations': 'animation fragment text only; the .anim motion clips are the base game and are not in the mod', 'ACW_Battles': 'battle radar pictures and tables', 'ACW_Luac': 'compiled UI scripts', 'acw_local': 'localisation text'}.get(pack, 'out of scope')))
    counts = collections.Counter(); reasons = collections.Counter(); kinds = collections.Counter()
    for r in excluded:
        counts[r['pack']] += 1
        for c in r['codes']: reasons[c] += 1
    for r in excluded + [x[0] for x in included]:
        ext = r['path'].rsplit('.', 1)[-1].lower() if '.' in r['path'] else ''; kinds[ext] += 1
    man = dict(schema='acw-manifest-1', generated_by='tools/bt/acw/convert_acw.py', policy_file='tools/bt/acw/policy.py',
               source=dict(archive='ACW.zip', sha256='8efdb2627d76678b906a6a44d019fcc698eb3d0d7e79555e390be440d013c9ed', bytes=2161900663, mod='ACWII (Napoleon: Total War American Civil War mod)', svn_author=policy.SVN_AUTHOR, svn_repo='https://subversion.assembla.com/svn/empire_american_civil_war.4', svn_uuid='4ca84c4f-01e6-4a0a-bfcb-691c0f47ad24', svn_dates='2011-05-21 .. 2011-11-09'),
               rights=dict(licence_basis=policy.LICENCE_BASIS, recorded='2026-11-11', credit=policy.CREDIT, written_licence_on_file=False, scope_note='the mod author can license only files he made; every file is decided by evidence, unclear means excluded'),
               codes=policy.CODES, summary=dict(asset_pack_files_scanned=len(allfiles), svn_and_housekeeping_files_not_listed=meta_files, included=len(inc_rows), excluded=len(excluded), excluded_by_code=dict(sorted(reasons.items())), by_pack_excluded=dict(counts), extensions=dict(sorted(kinds.items())), included_bytes=sum(r['output_bytes'] for r in inc_rows)),
               included=inc_rows, excluded=excluded, out_of_scope_packs=out_scope, swatches=swatches)
    json.dump(man, open(os.path.join(out, 'manifest.json'), 'w'), indent=1, sort_keys=False); json.dump(dict(schema='acw-swatches-1', note='lead colours (see basis)', swatches=swatches), open(os.path.join(out, 'swatches.json'), 'w'), indent=1)
    json.dump(dict(schema='acw-credits-1', credit_line=policy.CREDIT, licence_basis=policy.LICENCE_BASIS, recorded='2026-11-11', active=len(inc_rows) > 0, shown_with='the tier mark (plausible-procedural); the mod is a game asset and no historical evidence', applies_to='any figure, texture or colour that comes from a file listed under included in manifest.json', ledger='GOVERNANCE/library/figures-ledger.json FIG-L-ACWII-MOD'), open(os.path.join(out, 'credits.json'), 'w'), indent=1)
    print('scanned', len(allfiles), 'included', len(inc_rows), 'excluded', len(excluded), 'bytes', man['summary']['included_bytes']); print('excluded by code', dict(reasons))
    if a.selftest_dir:
        if os.path.abspath(a.selftest_dir).startswith(os.path.dirname(out)): raise SystemExit('selftest output must be outside the app data')
        print('decoder self-test GLBs are written by selftest_render.py; see its header')

if __name__ == '__main__': main()
