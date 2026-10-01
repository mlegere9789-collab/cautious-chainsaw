#!/usr/bin/env python3
"""Generator for tools/t0/patches/PG-legal.json (WP-DEC-07 interim + INFRA-26) and the two read-only previews.

    python ops/legal-drafts/build_pg_legal.py          # rewrite PG-legal.json and preview/*.html, then self-check

The patch TEXT lives here (readable HTML in Python strings) so counsel and the owner can review it; the JSON the T0 build reads is
generated from it.  Every `find` is cut out of legacy/dist/{privacy,terms}.html, so the anchors cannot drift from the pinned baseline.

STATUS: DRAFT, owner-review-required, not legal advice.  Facts only; every factual sentence is backed by ops/legal-drafts/data-inventory.json
(evidence pointers) and re-checked by ops/legal-drafts/verify-facts.mjs against a built tree.

SHIPPING RULES (release verifier 2026-09-30):
  * the group is OPT-IN: "optional": true in PG-legal.json, so no train contains it unless the build is asked:
        python tools/t0/build.py --train R1c --with PG-legal
  * the shipped bytes carry NO drafting notes.  Owner-to-confirm items live in the patch `note` fields (never published) and in
    ops/legal-drafts/OWNER-SIGNOFF.md (generated here); tools/t0/gate.mjs (check no-owner-notes) and verify-facts.mjs fail a tree whose
    privacy.html or terms.html still contains an owner marker, in a comment or not.
  * the dates are the placeholder {{LEGAL_DATE}}: the build derives "Month D, YYYY" from the pinned ISO value trains.json legal.effective_date
    (the planned deploy day), so a stale hard-coded date cannot ship.  The previews in preview/ show the text with that pinned date.
"""
import html.parser
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
LEGACY = os.path.join(REPO, 'legacy', 'dist')
PG_OUT = os.path.join(REPO, 'tools', 't0', 'patches', 'PG-legal.json')
PREVIEW = os.path.join(HERE, 'preview')

DATE = '{{LEGAL_DATE}}'            # replaced at build time by tools/t0/build.py from trains.json legal.effective_date (pinned, deterministic)
PREV = 'September 7, 2026'         # the previous version's date (a fact about the old text, stays literal)
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
OWNER_ITEMS = []                   # (patch id, text): what the owner must read or confirm; goes to the patch notes and OWNER-SIGNOFF.md, never into a page


def read(name):
    with open(os.path.join(LEGACY, name), 'rb') as fh:
        return fh.read().decode('utf-8')


def cut(text, start, end):
    """The exact original substring from `start` through `end` (both must occur once, in order)."""
    assert text.count(start) == 1, ('start marker count', text.count(start), start)
    a = text.index(start)
    b = text.index(end, a) + len(end)
    return text[a:b]


PV, TM = read('privacy.html'), read('terms.html')
patches = []


def add(pid, target, find, repl, note, owner=()):
    assert isinstance(find, str) and find and find != repl
    assert 'OWNER' not in repl.upper(), ('drafting note inside the shipped text', pid)
    for item in owner:
        OWNER_ITEMS.append((pid, item))
    if owner:
        note = note + ' OWNER TO CONFIRM (not in the page): ' + ' | '.join(owner)
    patches.append({'id': pid, 'target': target, 'find': find, 'repl': repl, 'expect': 1, 'note': note})


def pinned_date():
    """'Month D, YYYY' of trains.json legal.effective_date (the same rule as tools/t0/build.py legal_date_text)."""
    with open(os.path.join(REPO, 'tools', 't0', 'trains.json'), encoding='utf-8') as fh:
        v = json.load(fh)['legal']['effective_date']
    y, m, d = (int(x) for x in v.split('-'))
    return '%s %d, %d' % (MONTHS[m - 1], d, y)


REVIEW = 'OWNER-REVIEW-REQUIRED (legal text; facts only; not legal advice). '

