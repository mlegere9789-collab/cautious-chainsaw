"""Second-reading patches of the tl-03 close-out (2026-11-16), applied by build.py to the row data of rows_a.py, rows_b.py and rows_c.py
before any quote is matched.  Purpose: the claim-to-quote tie.  In a reading of every documented sub-claim against the quotes stored for it,
the claim went beyond its quote in a number of places (the quote stopped before the clause that the claim states, or the clause stood in the
sentence before it); in a few places the headline text of a row (event) stated a detail that no quote of the row covers.  Each case is
repaired here in one of three ways: the quote is extended to the verbatim passage that covers the whole claim (patch_quotes.json, generated
from the stored offsets by anchoring phrases, re-matched by build.py); a citation is added; or the wording of the claim is brought back to what
the passage says.  Nothing is removed from the evidence; a quote only grows.  build.py stops if any quote here is not found verbatim in the
local text, is found in another report than stated, or on another printed page than stated."""
import json, os, re
from rowlib import OR, L, sc

HERE = os.path.dirname(os.path.abspath(__file__))
PQ = json.load(open(os.path.join(HERE, 'patch_quotes.json'), encoding='utf-8'))


def _n(s):
    return re.sub(r'\s+', ' ', s.replace('- ', '').replace('’', "'")).strip().lower()


# report ids and library sources of the added citations (the page is the one the generator read from the leaf map; build.py checks it again)
NEW_META = {
    ('T1-134', 'h_brock'): dict(report='OR27-2-R549'),
    ('T1-145', 's_inch'): dict(report='OR27-1-R253'),
    ('T1-120', 'h_route'): dict(report='OR27-1-R243'),
    ('T1-141', 'r_succ'): dict(report='OR27-1-R043'),
    ('T1-145', 'how245'): dict(report='OR27-1-R243'),
    ('T1-145', 'h2'): dict(report='OR27-2-R472'),
    ('T1-131', 'r_org'): dict(report='OR27-2-R506'),
    ('T1-159', 'org_art'): dict(report='OR27-1-R009'),
    ('T1-139', 'tp_req'): dict(src='TPIERCE-1889'),
    ('T1-127', 'tp_dig'): dict(src='TPIERCE-1889', note='Tillie Pierce, At Gettysburg (1889), the chapter on her home during the battle: a recollection written long after; no hour and no profile of the works'),
    ('T1-168', 'tp_garret'): dict(src='TPIERCE-1889', note='Tillie Pierce, At Gettysburg (1889), the chapter on her home during the battle: the house is in the town, the garret is that of the adjoining house'),
    ('T1-141', 'ny_prey'): dict(src='NY-GB-1900-v2', note='the sketch of the 104th New York in the New York volume of 1900 (Colonel Gilbert G. Prey)'),
    ('T1-172', 'ny_prey'): dict(src='NY-GB-1900-v2', note='the sketch of the 104th New York in the New York volume of 1900 (Colonel Gilbert G. Prey)'),
}

