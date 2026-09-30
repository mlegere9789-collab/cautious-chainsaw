"""The R0 mechanism (chapter 02 appendix A + B.7): release-id renaming, boot loader, no-reload service worker, kill switch.

Runs AFTER the bundle groups (so the release id covers every patched byte) and BEFORE the page groups, overlay and config hook.
All `index.html` / `site-nav.css` edits are asserted anchors and are recorded in the anchor report as group "R0M".
"""
import hashlib
import os

from .util import BuildError, REPO, T0, read_bytes, read_text, write_bytes, write_text

PH_HELP, PH_BOOK, PH_ENTRY = '__T0_HELP__', '__T0_BOOK__', '__T0_ENTRY__'


def _once(text, find, repl, label, records, target, expect=1):
    """Replace `find` (asserted to occur exactly `expect` times) and record the anchor in the report."""
    n = text.count(find)
    ok = n == expect
    records.append({'group': 'R0M', 'id': 'R0M:' + label, 'target': target, 'expect': expect, 'found': n, 'ok': ok,
                    'regex': False, 'phase': 'mechanism'})
    if not ok:
        raise BuildError('R0 mechanism anchor %r: expected %d match(es), found %d' % (label, expect, n))
    return text.replace(find, repl)


def _tmpl(name):
    # templates are inserted into LF files: a CRLF checkout (core.autocrlf) must not leak carriage returns into dist
    return read_text(os.path.join(T0, 'mechanism', name)).replace('\r\n', '\n')


PRECONNECT_REMOVE = [
    '  <link rel="preconnect" href="https://events.mapbox.com" crossorigin />\n',
    '  <link rel="preconnect" href="https://a.tiles.mapbox.com" crossorigin />\n',
    '  <link rel="preconnect" href="https://b.tiles.mapbox.com" crossorigin />\n',
    '  <link rel="dns-prefetch" href="https://api.mapbox.com" />\n',
    '  <link rel="preconnect" href="https://www.google.com" crossorigin />\n',
    '  <link rel="preconnect" href="https://maps.googleapis.com" crossorigin />\n',
    '  <link rel="preconnect" href="https://streetviewpixels-pa.googleapis.com" crossorigin />\n',
    '  <link rel="dns-prefetch" href="https://maps.googleapis.com" />\n',
    '  <link rel="dns-prefetch" href="https://www.google.com" />\n',
]

SITE_NAV_FADE = '''/* Pure-CSS page-load fade -- no JS dependency, so content is never stuck invisible if a
   script fails; the animation simply finishes on its own. */
body { animation: gtbg-page-in 340ms ease both; }
@keyframes gtbg-page-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { body { animation: none; } }
'''


def compute_release(texts, cfg):
    """Prime the cross references with placeholders and derive the release id (B.7).
    Returns (rid, {'js','help','book'} primed texts, anchor records)."""
    L = cfg['legacy']
    hn, bn, en = (os.path.basename(L[k]) for k in ('help', 'book', 'entry'))
    for t in ('js', 'help', 'book'):
        for ph in (PH_HELP, PH_BOOK, PH_ENTRY):
            if ph in texts[t]:
                raise BuildError('placeholder %s already present in the %s text' % (ph, t))
    recs = []
    js = _once(texts['js'], '"./%s"' % hn, '"./%s"' % PH_HELP, 'entry->HelpModal import specifier', recs, 'js')
    js = _once(js, '"./%s"' % bn, '"./%s"' % PH_BOOK, 'entry->BookmarkPanel import specifier', recs, 'js')
    hp = _once(texts['help'], 'from"./%s"' % en, 'from"./%s"' % PH_ENTRY, 'HelpModal->entry import', recs, 'help')
    bk = _once(texts['book'], 'from"./%s"' % en, 'from"./%s"' % PH_ENTRY, 'BookmarkPanel->entry import', recs, 'book')
    rid = hashlib.sha256((js + '\0' + hp + '\0' + bk).encode('utf-8')).hexdigest()[:8]
    return rid, {'js': js, 'help': hp, 'book': bk}, recs