# ------------------------------------------------------------------------------------------------------------- privacy.html
add('legal:pv-css', 'privacy.html',
    'ul { font-family: system-ui, sans-serif; font-size: 15px; line-height: 1.7; }',
    'ul { font-family: system-ui, sans-serif; font-size: 15px; line-height: 1.7; }\n'
    '    .tablewrap { overflow-x: auto; }\n'
    '    table { border-collapse: collapse; width: 100%; font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; margin: 12px 0; }\n'
    '    th, td { border: 1px solid #2a2a3a; padding: 6px 8px; text-align: left; vertical-align: top; }\n'
    '    th { color: #e8d5a3; background: #12121e; }\n'
    '    code { font-size: 13px; }',
    REVIEW + 'Styles for the storage table added below (privacy.html has its own inline <style>; no site-nav.css on this page).')

add('legal:pv-updated', 'privacy.html',
    '<p class="updated">Last updated: September 7, 2026</p>',
    '<p class="updated">Last updated: ' + DATE + ' &middot; <a href="#changes">What changed</a></p>',
    REVIEW + 'The old date (September 7) predates the AR/Watch Together disclosures and the Sep 29 deploy. The new date is the placeholder {{LEGAL_DATE}}: the build prints trains.json legal.effective_date (the publish day), so the page never carries a stale hard-coded date.',
    owner=['Set trains.json legal.effective_date to the production deploy day before the build you deploy (the text itself was checked against the code on 2026-09-30, data-inventory.json verified_on); the date appears at the top of both pages and in the change log of privacy.html.'])