NOTES = {   # appended to the row's recheck text (becomes recheck_applied)
    'T1-117': 'Second reading 2026-11-16: the quote of the 10.15 a. m. death of Reynolds now carries the sentence before it; the claim on Doubleday takes command is worded as the two quotes state it.',
    'T1-118': 'Second reading 2026-11-16: the quote of Ewell now runs to the end of the clause (the flank of the same body).',
    'T1-119': 'Second reading 2026-11-16: the quotes now cover the position of Archer and Davis before the reserve (within a mile of the town) and the half hour, the half mile and the skirt of woods.',
    'T1-120': 'Second reading 2026-11-16: Howard\'s sentence on the routes of the three divisions is added (First Division by the direct route, Third and Second by Horner\'s Mill); the claim on the First Division no longer rests on a clause the quote did not contain.',
    'T1-122': 'Second reading 2026-11-16: the quotes of Robinson and Coulter now run to the end of the sentence (the two positions of the First Brigade; the ammunition exhausted and the relief).',
    'T1-124': 'Second reading 2026-11-16: the letter of Apr 5 1876 now carries its date line and the clause on Anderson\'s division; Pendleton\'s clause on the artillery and the sentence on Heth are covered; Longstreet is no longer named in the claim on Fremantle (the quote does not name him).',
    'T1-125': 'Second reading 2026-11-16: the quotes now run to the clauses the claims state (the flank; Hays in the centre, Smith in rear of Hoke).',
    'T1-127': 'Second reading 2026-11-16: Steinwehr\'s sentence is extended to the reserve artillery found in position and to Smith\'s Second Brigade on the north-west; a civilian recollection of the night digging on Cemetery Hill is added (Tillie Pierce 1889, found in the library text: "chopping, picking and shoveling" and "forming their line of breastworks", no hour, no profile).',
    'T1-130': 'Second reading 2026-11-16: the quotes now carry the skirmishers (97th New York) and the order that took the wall (104th New York).',
    'T1-131': 'Second reading 2026-11-16: the regimental commanders of the brigade named in the unit are cited from Rodes\' report.',
    'T1-132': 'Second reading 2026-11-16: the quote of the 104th New York sketch now carries the move north that the claim states.',
    'T1-133': 'Second reading 2026-11-16: Davis\' quote now carries "moving in line perpendicular to ours".',
    'T1-134': 'Second reading 2026-11-16: Heth\'s sentence on Brockenbrough (held in check on the left, then drove the enemy in confusion) is cited.',
    'T1-136': 'Second reading 2026-11-16: Doubleday\'s sentence now carries Meredith\'s brigade (the covering brigades) before the intrenchments.',
    'T1-137': 'Second reading 2026-11-16: Wainwright\'s sentence now carries the enemy\'s skirmishers that fired from the paling fence.',
    'T1-139': 'Second reading 2026-11-16: the headline text called the Weikert farm Tillie Pierce\'s grandparent\'s; the memoir says Jacob Weikert was the father of Mrs. Schriver, the neighbour with whom she went (corrected); the quotes now carry the request that she accompany Mrs. Schriver and her parents\' consent, the way out Baltimore Street into the cemetery, the pump and the night, and her walk home with Mrs. Schriver and the children.',
    'T1-141': 'Second reading 2026-11-16: the quotes now carry the ammunition and the relief and the part posted to protect the flank; the commanders of the brigade after Paul\'s fall are cited (Robinson: Colonels Leonard, Root and Coulter; the 104th New York sketch of 1900: Colonel Prey took command by Robinson\'s order and kept it until the close of the first day\'s engagement); the two accounts are carried as scenarios, no default.',
    'T1-143': 'Second reading 2026-11-16: Hancock\'s sentence now carries his staff (Lieut. Col. Morgan, Captain Hall) and the First and Eleventh Corps retiring through the town.',
    'T1-144': 'Second reading 2026-11-16: Gordon\'s quotes now carry the rapid advance and the line on the crest of a hill.',
    'T1-145': 'Second reading 2026-11-16: the scenarios on the hour (Howard 2.45; Hays a little after 2) had no citation and now carry theirs; Schurz\'s sentence on the First Brigade (contesting every inch of ground) is cited; the organization quote now carries the Second Brigade (Ames, Harris); Early\'s quote runs to the order to Hays and Hoke and to the fire opened with considerable effect.',
    'T1-150': 'Second reading 2026-11-16: the headline no longer says the line made its stand behind a barricade of rails (the sentences cited say the intrenchments in front of the seminary).',
    'T1-152': 'Second reading 2026-11-16: Jones\' quote now carries the order to fall back that the 26th did not receive and Pender\'s division passing over it.',
    'T1-154': 'Second reading 2026-11-16: the 45th New York quote now carries Hagy\'s farm and the Mummasburg road; the inference on the hour of the rally is moved to the open gap on the hour.',
    'T1-155': 'Second reading 2026-11-16: Gamble\'s quote now carries "kept up the fire until the enemy approached so near".',
    'T1-157': 'Second reading 2026-11-16: Howard\'s quote now carries Schurz\'s request for a brigade; Ewell\'s quote now carries the sentence on Early entering by the railroad and Rodes by the Cashtown road.',
    'T1-159': 'Second reading 2026-11-16: Wainwright\'s sentence now carries the order to Stevens, the fourth caisson (struck by a shell and destroyed) and Cemetery Hill with the Eleventh Corps batteries; Doubleday\'s sentence carries the heavy loss; the batteries of the unit are cited from the organization of the army.',
    'T1-160': 'Second reading 2026-11-16: Doubleday\'s sentences now carry the troops overpowered, the retreat made in comparative safety, and the hostile bayonets around the building.',
    'T1-161': 'Second reading 2026-11-16: the Maine quote now carries the two lines that struck the regiment at the same time and Colonel Tilden\'s share.',
    'T1-163': 'Second reading 2026-11-16: the quote of Pierce 1914 now carries the sentence that names Hancock; Hancock\'s sentence carries his staff and the retiring corps.',
    'T1-164': 'Second reading 2026-11-16: Hancock\'s communication to Meade is quoted from the sentence that begins it; Howard\'s letter to the end of the sentence; the headline no longer says "about noon" for Howard\'s choice of Cemetery Ridge (he gives about 11.30 for the news of Reynolds\' death and no hour for the choice).',
    'T1-165': 'Second reading 2026-11-16: Brabble\'s quote now carries the stone barn; Lewis\' quote the colors.',
    'T1-166': 'Second reading 2026-11-16: Schurz\'s sentence and Steinwehr\'s sentence now run through the clauses the claims state.',
    'T1-168': 'Second reading 2026-11-16: Hill\'s quote now carries his own two divisions and Anderson (the two divisions are Heth\'s and Pender\'s); Tillie Pierce\'s sentence on rebel sharpshooters in a garret is cited.',
    'T1-169': 'Second reading 2026-11-16: Hard\'s quotes now carry the row of batteries and the torrent of shot.',
    'T1-170': 'Second reading 2026-11-16: the quote of Hospital Scenes now runs to the nurses\' care.',
    'T1-171': 'Second reading 2026-11-16: the National Park Service quote now carries the sentence that the Southerners should have set up a field hospital there.',
    'T1-172': 'Second reading 2026-11-16: the sketch of the 104th New York (1900) has Colonel Prey in command of the brigade by Robinson\'s order until the close of the first day\'s engagement; carried beside Coulter\'s own account as a scenario, no default, no verdict change.',
}


