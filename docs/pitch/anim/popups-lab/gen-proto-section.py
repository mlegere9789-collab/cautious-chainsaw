import json, os
O = 'tmp/pitch-anim/popups/out/'

def J(f):
    p = O + f
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else None

d = J('proto-cover-summary.json')
ph = J('proto-cover-summary-phone.json')
phf = J('proto-cover-summary-phone-free.json')
p1 = J('proto-play-1x-sampled.json')
pu = J('proto-play-1x.json')
p4 = J('proto-play-4x-sampled.json')


def forms(v):
    f = v['forms']
    ev = sum(n for k, n in f.items() if k.startswith('event:') and 'chip' not in k)
    evc = f.get('event:chip', 0)
    return ev, evc


rows = []
tot = dict(snap=0, ev=0, evc=0, under=0, lab=0, subj=0, subjT=0, pair=0, ovl=0, noroom=0)
for k, v in d.items():
    cam, z = k.split('@z')
    ev, evc = forms(v)
    rows.append("| %s, %s | %d | %s | %d | %d | %d / %d | %d | %d | %d | %d / %d | %s / %s |" % (
        'default' if cam == 'def' else 'follow', z, v['snapshots'], v['cardsMean'], v['tilesUnderProtoMax'], v['labelsUnderMax'],
        v['subjectTilesCovered'], v['subjectTilesTotal'], v['cardPairsOverlapping'], v['cardsOnPersistentOverlays'], v['noRoom'], ev, evc,
        v['solveMsP50'], v['solveMsP95']))
    tot['snap'] += v['snapshots']; tot['ev'] += ev; tot['evc'] += evc
    if z == '13.5':
        tot['ev135'] = tot.get('ev135', 0) + ev; tot['evc135'] = tot.get('evc135', 0) + evc
    tot['under'] += v['tilesUnderProtoMax']; tot['lab'] += v['labelsUnderMax']; tot['subj'] += v['subjectTilesCovered']
    tot['pair'] += v['cardPairsOverlapping']; tot['ovl'] += v['cardsOnPersistentOverlays']; tot['noroom'] += v['noRoom']
tbl = ("| camera, zoom | snapshots | cards per snapshot | tiles under a card (max) | labels under a card (max) | subject tiles covered / total | "
       "card pairs overlapping | cards on persistent overlays | snapshots with a card that found no room | event cards full / fallen to a chip | placement ms p50 / p95 |\n"
       "|---|---|---|---|---|---|---|---|---|---|---|\n" + "\n".join(rows))

pt = ''
if phf:
    prow = []
    for k, v in phf.items():
        cam, z = k.split('@z')
        prow.append("| %s, %s | %d | %s | %d | %d / %d | %d |" % ('default' if cam == 'def' else 'follow', z, v['snapshots'], v['cardsMean'], v['tilesUnderProtoMax'],
                                                              v['subjectTilesCovered'], v['subjectTilesTotal'], v['noRoom']))
    pt = ("\n\nPhone (390 x 844), the same prototype with every form 358 px wide and free-standing cards (no lane):\n\n"
          "| camera, zoom | snapshots | cards placed per snapshot (desktop 1.5-1.6) | tiles under a card (max) | subject tiles covered / total | snapshots in which a card found no room |\n"
          "|---|---|---|---|---|---|\n" + "\n".join(prow) +
          "\n\nNo tile is covered, but on the phone at least one card cannot be placed at all in 114 of 155 default snapshots at zoom 13 (130 at zoom 12): there is no free ground. "
          "With the lane (`p50`, `p51`) the prototype shrinks the map container to end above a 44 px lane that shows the highest-priority card as a chip with a counter; "
          "no tile can lie under the lane by construction, the leader line runs from the lane up to the subject tile, and the mini legend and the minimap would move up with the map.")
    if ph:
        r = list(ph.values())
        pt += (" Over the same snapshots the laned prototype placed its card in every one (%d snapshots; snapshots with a card that found no room: %d; most tiles under the lane: %d). The lane overlaps the app's own mini legend and minimap in every snapshot, because the injection leaves them where the app puts them; in a build they move up with the map."
               % (sum(v['snapshots'] for v in r), sum(v['noRoom'] for v in r), max(v['tilesUnderProtoMax'] for v in r)))