pv_collect_old = cut(PV, '<h2>Information we collect</h2>', '</ul>')
pv_collect_new = '''<h2>Information we collect</h2>
  <p>This site has no accounts, sign-up, forms or comment boxes, and its own code does not ask for your name, email address or precise location. Your browser does contact a few other services directly to show the site, though, and they receive technical information such as your IP address. This page lists every service the site uses, what it receives and when.</p>
  <ul>
    <li><b>Hosting and traffic statistics (Netlify).</b> The site is hosted by Netlify, Inc. Like any web host, Netlify's servers receive your IP address, the pages and files you request, your browser's user-agent, the page you came from and the time of each request, and Netlify keeps server logs. Netlify's server-side analytics turns those logs into aggregate reports for us (page views, unique visitors counted by IP address, referrers, countries, pages not found); we see totals, not individual visitors. See <a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener">Netlify's privacy policy</a>.</li>
    <li><b>Real User Monitoring (Netlify).</b> Each page loads a small script from this site's own address (<code>/.netlify/scripts/rum</code>) that measures how fast the page loads and responds. It sends Netlify (at ingesteer.services-prod.nsvcs.net) the page's hostname and path, the time of the visit, your browser family (such as Chrome or Safari), operating-system family, device type (mobile or desktop), your available screen size, and page-load, layout-stability and responsiveness timings. The script sets no cookies, stores nothing in your browser and does not run inside embedded frames. Like any request, it reaches Netlify along with your IP address.</li>
    <li><b>Mapbox (maps).</b> The main map and the map pages (Compare Moments, Camera Modes, What They Could See, What-If Sandbox, Immersive Mode, The Ground Remembers, Watch Together and Cinematic Export) get their map imagery, styles, fonts and symbols from Mapbox, Inc. (api.mapbox.com). Your browser contacts Mapbox directly, so Mapbox receives your IP address, your browser's user-agent, this site's address (as the referrer) and the map tiles you view. Mapbox's map software also reports usage to events.mapbox.com: a random anonymous identifier that it keeps in your browser's <code>localStorage</code> (keys beginning <code>mapbox.eventData</code>) and replaces about every 24 hours, the software version, a map-session token, the map style and zoom, device pixel ratio, connection type, your browser's user-agent, screen and window sizes, your graphics card's renderer and vendor names, and load timings. That code is Mapbox's, not ours; what Mapbox does with the data is governed by <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener">Mapbox's privacy policy</a>.</li>
  </ul>
  <p>Pages that don't show a map (for example the Casualty Dashboard, Battle Reports, Search Everything and Ask the Historian) load nothing from other companies' servers apart from the Netlify monitoring script described above.</p>

  <h2>Features that contact another service only when you use them</h2>
  <ul>
    <li><b>Virtual Walkthrough (Google Street View).</b> The Virtual Walkthrough, opened from the button on the main map, shows a Google Street View panorama in a frame served by google.com. The frame opens as soon as the Walkthrough does, with the first tour stop, and changes as you pick other stops. Google receives your IP address, your browser details and this site's address (as the referrer); the frame loads its own scripts, fonts and images from Google's servers (for example maps.googleapis.com, maps.gstatic.com and streetviewpixels-pa.googleapis.com); and Google may set or read its own cookies and identifiers, under <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google's privacy policy</a>. This site allows that frame, and no other outside frame, to read your device's motion sensors (accelerometer and gyroscope); Google may use them so that you can look around by moving your device. We don't see anything from that frame, and the site does not contact Google until you open the Walkthrough.</li>
    <li><b>Links to Google Maps and the National Park Service.</b> Some panels link out: "Open in Google Maps", "View on map", "Open Street View at this location" and "NPS Video" links, and Find Your Ancestor links to the NPS Soldiers and Sailors database. They open the other site in a new tab only when you click, and that site's own policy applies there.</li>
    <li><b>NPS Auto Tour video (National Park Service).</b> Some stops of the NPS Auto Tour have a Show Video button. Only when you press it, a video page from the National Park Service (www.nps.gov) opens in a frame. The National Park Service receives your IP address, your browser details and this site's address (as the referrer), under the <a href="https://www.nps.gov/aboutus/privacy.htm" target="_blank" rel="noopener">NPS's privacy practices</a>.</li>
    <li><b>Watch Together, Live Sync (PeerJS, Google, jsDelivr).</b> Building a tour, Export tour and Import tour happen in your browser. Live Sync is optional: it connects two browsers directly with WebRTC, arranged by the free public PeerJS service. Only when you press Host or Join:
      <ul>
        <li>the page downloads the PeerJS code from jsDelivr (cdn.jsdelivr.net), so jsDelivr receives your IP address and browser details (<a href="https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net" target="_blank" rel="noopener">jsDelivr's privacy policy</a>);</li>
        <li>your browser registers with the public PeerJS broker at 0.peerjs.com (over HTTPS and WebSocket) using a peer ID, which for the host contains the 5-letter session code, so the broker sees the code and your IP address;</li>
        <li>PeerJS's default settings also list Google's public STUN server (stun.l.google.com) and PeerJS's relay (TURN) servers (eu-0.turn.peerjs.com and us-0.turn.peerjs.com), which your browser may contact while the connection is set up (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google's privacy policy</a>);</li>
        <li>the other person in the session can learn your IP address, as with any direct WebRTC connection.</li>
      </ul>
      Our code sends only two things between the browsers: the tick number the host is showing and the host's optional note. Anyone who has the session code can join, so share it only with people you trust and keep personal information out of notes. The <a href="https://peerjs.com" target="_blank" rel="noopener">PeerJS</a> broker is a free service run by the PeerJS project; we could not find a privacy policy for it, so we can't tell you how long it keeps its logs.</li>
  </ul>

  <h2>Battlefield AR: camera, location and motion</h2>
  <p>After you press "Start Battlefield AR", the AR page asks your browser for permission to use your rear camera, your location and your device's motion/orientation (compass) sensor. The camera picture is shown on your screen only; it is not recorded or uploaded. Your location is used inside your browser to work out the distance and direction to landmarks, and the compass aims the overlay. The page's only network request is for this site's own landmark data, so none of it is sent to us or to anyone else. You can withdraw permission at any time in your browser or phone settings; no other page of this site asks for your camera or location.</p>

  <h2>Tools that work only on your device</h2>
  <p>Cinematic Export records the map view into a video file on your device; nothing is uploaded. Immersive Mode makes its sound in your browser. Ask the Historian searches this site's own data in your browser, and what you type is not sent anywhere.</p>

  <h2>What is stored on your device</h2>
  <p>Everything in this table stays on your device, except that Mapbox's map software sends its anonymous identifier to Mapbox (see above). You can delete all of it in your browser's site settings.</p>
  <div class="tablewrap">
  <table>
    <thead><tr><th>Name</th><th>What it is for</th><th>What it holds</th><th>How long</th></tr></thead>
    <tbody>
      <tr><td><code>gtbg_onboarded</code> (localStorage)</td><td>Remembers that you finished or skipped the intro tour</td><td>"1"</td><td>Until you clear site data</td></tr>
      <tr><td><code>gtbg_prefs</code> (localStorage)</td><td>Legend and mini-map visibility, intro completed</td><td>A small settings object</td><td>Until cleared</td></tr>
      <tr><td><code>gettysburg_bookmarks</code> (localStorage)</td><td>Your bookmarks</td><td>For each: the moment (tick), a label, the selected unit, map centre and zoom, when you made it and its share link</td><td>Until cleared</td></tr>
      <tr><td><code>gtbg-ef-hidden</code> (localStorage)</td><td>Whether you hid the Extra Features menu</td><td>true or false</td><td>Until cleared</td></tr>
      <tr><td><code>gtbg_watch_together_tour</code> (localStorage)</td><td>The tour you build in Watch Together</td><td>Your stops (tick numbers) and notes</td><td>Until cleared</td></tr>
      <tr><td><code>mapbox.eventData</code>, <code>mapbox.eventData.uuid</code>, <code>mapbox.eventData.uuidTimestamp</code> (localStorage, each followed by a colon and a short identifier)</td><td>Mapbox's map software: its anonymous identifier and reporting state</td><td>A random ID and timestamps</td><td>The ID is replaced about every 24 hours</td></tr>
      <tr><td><code>gtbg_layout</code> (sessionStorage)</td><td>Remembers that you switched to the desktop layout in this tab</td><td>"desktop"</td><td>Until you close the tab</td></tr>
      <tr><td><code>gtbg_chunk_reload</code>, <code>gtbg_boot_retry</code> (sessionStorage)</td><td>Stop the page from reloading itself more than once if one of its files fails to load</td><td>"1"</td><td>Until you close the tab</td></tr>
      <tr><td><code>gbg-r0-&hellip;</code> (Cache Storage)</td><td>Copies of this site's own script and style files, so repeat visits load faster</td><td>Only files from this site's <code>/assets/</code> folder</td><td>Replaced when the site is updated</td></tr>
      <tr><td><code>mapbox-tiles</code> (Cache Storage)</td><td>Map tiles kept by Mapbox's map software for faster panning</td><td>Map tiles</td><td>Managed by Mapbox's software</td></tr>
    </tbody>
  </table>
  </div>
  <p>The cache entries are kept by a service worker (<code>/sw.js</code>) that never handles pages or data files.</p>'''
