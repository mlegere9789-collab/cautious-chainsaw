"""sizes.py - bytes of the skin and of the assets of each direction, measured on the snapshot of commit 6628412 (tmp/look-dev/objective/snap): the built page (raw, gzip level 9), its parts (code, data
blocks, stylesheet, inlined font data), and the files that make the direction's own skin (drawing module, token file, stylesheets, ground and place-name code) and its fonts.
The engine, the data and the aerial tiles are shared by all four directions and are listed once."""
import gzip
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
A2 = os.path.join(HERE, 'snap', 'docs', 'pitch', 'anim2')
PROTO = os.path.join(HERE, '..', '..', '..', 'docs', 'pitch', 'anim', 'prototype')

DIRS = {
    'd1': {'page': 'd1-quiet-cartographer/quiet-cartographer.html', 'root': 'd1-quiet-cartographer',
           'skin': ['src/skins/quiet-cartographer.mjs', 'src/skins/quiet-cartographer.spec.mjs'], 'tokens': ['tokens/skin-tokens.json'], 'css': ['src/ui/quiet.css'], 'ground': ['src/ground.mjs', 'src/render/places.mjs'], 'fonts': 'assets/fonts'},
    'd4': {'page': 'd4-editorial/dist/battle-studio.html', 'root': 'd4-editorial',
           'skin': ['studio/src/skins/editorial.mjs', 'studio/src/skins/editorial.spec.mjs'], 'tokens': ['studio/tokens/dispatch.tokens.json'], 'css': ['studio/src/ui/editorial.css', 'studio/src/ui/chrome.css'], 'ground': ['studio/src/popups/fxdraw.mjs', 'studio/src/popups/legend.mjs'], 'fonts': 'fonts'},
}


def size(p):
    return os.path.getsize(p) if os.path.isfile(p) else None


def gz(b):
    return len(gzip.compress(b, 9))


out = {}
for k, D in DIRS.items():
    page = os.path.join(A2, D['page'])
    html = open(page, 'rb').read()
    txt = html.decode('utf8', 'replace')
    parts = {}
    scripts = re.findall(r'<script([^>]*)>(.*?)</script>', txt, re.S)
    for attrs, body in scripts:
        m = re.search(r'id="([^"]+)"', attrs)
        parts['data:' + m.group(1) if m else 'code'] = len(body.encode('utf8'))
    st = re.findall(r'<style[^>]*>(.*?)</style>', txt, re.S)
    css = sum(len(s.encode('utf8')) for s in st)
    fontdata = sum(len(m.group(0)) for m in re.finditer(r'data:(?:font|application)/[a-z0-9\-+]+;base64,[A-Za-z0-9+/=]+', txt))
    parts['style (incl. inlined fonts)'] = css
    parts['of which inlined font data'] = fontdata
    root = os.path.join(A2, D['root'])
    files = {}
    for grp in ('skin', 'tokens', 'css', 'ground'):
        for f in D[grp]:
            files[f] = (grp, size(os.path.join(root, f)))
    fdir = os.path.join(root, D['fonts'])
    fonts = {f: size(os.path.join(fdir, f)) for f in sorted(os.listdir(fdir)) if f.lower().endswith(('.woff', '.woff2', '.ttf', '.otf'))}
    pagecss = css - fontdata
    fontbin = int(fontdata * 3 / 4)
    out[k] = {'page_css_ex_fonts': pagecss, 'fonts_in_page_binary': fontbin, 'page_bytes': len(html), 'page_gzip': gz(html), 'parts': parts, 'files': files, 'fonts': fonts, 'fonts_total': sum(fonts.values()),
              'skin_bytes': sum(v[1] or 0 for f, v in files.items() if v[0] == 'skin'), 'tokens_bytes': sum(v[1] or 0 for f, v in files.items() if v[0] == 'tokens'), 'css_bytes': sum(v[1] or 0 for f, v in files.items() if v[0] == 'css'), 'ground_bytes': sum(v[1] or 0 for f, v in files.items() if v[0] == 'ground'),
              'skin_gzip': sum(gz(open(os.path.join(root, f), 'rb').read()) for f, v in files.items() if v[0] in ('skin', 'tokens', 'css', 'ground') and v[1])}
# shared
tiles = os.path.join(A2, 'basemap', 'assets')
tb = 0
n = 0
for r, d, fs in os.walk(tiles):
    for f in fs:
        tb += os.path.getsize(os.path.join(r, f))
        n += 1
out['_shared'] = {'basemap_assets_bytes': tb, 'basemap_assets_files': n}
json.dump(out, open(os.path.join(HERE, 'results', 'sizes.json'), 'w'), indent=1)
for k, v in out.items():
    if k.startswith('_'):
        print(k, v)
        continue
    print(k, 'pagecss', v['page_css_ex_fonts'], 'fontbin', v['fonts_in_page_binary'], 'page', v['page_bytes'], 'gzip', v['page_gzip'], 'skin', v['skin_bytes'], 'tokens', v['tokens_bytes'], 'css', v['css_bytes'], 'ground', v['ground_bytes'], 'fonts', v['fonts_total'], 'fontdata-in-page', v['parts']['of which inlined font data'])