def run(dist, texts, cfg, train, records):
    """Write the renamed assets and the rewritten HTML/CSS/SW into `dist` (a fresh copy of legacy/dist).  Returns the release dict."""
    L = cfg['legacy']
    rid, primed, recs = compute_release(texts, cfg)
    records.extend(recs)
    EN, HN, BN = 'index-%s.js' % rid, 'HelpModal-%s.js' % rid, 'BookmarkPanel-%s.js' % rid
    js = primed['js'].replace(PH_HELP, HN).replace(PH_BOOK, BN)
    hp = primed['help'].replace(PH_ENTRY, EN)
    bk = primed['book'].replace(PH_ENTRY, EN)
    css_bytes = texts['css'].encode('utf-8')
    CN = 'index-%s.css' % hashlib.sha256(css_bytes).hexdigest()[:8]
    if '/*t0:' in js[:200]:
        raise BuildError('entry already carries a /*t0: sentinel')
    js = '/*t0:%s*/' % rid + js
    # old names are removed from THIS deploy (previous deploys keep them for rollback); the orphan worker goes too (D-ORDER R0)
    for old in [L['entry'], L['help'], L['book'], L['css']] + L.get('orphans', []):
        p = os.path.join(dist, old)
        if not os.path.isfile(p):
            raise BuildError('expected legacy asset %s in the copied tree' % old)
        os.remove(p)
    write_text(os.path.join(dist, 'assets', EN), js)
    write_text(os.path.join(dist, 'assets', HN), hp)
    write_text(os.path.join(dist, 'assets', BN), bk)
    write_bytes(os.path.join(dist, 'assets', CN), css_bytes)
    rel = {'rid': rid, 'entry': EN, 'help': HN, 'bookmark': BN, 'css': CN, 'train': train}

    # ---- index.html
    idx = os.path.join(dist, 'index.html')
    h = read_text(idx)
    old_entry, old_css = os.path.basename(L['entry']), os.path.basename(L['css'])
    T = 'index.html'
    h = _once(h, '  <link rel="modulepreload" href="/assets/%s" crossorigin />\n' % old_entry, '', 'modulepreload removed', records, T)
    h = _once(h, '  <link rel="preload" as="style" href="/assets/%s" crossorigin\n'
                 '        onload="this.onload=null;this.rel=\'stylesheet\'" />\n'
                 '  <noscript><link rel="stylesheet" href="/assets/%s" crossorigin /></noscript>\n' % (old_css, old_css),
              '  <link rel="stylesheet" href="/assets/%s" crossorigin />\n' % CN, 'css preload swap -> plain stylesheet', records, T)
    for pc in PRECONNECT_REMOVE:
        h = _once(h, pc, '', 'head hint removed: ' + pc.strip()[:70], records, T)
    h = _once(h, '  <meta name="theme-color" content="#0a0a14" />\n',
              '  <meta name="theme-color" content="#0a0a14" />\n  <meta name="color-scheme" content="dark" />\n',
              'color-scheme meta added', records, T)
    h = _once(h, '      animation: boot-fade-in 0.4s ease both;\n', '', 'boot splash fade removed', records, T)
    # service-worker block (deployed lines 255-277) -> idle registration + chunk-error guard
    start_marker, end_marker = '  <script>\n    // Register the service worker', '  </script>\n'
    if h.count(start_marker) != 1:
        raise BuildError('R0 mechanism: legacy service-worker script block not found exactly once')
    a = h.index(start_marker)
    b = h.index(end_marker, a) + len(end_marker)
    block = h[a:b]
    if 'controllerchange' not in block or 'location.reload()' not in block or block.count('<script>') != 1:
        raise BuildError('R0 mechanism: unexpected legacy service-worker block')
    records.append({'group': 'R0M', 'id': 'R0M:service-worker script block replaced', 'target': T, 'expect': 1, 'found': 1,
                    'ok': True, 'regex': False, 'phase': 'mechanism'})
    h = h[:a] + _tmpl('sw-register.html') + h[b:]
    h = _once(h, '  <script src="/site-nav.js"></script>\n', '  <script defer src="/site-nav.js"></script>\n',
              'site-nav.js deferred', records, T)
    h = _once(h, '  <script type="module" crossorigin src="/assets/%s"></script>\n' % old_entry,
              _tmpl('loader.html').replace('{{ENTRY}}', EN), 'module script -> boot-after-first-paint loader', records, T)
    for stale in (old_entry, old_css, os.path.basename(L['help']), os.path.basename(L['book'])):
        if stale in h:
            raise BuildError('index.html still references legacy asset name %s after the R0 mechanism' % stale)
    write_text(idx, h)

    # ---- site-nav.css: the body entrance animation is removed on all pages
    nav = os.path.join(dist, 'site-nav.css')
    c = _once(read_text(nav), SITE_NAV_FADE,
              '/* Page-load fade removed (R0): text painted under an opacity:0 ancestor is not counted for FCP/LCP. */\n',
              'site-nav.css body entrance animation removed', records, 'site-nav.css')
    write_text(nav, c)

    # ---- sw.js (new) and the kill switch (kept in ops/sw-kill.js, copied to _ops/ for convenience)
    write_text(os.path.join(dist, 'sw.js'), _tmpl('sw.js.tmpl').replace('{{RID}}', rid))
    write_bytes(os.path.join(dist, '_ops', 'sw-kill.js'), read_bytes(os.path.join(REPO, 'ops', 'sw-kill.js')))
    return rel