add('legal:pv-collect', 'privacy.html', pv_collect_old, pv_collect_new,
    REVIEW + 'Replaces the four-bullet list. Corrects: Street View is the Virtual Walkthrough frame (bundle.pretty.js:110661), not documentary/report pages; Referer is origin-only (Referrer-Policy strict-origin-when-cross-origin). Adds: Netlify logs/analytics, RUM fields (live script inspected), Mapbox events (POST bodies captured from a real R1c load), Google and NPS links, NPS frame (Show Video, off by default), Watch Together PeerJS/jsDelivr/STUN/TURN (peerjs@1.5.4 defaults read from the file; jsDelivr is contacted on Host/Join since the WP-T0-13 change in PG-maps, page load in legacy), AR permissions (ar.html:160-193), on-device tools, storage/cache inventory. See ops/legal-drafts/data-inventory.json for every evidence pointer. True for trains >= R0 only (R0 removes the index.html preconnect hints to Google and Mapbox tile/event hosts). The Street View frame sentence about motion sensors is true only for R1c with the CP+walkthrough-sensors patch (iframe allow attribute) AND the generated Permissions-Policy that names https://www.google.com for accelerometer and gyroscope on / (tools/t0/config/gen.mjs; ops/header-decisions.md); verify-facts.mjs checks both.',
    owner=['Netlify Web Analytics is switched on for this site (Netlify dashboard, Project > Web Analytics; register open question O-12). If it is not, delete the second sentence of the "Hosting and traffic statistics" item. The Netlify plan is not mentioned on purpose.',
           'Netlify Real User Monitoring stays switched on (today it is: Netlify injects the script into all 27 pages). If you switch it off, delete the "Real User Monitoring" item.',
           'The Street View frame may use motion sensors (accelerometer, gyroscope) because the site delegates them to it (iframe allow + Permissions-Policy), which every R1c build does with or without this text (so the Walkthrough logs no Google console error); the sentence here is what makes the privacy page say so. Check it on a real phone; if you would rather not share motion sensors with Google, delete tools/t0/patches/CP+walkthrough-sensors.json (the generator then keeps / fully off) and the sentence "This site allows that frame ... moving your device" here (the Walkthrough then keeps logging Google\'s own accelerometer console error, as it always did).'])

