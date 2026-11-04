#!/usr/bin/env python3
"""Writes the SEO page-patch group PG-zseo into tools/t0/patches-next/ (candidate; registered by the R1f pack agent, not here) and its two companions:

    tools/t0/patches-next/PG-zseo.json       static, verifiable head and crawl fixes (see below); sorts after PG-zperf5
    tools/t0/seo/identity-zseo.json          the exact identity differences (tools/t0/verify_release.mjs check V6) the group causes, for the pack agent to merge into identity-R1f.json
    tools/t0/seo/optional/PG-zseo-opt.json   patches that change timing or looks and must be measured in a browser first; NOT part of PG-zseo, NOT to be registered before E1/E2 of docs/seo/SEO-AND-VITALS-AUDIT.md pass

    python tools/t0/seo/gen_zseo.py            write the files
    python tools/t0/seo/gen_zseo.py --check    exit 1 when a file on disk differs from what this script writes (also asserts every anchor against release/R1e/dist)

Every patch is a single-line anchor (the page files mix LF and CRLF), expect 1, asserted here against the built R1e dist, and replayed in memory by tests/t0/seo.spec.mjs.
Facts used in the added markup come only from the page itself (its own <title> and meta description) or from the site's own statements (privacy.html: "free, ad-free, no-login");
no rating, review, address, author, date or price is invented. No lastmod is written to the sitemap because nothing in the dist records when a page last changed.
"""
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(REPO, 'tools', 't0', 'patches-next')
OPT = os.path.join(HERE, 'optional')
DIST = os.path.join(REPO, 'release', 'R1e', 'dist')
SITE = 'https://gettysburginteractivemap.com'
BRAND = 'Gettysburg Animated Battlefield Map'

# indexable sub-pages (sitemap.xml minus the home page); ar, embed, 404, privacy, terms and the GSC file are handled on purpose (see the audit)
PAGES = ['search', 'dashboard', 'compare', 'camera', 'documentary', 'report', 'education', 'aftermath', 'sandbox', 'viewshed', 'regiment',
         'ground-remembers', 'historian', 'immersive', 'watch-together', 'turning-points', 'find-ancestor', 'cinematic-export', 'living-ledger']
# the tool list of the home page's static text, in the order of its nav (index.html #seo-content) -> page file; the last two pages (report, cinematic-export) are in the sitemap but no static page linked to them
HOME_TOOLS = [('Search Everything', 'search'), ('Ask the Historian', 'historian'), ('Documentary Mode', 'documentary'), ('Compare Two Moments', 'compare'),
              ('Camera Modes', 'camera'), ('What-If Sandbox', 'sandbox'), ('Turning Points', 'turning-points'), ('Casualty & Strength Dashboard', 'dashboard'),
              ('High Ground', 'viewshed'), ('Regimental Biography', 'regiment'), ('The Ground Remembers', 'ground-remembers'), ('Find an Ancestor', 'find-ancestor'),
              ('Watch Together', 'watch-together'), ('Immersive Mode', 'immersive'), ('Living Ledger', 'living-ledger'), ('Aftermath', 'aftermath'), ('For Students', 'education'),
              ('Regiment Fact Sheets', 'report'), ('Export a Video', 'cinematic-export')]


def dumps(o):
    return json.dumps(o, indent=1, ensure_ascii=False) + '\n'


def read(name):
    with open(os.path.join(DIST, name), encoding='utf-8', newline='') as f:
        return f.read()


def meta(txt, key, attr='name'):
    m = re.search(r'<meta\s+' + attr + r'="' + re.escape(key) + r'"\s+content="(.*?)"', txt, re.S)
    return html.unescape(m.group(1)) if m else None


def title(txt):
    return html.unescape(re.search(r'<title>(.*?)</title>', txt, re.S).group(1).strip())


def ld(obj):
    s = json.dumps(obj, indent=2, ensure_ascii=False)
    assert '</' not in s
    return '<script type="application/ld+json">\n' + s + '\n</script>'