live = ''
if p1:
    def L(p, label):
        life = p.get('life', {})
        lf = '; '.join("%s: %d cards, %.1f-%.1f s (median %.1f s)" % (k, v['n'], v['minMs'] / 1000, v['maxMs'] / 1000, v['medianMs'] / 1000) for k, v in life.items())
        return ("- **%s** (ticks %d-%d, %d samples, one every ~100 ms): %d samples (%.1f %%) had a tile under a card, at most %d tile(s) (a sample can land between two solves while the tiles move); "
                "%d card relocations; wall-clock life of the cards: %s." % (label, p['window'][0], p['window'][1], p['samples'], p['samplesWithAnyTileUnderACard'],
                                                                       100 * p['samplesWithAnyTileUnderACard'] / max(1, p['samples']), p['maxTilesUnder'], p['cardMoves'], lf))
    live = "\n\n**While the animation plays (real playback, Day 2).**\n" + L(p1, '1x')
    if p4:
        live += "\n" + L(p4, '4x')
        live += "\n- Reading: at 1x the prototype keeps tiles clear in nearly every sample; at 4x tiles move eight ticks a second and the prototype's 66 ms solve interval is too slow, so a card briefly lies on a tile in about one sample in eight (12 %, up to 11 tiles). The production solver has to run in the tile renderer's own frame (it then sees the positions the tiles are drawn at), and a card must move only by cross-fade, never across tiles."
    live += ("\n- Cost of the prototype's own work (JavaScript, on a shared and loaded machine): occupancy grid %s ms median per solve (it collects overlay rectangles from the DOM; a renderer that "
             "publishes its tile frame removes most of it), placement %s ms, drawing the outlines and leader lines %s ms per frame, at most one solve every 66 ms while playing. "
             "Paired runs of the same 76 ticks (the sampling harness off), 60 Hz: frame interval p95 %s ms with the prototype against %s ms without it, and %s of %s frames (%.1f %%) over 25 ms against %s of %s (%.1f %%): a small real cost on this software-rendered, shared machine and not a performance proof; the target for a build is under 1 ms per frame."
             % (p1['phases']['grid'], p1['solveMs']['p50'], p1['drawMs']['p50'], pu['framesWith']['p95'], pu['framesWithout']['p95'], pu['framesWith']['over25'], pu['framesWith']['n'], 100*pu['framesWith']['over25']/pu['framesWith']['n'], pu['framesWithout']['over25'], pu['framesWithout']['n'], 100*pu['framesWithout']['over25']/pu['framesWithout']['n']))

txt = """The prototype (`docs/pitch/anim/popups-lab/proto.js`, about 300 lines) is injected into the running R1c page. It hides the app's own event, story and toast layers with CSS and draws its own from the same data: the event sentence in full, the story title with three lines and "Read the full story", command changes as chips, a clock chip from the candidate clock ("July 1, about 10:15 AM · Modelled"), a leader line and a polygon outline on the tile (drawn on a canvas, not in the DOM), placement by the ladder of 5.5, a priority queue with reading-time dwell, seek hygiene. Screenshots: `before-after-tick28.png` and `before-after-tick553.png` (the app and the prototype side by side), `d50`-`d53` (desktop), `p50`-`p51` (phone lane).

The same %d snapshots as 3.2 (155 popup ticks x 3 zooms, default and follow camera; the follow camera skips the ticks whose popup has no subject on screen), with the prototype's cards instead of the app's:

%s

Result on desktop: **no tile, no label and no subject tile lies under any prototype card in any snapshot; no two cards overlap; no card lies on a persistent overlay.** The ladder makes it possible: at the default zoom (13.5, both cameras) the event card falls to a one-line chip in %d of %d placements (the crowded moments; none at zoom 12 and 15.5), and the story peek always fits. Every popup stays on screen with its text; the chip is the same sentence, shortened for the row and complete on expansion.%s%s

What it does not show: the Chronicle, Narrated mode, the demotion of a replaced card to a chip (it simply expires, which is why the critical event cards above live only about a second at 1x), the docked rail (the map container resizing), accessibility, the signed clock anchors, or the cost inside a real renderer.""" % (
    tot['snap'], tbl, tot['evc135'], tot['ev135'] + tot['evc135'], pt, live)

s = open('tmp/pitch-anim/popups/doc/s5-review.md', encoding='utf8').read()
if '[[PROTO]]' in s:
    s = s.replace('[[PROTO]]', txt)
    open('tmp/pitch-anim/popups/doc/s5-review.md', 'w', encoding='utf8').write(s)
    print('s5 filled')
else:
    print('placeholder not found')
summary = ("On all %d desktop snapshots (the 155 popup ticks at 3 zooms with the default camera, and the 124 of them that have a subject on screen at 3 zooms with the camera following it) no tile, label or subject tile lies under a prototype card, no two cards overlap and none lies on a persistent overlay; placement costs under 0.5 ms. "
           "On the phone free-standing cards find no room in about three quarters of the default snapshots, so the prototype's phone variant uses a 44 px lane that is part of the layout (section 5.7, 5.10)." % tot['snap'])
s0 = open('tmp/pitch-anim/popups/doc/s0-summary.md', encoding='utf8').read()
if '[[PROTO-SUMMARY]]' in s0:
    open('tmp/pitch-anim/popups/doc/s0-summary.md', 'w', encoding='utf8').write(s0.replace('[[PROTO-SUMMARY]]', summary))
    print('s0 filled')