pv_dont_old = cut(PV, "<h2>What we don't do</h2>", '</p>')
add('legal:pv-dont', 'privacy.html', pv_dont_old,
    "<h2>What we don't do</h2>\n"
    "  <p>No account creation, no email collection, no advertising trackers or advertising cookies, and no analytics service other than Netlify's own hosting statistics and monitoring and the usage reports built into Mapbox's map software, both described above. We don't sell your data.</p>",
    REVIEW + 'The old text promised "no third-party analytics beyond the performance monitoring" and "no selling or sharing of any data" although Netlify statistics and Mapbox usage events exist and providers receive IP addresses. The no-sale promise the owner already made is kept; the "sharing" promise is dropped because the providers receive data directly from the browser.')

pv_cookies_old = cut(PV, '<h2>Cookies</h2>', '</p>')
add('legal:pv-cookies', 'privacy.html', pv_cookies_old,
    '<h2>Cookies</h2>\n'
    "  <p>This site does not set its own cookies. Netlify's monitoring script sets none, and when we last checked (" + DATE + ") Mapbox's map software set none on this site. Google (Street View and Google Maps) and the National Park Service may set their own cookies if you open their frames or pages, under their own policies linked above.</p>",
    REVIEW + 'Own-cookie claim verified: no document.cookie in dist or bundle (verify-facts.mjs), no Set-Cookie on 8 live URLs, probe cookie jar empty after a real Mapbox session and after opening the Walkthrough. Third-party wording stays hedged ("may").')

pv_children_old = cut(PV, "<h2>Children's privacy</h2>", '</p>')
add('legal:pv-children', 'privacy.html', pv_children_old,
    "<h2>Children's privacy</h2>\n"
    "  <p>This site is often used in classrooms. It has no accounts or sign-up and does not ask any visitor, including students, for personal information. Like any website, though, the services described above receive IP addresses and browser details when a page or feature contacts them. Teachers may want to remind students not to type personal information into Watch Together notes, which everyone in a live session can see.</p>",
    REVIEW + 'The old sentence "collects no personal information from any visitor" is too absolute (IP addresses reach Netlify, Mapbox, Google). No COPPA/GDPR age wording is added (register D-LEGAL: needs counsel).')