def page_ld(page, txt):
    url = SITE + '/' + page + '.html'
    t = title(txt)
    d = meta(txt, 'description')
    short = t.split(' — ')[0]
    assert short != t, page
    web = {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': t, 'description': d, 'inLanguage': 'en-US',
           'isPartOf': {'@type': 'WebSite', '@id': SITE + '/#website', 'url': SITE + '/', 'name': BRAND},
           'breadcrumb': {'@id': url + '#breadcrumb'}}
    if page == 'education':
        web['audience'] = {'@type': 'EducationalAudience', 'educationalRole': 'student'}
    bc = {'@type': 'BreadcrumbList', '@id': url + '#breadcrumb', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': BRAND, 'item': SITE + '/'},
        {'@type': 'ListItem', 'position': 2, 'name': short, 'item': url}]}
    return ld({'@context': 'https://schema.org', '@graph': [web, bc]})


def build():
    """returns (patches, identity_differences, optional_patches)"""
    P, ident, O = [], [], []
    for p in PAGES:
        f = p + '.html'
        txt = read(f)
        nl = '\r\n' if '\r\n' in txt else '\n'
        canon = '<link rel="canonical" href="%s/%s.html" />' % (SITE, p)
        assert txt.count(canon) == 1, f
        add = ''
        has_card = re.search(r'name="twitter:card"', txt) is not None
        if not has_card:
            add += nl + '<meta name="twitter:card" content="summary_large_image" />'
            ident.append('%s: twitter:card changed undefined -> %s' % (f, json.dumps('summary_large_image')))
        add += nl + page_ld(p, txt).replace('\n', nl)
        P.append({'id': 'ZSEO-head-' + p, 'target': f, 'find': canon, 'repl': canon + add, 'expect': 1,
                  'note': 'WebPage + BreadcrumbList JSON-LD from the page\'s own title and description' + ('' if has_card else '; twitter:card summary_large_image (Twitter/X falls back to the og: tags for title, description and image)')})
    # ---- home
    h = read('index.html')
    nl = '\r\n' if '\r\n' in h else '\n'
    anchor = '<!-- DNS preconnect for Mapbox (LCP fix) -->'
    assert h.count(anchor) == 1
    website = ld({'@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#website', 'url': SITE + '/', 'name': BRAND, 'inLanguage': 'en-US'}).replace('\n', nl)
    P.append({'id': 'ZSEO-home-website-jsonld', 'target': 'index.html', 'find': anchor, 'repl': website + nl + '  ' + anchor, 'expect': 1,
              'note': 'a second JSON-LD block (WebSite) next to the existing WebApplication block, which is not touched'})
    navline = '<nav aria-label="Explore the map\'s tools">'
    assert h.count(navline) == 1
    items = []
    for label, page in HOME_TOOLS:
        d = meta(read(page + '.html'), 'description')
        assert d
        items.append('        <li><a href="/%s.html">%s</a> — %s</li>' % (page, html.escape(label, quote=False), html.escape(d, quote=False)))
    block = ('<h2>What each tool does</h2>' + nl + '      <ul>' + nl + nl.join(items) + nl + '      </ul>' + nl +
             '      <p><a href="/privacy.html">Privacy</a> &middot; <a href="/terms.html">Terms</a> &middot; <a href="/user-guide.pdf">User guide (PDF)</a></p>' + nl + '      ')
    P.append({'id': 'ZSEO-home-crawl-text', 'target': 'index.html', 'find': navline, 'repl': block + navline, 'expect': 1,
              'note': '#seo-content (the real text a crawler without JavaScript sees; under the fixed splash, removed when the app mounts): one linked line per tool with the tool page\'s own meta description, and links to the privacy and terms pages and the user guide, which no static page of the site linked to'})
    css = '#seo-content nav a { color: #c9a24b; }'
    assert h.count(css) == 1
    P.append({'id': 'ZSEO-home-crawl-css', 'target': 'index.html', 'find': css,
              'repl': css + nl + '    #seo-content ul { margin: 0 0 0.85rem; padding-left: 1.2rem; }' + nl + '    #seo-content li { margin: 0 0 0.35rem; }' + nl + '    #seo-content li a, #seo-content p a { color: #c9a24b; }', 'expect': 1,
              'note': 'styles the list added by ZSEO-home-crawl-text like the nav beside it (covered by the splash for visitors)'})
    # ---- needs the browser
    ent = '{{ENTRY}}'
    O.append({'id': 'ZSEO-OPT-home-prefetch-entry', 'target': 'index.html', 'find': '<link rel="preconnect" href="https://api.mapbox.com" crossorigin />',
              'repl': '<link rel="preconnect" href="https://api.mapbox.com" crossorigin />' + nl + '  <link rel="prefetch" as="script" href="/assets/' + ent + '" crossorigin />', 'expect': 1,
              'note': 'NEEDS BROWSER VERIFICATION (E2): warms the HTTP cache with the 657 KB (br) entry at idle priority while the splash is shown, so import() after FCP does not wait for the download. Risk: it shares the link with the two media=print stylesheets that the loader waits for (3 s cap) and could delay the boot instead; drop it if FCP, LCP or time-to-interactive regress on a throttled run'})
    ttl = '<title>' + BRAND + '</title>'
    assert h.count(ttl) == 1
    new_title = 'Gettysburg Interactive Battle Map — Animated Map of July 1–3, 1863'
    assert len(new_title) <= 70
    O.append({'id': 'ZSEO-OPT-home-title', 'target': 'index.html', 'find': ttl, 'repl': '<title>' + new_title + '</title>', 'expect': 1,
              'note': 'OWNER DECISION (brand wording of the home title; og:title and twitter:title stay the brand name). Puts "Interactive Battle Map" (the words of the domain and of the target queries) into the one tag Google weighs most for the page. verify_release V6 then lists one identity difference: index.html: title changed ' + json.dumps(BRAND) + ' -> ' + json.dumps(new_title, ensure_ascii=False)})
    for p in PAGES + ['ar']:
        f = p + '.html'
        txt = read(f)
        nl2 = '\r\n' if '\r\n' in txt else '\n'
        m = '<div id="gtbg-footer-mount"></div>'
        assert txt.count(m) == 1, f
        links = ''.join('<a href="/%s.html">%s</a> ' % (pg, html.escape(lb, quote=False)) for lb, pg in HOME_TOOLS if pg != p)
        O.append({'id': 'ZSEO-OPT-footer-links-' + p, 'target': f, 'find': m,
                  'repl': '<div id="gtbg-footer-mount"><nav aria-label="All pages"><a href="/">Home</a> ' + links + '</nav></div>', 'expect': 1,
                  'note': 'NEEDS BROWSER VERIFICATION (E4): static links for crawlers and no-JavaScript visitors; site-nav.js replaces the mount (outerHTML) at DOMContentLoaded. Check no visible flash and CLS 0 on a throttled load'})
    return P, ident, O