def apply(ROWS):
    by = {r['id']: r for r in ROWS}

    def sub_edit(rid, n, claim=None, add_keys=(), note=None, tier=None, support=None):
        r = by[rid]
        s = list(r['subs'][n - 1])
        if claim is not None:
            s[0] = claim
        if tier is not None:
            s[1] = tier
        if support is not None:
            s[2] = support
        if add_keys:
            s[3] = list(s[3]) + [k for k in add_keys if k not in s[3]]
        if note is not None:
            if len(s) < 5:
                s.append(note)
            else:
                s[4] = note
        r['subs'][n - 1] = tuple(s)

    def sub_append(rid, claim, tier, support, keys, note=None):
        t = (claim, tier, support, list(keys)) if note is None else (claim, tier, support, list(keys), note)
        by[rid]['subs'].append(t)

    def replace_in(rid, field, old, new):
        d = by[rid]['claim']
        assert d[field].count(old) == 1, (rid, field, old[:60], d[field].count(old))
        d[field] = d[field].replace(old, new)

    # ---- 1. quotes extended (patch_quotes.json: ext)
    for rid, keys in PQ['ext'].items():
        for k, q in keys.items():
            c = by[rid]['cites'][k]
            assert _n(c['quote']) in _n(q), ('extension does not contain the old quote', rid, k)
            c['quote'] = q
    # ---- 2. citations added (patch_quotes.json: new)
    for e in PQ['new']:
        rid, k = e['row'], e['key']
        meta = NEW_META[(rid, k)]
        assert k not in by[rid]['cites'], (rid, k)
        if 'report' in meta:
            d = OR(e['quote'], meta['report'], e['page'])
        else:
            d = L(meta['src'], e['quote'], page=None)
        if meta.get('note'):
            d['note'] = meta['note']
        by[rid]['cites'][k] = d

    # ---- 3. wording of claims and of headline texts
    sub_edit('T1-117', 8, claim='Reynolds, commanding the right wing, directs Doubleday to take command of the First Corps; when Reynolds is shot (about 10.15 a. m. by Doubleday\'s reckoning) the whole burden of the battle is thrown upon Doubleday')
    sub_edit('T1-120', 2, claim='The Third Division left its camp near Emmitsburg at 7 a. m. for Gettysburg by Horner\'s Mills; Howard: the First Division followed the First Corps by the direct route, the Third and the Second (Steinwehr) took the route by Horner\'s Mill; Schurz: the First Division arrived by the Emmitsburg road proper', add_keys=['h_route'])
    sub_edit('T1-124', 1, claim='Lee was on the ridge with Hill when Fremantle came in sight of Gettysburg at 4.30 p. m. ("we came in sight of Gettysburg, and joined General Lee and General Hill, who were on the top of one of the ridges")')
    sub_edit('T1-127', 2, claim='Coster\'s First Brigade on the north-east end of the hill in support of Wiedrich\'s battery, which was then in position; Smith\'s Second Brigade toward the north-west, supporting the reserve artillery of the corps')
    sub_append('T1-127', 'A civilian recollection (Tillie Pierce, 1889): through the night of the first day her father, at the garret window looking toward Cemetery Hill, could distinctly hear the Union troops "chopping, picking and shoveling" during the silent hours, and she writes that the men were forming their line of breastworks (no hour, no profile)', 'documented', 'supported', ['tp_dig'])
    replace_in('T1-127', 'event', '(no hour printed)', '(no hour printed); through the night the troops are heard chopping, picking and shoveling on Cemetery Hill (a civilian, Tillie Pierce, 1889)')
    sub_edit('T1-132', 5, claim='The sketch of the 104th New York (New York at Gettysburg vol. 2, 1900): when the regiment was moved farther north towards the railroad track, "the day had become quite showery"')
    sub_edit('T1-134', 2, add_keys=['h_brock'])
    sub_edit('T1-137', 4, claim='Wainwright: the enemy\'s skirmishers, who had lapped the retreating columns, fired from behind a paling fence running parallel to and within 50 yards of the road (the Cashtown pike)')
    replace_in('T1-139', 'event', 'her grandparent\'s farm, Jacob Weikert\'s,', 'the farm of Mrs. Schriver\'s father, Jacob Weikert,')
    replace_in('T1-139', 'text', 'and asked that Tillie come with her;', 'and requested that Tillie be permitted to accompany her (her parents consented);')
    sub_edit('T1-139', 1, claim='After dinner Mrs. Schriver, a neighbour, said she would leave the town and go to her father\'s (Jacob Weikert), who lived on the Taneytown road at the eastern slope of the Round Top; she requested that Tillie be permitted to accompany her and Tillie\'s parents consented', add_keys=['tp_req'])
    sub_edit('T1-139', 2, claim='About one o\'clock they started on foot, out Baltimore Street into the Evergreen Cemetery; passing along Cemetery Hill the men were already planting cannon')
    # who commanded Paul's brigade after his fall: two accounts (T1-141, T1-172)
    sub_append('T1-141', 'Command of Paul\'s brigade after his fall: Robinson: it devolved successively on Colonels Leonard (13th Massachusetts), Root (94th New York) and Coulter (11th Pennsylvania); the 104th New York sketch (1900): after the two senior colonels were wounded Colonel Prey took command by order of General Robinson and kept it until the close of the first day\'s engagement', 'documented', 'conflict', ['r_succ', 'ny_prey'])
    replace_in('T1-141', 'unit', 'command to Colonels Leonard, Root, then Prey)', 'command to Colonels Leonard and Root, then Coulter (Robinson) or Prey (104th New York sketch): two accounts)')
    by['T1-141']['scenarios'] += [
        sc('A', 'After Paul\'s fall the command devolved on Colonels Leonard, Root and Coulter (Coulter from about 17:00 in the cemetery)', 'Robinson OR27-1-R043 p.290; Coulter OR27-1-R044 p.293 (row T1-172)', 'documented', ['r_succ']),
        sc('B', 'Colonel Prey (104th New York) took command by Robinson\'s order and kept it until the close of the first day\'s engagement', 'New York at Gettysburg vol.2 p.753 (the sketch of the 104th New York, 1900)', 'documented', ['ny_prey'])]
    by['T1-172']['scenarios'] += [
        sc('A', 'Colonel Coulter took command of the brigade about 17:00 on Cemetery Hill (Coulter; Robinson names Coulter last in the succession)', 'Coulter OR27-1-R044 p.293; Robinson OR27-1-R043 p.290', 'documented', ['c_trans', 'c_cmd', 'r_succ']),
        sc('B', 'Colonel Prey (104th New York) took command by Robinson\'s order and kept it until the close of the first day\'s engagement (the two statements may name different moments; neither gives a second hour)', 'New York at Gettysburg vol.2 p.753 (the sketch of the 104th New York, 1900)', 'documented', ['ny_prey'])]
    # T1-145: scenarios without citations, Ames' brigade, "contesting every inch"
    for s in by['T1-145']['scenarios']:
        if s['id'] == 'A':
            assert not s['cites']; s['cites'] = ['how245']
        if s['id'] == 'B':
            assert not s['cites']; s['cites'] = ['h2']
    sub_edit('T1-145', 4, add_keys=['s_inch'])
    sub_edit('T1-145', 6, claim='The First Brigade of the First Division: von Gilsa\'s 41st (nine companies), 54th and 68th New York and 153rd Pennsylvania; the Second Brigade is listed under Brig. Gen. A. Ames and Col. A. L. Harris')
    replace_in('T1-150', 'event', 'the line making its stand behind the barricade of rails in front of the seminary', 'Meredith\'s and another brigade covering the movement from the intrenchments in front of the seminary (Doubleday)')
    sub_edit('T1-154', 8, claim='Hays (Early\'s division): Gordon\'s brigade was ordered to advance a little after 2 o\'clock')
    sub_edit('T1-154', 12, note='no report gives one; the rally of the sharpshooters on the extreme left came when they met Gordon\'s brigade advancing, so it followed Gordon\'s advance, which Hays dates a little after 2 o\'clock (an inference from the two reports; neither gives an hour for the rally); the infantry advance came after an hour or more of skirmishing')
    sub_edit('T1-159', 4, claim='Losses: Wilber\'s last piece (horses shot); three caissons of Battery B, 4th US broke down and another of that battery was struck by a shell and destroyed; the battery losses of the day 83 officers and men and about 80 horses')
    sub_append('T1-159', 'The Artillery Brigade of the First Corps (Organization of the Army of the Potomac): Col. C. S. Wainwright; 2d Maine (B) Capt. J. A. Hall; 5th Maine (E) Capt. G. T. Stevens, Lieut. E. N. Whittier; Battery L, 1st New York, Capt. G. H. Reynolds, Lieut. G. Breck; Battery B, 1st Pennsylvania, Capt. J. H. Cooper; Battery B, 4th United States, Lieut. J. Stewart', 'documented', 'supported', ['org_art'])
    replace_in('T1-164', 'event', 'Howard had chosen Cemetery Ridge at about noon', 'Howard, after the news of Reynolds\' death at about 11.30, had chosen Cemetery Ridge')
    sub_edit('T1-168', 3, claim='Perrin: the charge reached within 200 yards of the enemy\'s last position about the theological college; Hill: his own two divisions (Heth\'s and Pender\'s; Anderson, who had just come up, bivouacked some 2 miles in rear) were bivouacked in the positions won')
    sub_edit('T1-168', 8, add_keys=['tp_garret'])
    sub_append('T1-131', 'Rodes: the brigade of Col. E. A. O\'Neal comprised the Third Alabama (Col. C. A. Battle), the Fifth (Col. J. M. Hall), the Sixth (Col. J. N. Lightfoot), the Twelfth (Col. S. B. Pickens) and the Twenty-sixth (Lieut. Col. J. C. Goodgame)', 'documented', 'supported', ['r_org'])

    # ---- 4. provenance of the second reading
    for rid, t in NOTES.items():
        r = by[rid]
        r['recheck'] = (r['recheck'].rstrip() + ' ' + t).strip() if r.get('recheck') else t
    return ROWS