pv_changes_old = cut(PV, '<h2>Changes to this policy</h2>', '</p>')
add('legal:pv-changes', 'privacy.html', pv_changes_old,
    '<h2 id="changes">Changes to this policy</h2>\n'
    '  <p>If what this site collects or how it works changes, this page will be updated and the date at the top will change.</p>\n'
    '  <ul>\n'
    "    <li><b>" + DATE + ".</b> Corrected the Street View entry (it is in the map's Virtual Walkthrough, not on documentary and report pages) and added what the previous version left out: Netlify's hosting logs and analytics and what its monitoring sends, what Mapbox's map software reports, the Google Maps and National Park Service links and the NPS video frame, Watch Together's live sync (PeerJS, Google STUN, jsDelivr), the camera, location and motion permissions used by Battlefield AR, every item stored on your device, and the fact that our hosting and map providers receive IP addresses.</li>\n"
    '    <li><b>' + PREV + '.</b> Previous version.</li>\n'
    '  </ul>',
    REVIEW + 'Dated change log (register D-LEGAL step 1: "dated with a change log").')

# ---------------------------------------------------------------------------------------------------------------- terms.html
add('legal:tm-updated', 'terms.html',
    '<p class="updated">Effective date: September 7, 2026</p>',
    '<p class="updated">Effective date: ' + DATE + ' (previous version: ' + PREV + ')</p>',
    REVIEW + 'The Terms say the effective date changes when the terms change; two sentences below change, so it does. The date is the placeholder {{LEGAL_DATE}} (trains.json legal.effective_date), same as privacy.html.',
    owner=['The effective date is the pinned publish day (trains.json legal.effective_date).',
           'Terms: "the written vignette scripts are the creator\'s own work" (live text, unchanged) cannot be confirmed from the repository (four data notes cite a "Gettysburg Animated YouTube vignette", register action 10a): left as is, flagged.'])

tm_acc_old = 'Where the underlying source data disagrees with itself, this site notes the discrepancy rather than silently picking one number.'
assert TM.count(tm_acc_old) == 1
add('legal:tm-accuracy', 'terms.html', tm_acc_old,
    'Where the underlying source data disagrees with itself, this site does not yet flag every discrepancy, so treat the numbers as estimates and check the primary sources.',
    REVIEW + 'Contradicted by reality: the only visible discrepancy note in the site is the Casualty Dashboard footnote (dashboard.html:257-264), which WP-T0-12 deletes as a developer note; elsewhere the site picks a figure without noting the disagreement (pages-C-76/84). This replaces a promise the site does not keep with a statement it can keep. It adds no new promise.')

add('legal:tm-thirdparty', 'terms.html',
    '<h2>Intellectual property</h2>',
    '<h2>Third-party services</h2>\n'
    '  <p>Parts of this site use services run by other organizations: maps and map imagery from Mapbox, Street View and Google Maps links from Google, videos and links from the National Park Service, and live sync from PeerJS and jsDelivr. Those services are provided by those organizations, not by us, and their own terms and privacy policies apply when you use those parts. The <a href="/privacy.html">Privacy Policy</a> lists what each of them receives.</p>\n'
    '\n'
    '  <h2>Intellectual property</h2>',
    REVIEW + 'WP-INFRA-26 step 3 ("Terms: only the embed sentence and third-party statement now"). States who provides what; no licence, warranty or liability language. The embed sentence ("embedding its widget on your own page") is deliberately NOT edited here: it is true because the generated _headers (WP-T0-15, tools/t0/config/gen.mjs) frees /embed and /embed.html (frame-ancestors *, no X-Frame-Options); verify-facts.mjs checks that against _headers.')


# ------------------------------------------------------------------------------------------------------------------- emit
def apply_all(name, text):
    for p in patches:
        if p['target'] != name:
            continue
        n = text.count(p['find'])
        assert n == p['expect'], (p['id'], 'expected', p['expect'], 'found', n)
        text = text.replace(p['find'], p['repl'])
    return text