def files():
    P, ident, O = build()
    return {
        os.path.join(OUT, 'PG-zseo.json'): dumps({'group': 'PG-zseo', 'description': 'SEO round: JSON-LD (WebPage + BreadcrumbList on 19 pages, WebSite on the home page), twitter:card on 9 pages, crawlable tool list and legal links in the home page\'s static text; sorts after PG-zperf5. Sitemap URL set, titles, descriptions, canonicals unchanged.', 'train': 'R1f', 'patches': P}),
        os.path.join(HERE, 'identity-zseo.json'): dumps({'_doc': 'Identity differences (verify_release.mjs V6) that group PG-zseo causes against the baseline; merge into tools/t0/identity-R1f.json (identity-R1d.json plus these). Generated by tools/t0/seo/gen_zseo.py.',
                                                       'differences': [{'diff': d, 'reason': 'Group PG-zseo: twitter:card added so shared links render as a large-image card; no text, title or description changes.'} for d in ident]}),
        os.path.join(OPT, 'PG-zseo-opt.json'): dumps({'group': 'PG-zseo-opt', 'description': 'NOT REGISTERED. Candidates that change timing or looks; each needs the browser check named in its note.', 'train': 'R1f', 'optional': True, 'patches': O}),
    }


def main(argv):
    check = '--check' in argv
    differs = []
    for p, text in files().items():
        cur = open(p, encoding='utf-8', newline='').read() if os.path.isfile(p) else None
        if cur != text:
            differs.append(os.path.relpath(p, REPO))
            if not check:
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, 'w', encoding='utf-8', newline='') as f:
                    f.write(text)
    print(('differs: ' if check else 'written: ') + (', '.join(differs) if differs else '(nothing)'))
    return 1 if (check and differs) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