class Balance(html.parser.HTMLParser):
    VOID = {'meta', 'link', 'br', 'hr', 'img', 'input'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.errors = [], []

    def handle_starttag(self, tag, attrs):
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        if not self.stack or self.stack[-1] != tag:
            self.errors.append('unbalanced </%s> (open: %s)' % (tag, self.stack[-3:]))
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag:
                    pass
        else:
            self.stack.pop()


def check_html(name, text):
    b = Balance()
    b.feed(text)
    b.close()
    problems = list(b.errors) + (['unclosed: %s' % b.stack] if b.stack else [])
    # no drafting note anywhere in the shipped bytes: not visible, not in an HTML comment (release verifier 2026-09-30)
    if re.search(r'OWNER[ _-]TO[ _-]CONFIRM|OWNER[ -]REVIEW', text, flags=re.I):
        problems.append('an owner marker is present (visible or in a comment)')
    if re.search(r'<!--.*?(owner|TODO|FIXME|draft).*?-->', text, flags=re.S | re.I):
        problems.append('an HTML comment mentions owner/TODO/draft')
    if 'September 30, 2026' in text:
        problems.append('a hard-coded September 30, 2026 date (use the placeholder)')
    return problems


def render_signoff():
    """ops/legal-drafts/OWNER-SIGNOFF.md: every owner-to-confirm item (these used to be HTML comments in the page source)."""
    L = ['# Owner sign-off list for PG-legal (DRAFT; generated by build_pg_legal.py: edit the generator, not this file)', '',
         'The group is OPT-IN (not in any train unless `python tools/t0/build.py --train R1c --with PG-legal`). These items used to be `[OWNER TO CONFIRM]`',
         'HTML comments inside the page source; they are now kept only here and in the patch `note` fields of tools/t0/patches/PG-legal.json, which are never published.',
         'tools/t0/gate.mjs (check `no-owner-notes`) fails any build whose shipped files still contain such a marker.', '']
    for i, (pid, item) in enumerate(OWNER_ITEMS, 1):
        L.append('%d. `%s`: %s' % (i, pid, item))
    L.append('')
    with open(os.path.join(HERE, 'OWNER-SIGNOFF.md'), 'wb') as fh:
        fh.write(('\n'.join(L)).encode('utf-8'))
    print('wrote ops/legal-drafts/OWNER-SIGNOFF.md (%d items)' % len(OWNER_ITEMS))


def render_inventory_md():
    """ops/legal-drafts/data-inventory.md, rendered from data-inventory.json (the fact base; edit the JSON, not the .md)."""
    inv = json.load(open(os.path.join(HERE, 'data-inventory.json'), encoding='utf-8'))
    L = ['# Data-flow inventory (facts only) - DRAFT', '',
         '<!-- GENERATED by ops/legal-drafts/build_pg_legal.py from data-inventory.json. Edit the JSON. -->', '',
         inv['status'], '',
         'Verified %s against: %s' % (inv['verified_on'], inv['verified_against']), '',
         'Re-check any built tree with `node ops/legal-drafts/verify-facts.mjs --dist release/R1c/dist` (fails on an undisclosed host, storage key, cookie write, permission use, missing policy mention, an unbacked frame permission, or an owner marker in the page source).', '',
         '## Origins', '', '| Id | Who | Hosts | When | Receives | Evidence |', '|---|---|---|---|---|---|']
    for o in inv['origins']:
        L.append('| %s | %s | %s | %s | %s | %s |' % (o['id'], o['who'], ', '.join(o['hosts']), o['when'], '; '.join(o['receives']), '<br>'.join(o['evidence']).replace('|', '/')))
        if o.get('owner_confirm'):
            L.append('| | | | | **owner confirms:** %s | |' % o['owner_confirm'].replace('|', '/'))
    L += ['', '## Hosts that appear in code but are never contacted (ignored by the verifier)', '', '| Host | Why |', '|---|---|']
    for h, w in inv['ignored_hosts'].items():
        L.append('| %s | %s |' % (h, w))
    L += ['', '## Storage', '', '| Store | Key | Purpose | Holds | Kept | Evidence |', '|---|---|---|---|---|---|']
    for store in ('localStorage', 'sessionStorage', 'cacheStorage'):
        for k in inv['storage'][store]:
            L.append('| %s | `%s` | %s | %s | %s | %s |' % (store, k['key'], k['purpose'].replace('|', '/'), k['holds'].replace('|', '/'), k['kept'], k['evidence'].replace('|', '/')))
    L += ['', '- Cookies: %s' % inv['storage']['cookies'], '- IndexedDB: %s' % inv['storage']['indexedDB'], '',
          '## Device permissions', '']
    for d in inv['device_permissions']:
        L.append('- **%s** (%s): %s. When: %s. Leaves the device: %s. Evidence: %s' % (d['id'], d['page'], '; '.join(d['permissions']), d['when'], d['leaves_device'], d['evidence']))
    L += ['', '## Frame permission delegations (a third-party frame allowed to use a device feature)', '']
    for d in inv.get('frame_permissions', []):
        L.append('- **%s** (%s): frame %s may use %s. How: %s. When: %s. Leaves the device: %s. Evidence: %s' % (d['id'], d['page'], d['frame'], ', '.join(d['delegated']), d['mechanism'], d['when'], d['leaves_device'], d['evidence']))
    L += ['', '## Work that stays on the device', '']
    for d in inv['on_device_only']:
        L.append('- **%s**: %s (%s)' % (d['id'], d['what'], d['evidence']))
    L += ['', '## Not knowable from outside', '']
    for u in inv['unknowable_from_outside']:
        L.append('- ' + u)
    with open(os.path.join(HERE, 'data-inventory.md'), 'wb') as fh:
        fh.write(('\n'.join(L) + '\n').encode('utf-8'))
    print('wrote ops/legal-drafts/data-inventory.md')


def main():
    new = {'privacy.html': apply_all('privacy.html', PV), 'terms.html': apply_all('terms.html', TM)}
    for name, text in new.items():
        probs = check_html(name, text)
        if probs:
            print('HTML CHECK FAILED', name, probs)
            return 1
    group = {
        'group': 'PG-legal',
        'train': 'R1c',
        'optional': True,
        'description': ('OPT-IN, OWNER-REVIEW-REQUIRED - LEGAL TEXT (WP-DEC-07 interim privacy correction + the Terms sentences that contradict reality). '
                        'Facts only, not legal advice. NOT part of any train unless the build is asked: python tools/t0/build.py --train R1c --with PG-legal. '
                        'Before deploying such a build the owner reads the previews in ops/legal-drafts/preview/ and the sign-off list ops/legal-drafts/OWNER-SIGNOFF.md '
                        '(the notes are in the patch note fields, never in the shipped pages). The dates are the placeholder {{LEGAL_DATE}}, derived at build time from '
                        'trains.json legal.effective_date. True only for trains built on the R0 mechanism (the legacy index.html preconnect hints contact Google and '
                        'Mapbox hosts at page load); the Street View sensor sentence is true only with the R1c headers and CP+walkthrough-sensors.json (verify-facts fails a tree where it is not); the Terms embed sentence'
                        'relies on the generated _headers freeing /embed. Generated by ops/legal-drafts/build_pg_legal.py; re-checked by ops/legal-drafts/verify-facts.mjs.'),
        'patches': patches,
    }
    os.makedirs(os.path.dirname(PG_OUT), exist_ok=True)
    with open(PG_OUT, 'wb') as fh:
        fh.write((json.dumps(group, indent=1, ensure_ascii=False) + '\n').encode('utf-8'))
    os.makedirs(PREVIEW, exist_ok=True)
    when = pinned_date()
    for name, text in new.items():
        stem = name[:-5]
        with open(os.path.join(PREVIEW, '%s.interim-R1c.html' % stem), 'wb') as fh:       # what the build prints with the pinned date
            fh.write(text.replace(DATE, when).encode('utf-8'))
    print('wrote', os.path.relpath(PG_OUT, REPO), '(%d patches)' % len(patches))
    print('wrote preview/privacy.interim-R1c.html, preview/terms.interim-R1c.html (dated %s, trains.json legal.effective_date)' % when)
    render_signoff()
    render_inventory_md()
    return 0


if __name__ == '__main__':
    sys.exit(main())
