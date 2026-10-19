"""Per-regiment documented-dress table for every unit in the repo's OOB json (baseline/dist/data/oob).
Default dress is the honest default with label 'Modelled'; only units whose dress was found in a source read for this plan carry another label.
Run: python docs/battle-theatre/assets/data/build_kit_by_regiment.py"""
import json, glob, csv, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
OOB = os.path.join(HERE, '..', '..', '..', '..', 'baseline', 'dist', 'data', 'oob')
S = {  # source keys -> readable citation (all read in this session)
 'R146': 'Campaigns of the One Hundred and Forty-sixth Regiment New York (1915), Internet Archive id campaignsonehun00braigoog, ch. "From Falmouth to Frederick" (uniforms received 3 June 1863; footnote: until Jan 1864 only 140th and 146th NY had worn it)',
 'R24MI': 'History of the Twenty-fourth Michigan of the Iron Brigade (Curtis, 1891), Internet Archive id historytwentyfo00curtgoog (black hats issued late May 1863; "no other troops wearing them")',
 'PAG': 'Pennsylvania at Gettysburg (1904/1914 dedication volumes), Internet Archive id pennsylvaniaatge02penn_0 (114th PA Zouaves d\'Afrique; "unknown Zouaves" identified by fragments of distinctive uniform; Bucktail dispute)',
 'REGS61': 'Regulations for the Uniform and Dress of the Army of the United States 1861, Internet Archive id regulationsforununit (sack coat art.15; cavalry jacket art.13; sky-blue trousers; forage cap art.49)',
 'WP-CSAUNI': 'Wikipedia, Military uniforms of the Confederate States (https://en.wikipedia.org/wiki/Military_uniforms_of_the_Confederate_States) - secondary',
 'FREM': 'Fremantle, Three Months in the Southern States (1863/64), Internet Archive id threemonthsinsou02frem (Wilcox: short round jacket, battered straw hat; wounded Union men in imitation Zouave dress, 3 July)',
 'WP-UNION': 'Wikipedia regiment articles listed in kit-wikipedia-excerpts.json - secondary',
 'GERRISH': 'Gerrish, Army Life: A Private\'s Reminiscences (1882), Internet Archive id armylifeprivates00gerr (20th Maine: Enfield rifles issued, forty rounds)',
 'NORTON': 'Norton, The Attack and Defense of Little Round Top (1913), Internet Archive id littleroundtop00nortrich (men "secure better muskets than the Enfields")',
}
rows = []
def add(uid, desig, side, arm, brig, corps):
    cls, label, src, note, head, coat, trou = classify(uid, desig, side, arm)
    rows.append(dict(unit_id=uid, designation=desig, side=side, arm=arm, parent_brigade=brig, parent_corps=corps, dress_class=cls, evidence_label=label, headgear=head, coat=coat, trousers=trou, sources=';'.join(src), note=note))

U_DEF = ('forage cap or kepi (mix of M1858 and McClellan patterns; per-man variation)', 'dark blue four-button sack coat (frock coat for some NCOs/officers)', 'sky-blue kersey trousers')
C_DEF = ('slouch hat (felt/straw; some forage caps)', 'short jacket or shell jacket, gray or butternut (depot/local pattern varies), some captured blue items', 'mixed: butternut/gray or captured sky-blue')
def classify(uid, desig, side, arm):
    d = desig.lower()
    if side == 'Union':
        if uid in ('U-2WI', 'U-6WI', 'U-7WI', 'U-19IN', 'U-24MI'):
            return ('U-IRON-BRIGADE', 'Documented', ['R24MI', 'WP-UNION'], 'Black M1858 Hardee hat with feather/brass; frock coat and white leggings per secondary source; 24th Michigan received hats late May 1863; Confederates recognised "black-hat fellows" on 1 July.', 'black Hardee hat', 'dark blue frock coat (secondary; to verify per regiment)', 'sky blue, white leggings (secondary)')
        if uid in ('U-146NY',):
            return ('U-ZOUAVE-146NY', 'Documented', ['R146'], 'Zouave dress issued 3 June 1863: baggy blue trousers gathered at knee, red fez with tassel, white turban (dress parade only), 10-ft red sash, white cloth leggings. Short jacket cut not described in the passage.', 'red fez (turban parade only)', 'dark blue Zouave-pattern jacket (cut Unknown), red sash', 'baggy dark-blue trousers, white leggings')
        if uid in ('U-140NY',):
            return ('U-ZOUAVE-140NY', 'Contested', ['R146', 'WP-UNION'], 'The 146th NY history says the 140th NY was "likewise accorded" Zouave dress with it on 3 June 1863; Wikipedia says 140th wore it from January 1864. Needs the 140th NY\'s own history/photographs.', 'red fez (if Zouave)', 'Zouave jacket or regulation (Contested)', 'baggy or regulation (Contested)')
        if uid in ('U-155PA', 'U-91PA'):
            return ('U-INF-DEFAULT-REGULATION', 'Documented', ['R146', 'PAG'], 'Zouave dress reached the 155th PA (and 91st PA) only in Jan/Feb 1864; regulation dress on 2 July 1863.', *U_DEF)
        if uid == 'U-114PA':
            return ('U-ZOUAVE-114PA', 'Documented', ['PAG', 'WP-UNION'], 'Collis\' Zouaves d\'Afrique: distinctive Zouave uniform worn at Gettysburg (burned Sherfy barn dead identified as "unknown Zouaves" by uniform fragments). Garment-level detail Unknown: needs Collis\'s memoir, museum artifacts, photographs.', 'Zouave headgear (Unknown cut/colour)', 'Zouave jacket and vest (Unknown cut/colour)', 'Zouave trousers (Unknown colour)')
        if uid in ('U-84NY', 'U-14BK'):
            return ('U-CHASSEUR-14BK', 'Unknown', ['WP-UNION'], 'Known for red trousers and chasseur-style uniform (1861). Whether red kepi/trousers were still worn on 1 July 1863 is not settled by a source read.', 'red kepi (1861; 1863 Unknown)', 'dark blue (chasseur jacket 1861; 1863 Unknown)', 'red (1861; 1863 Unknown)')
        if uid in ('U-72PA', 'U-73NY', 'U-44NY', 'U-95PA', 'U-23PA', 'U-39NY', 'U-42NY'):
            return ('U-ZOUAVE-OTHER-1861', 'Unknown', ['WP-UNION'], 'Originally a Zouave/chasseur/Bersaglieri-pattern regiment (Wikipedia); July 1863 dress not established by a source read (several replaced fancy dress with regulation clothing).', *U_DEF)
        if uid in ('U-13PA-R',):
            return ('U-BUCKTAIL-ORIGINAL', 'Documented', ['PAG'], 'Authorised by the Secretary of War to wear the bucktail (1914 resolution of the Bucktail survivors).', 'forage cap/kepi with bucktail', U_DEF[1], U_DEF[2])
        if uid in ('U-149PA', 'U-150PA'):
            return ('U-BUCKTAIL-BRIGADE', 'Contested', ['PAG', 'WP-UNION'], 'Wikipedia: each man wore a bucktail; the original Bucktails disputed the right (Pennsylvania at Gettysburg, 1914). Whether 149th/150th men wore tails on 1 July 1863 needs regimental history evidence.', 'cap with bucktail (Contested)', U_DEF[1], U_DEF[2])
        if uid in ('U-1US-SS', 'U-2US-SS'):
            return ('U-SHARPSHOOTER-GREEN', 'Documented', ['WP-UNION'], 'Green coats/trousers (Berdan pattern); amount still worn in July 1863 Unknown.', 'green kepi/slouch (Unknown)', 'dark green sack coat (Unknown by 1863)', 'green')
        if arm == 'cavalry':
            return ('U-CAV-DEFAULT', 'Documented', ['REGS61', 'WP-UNION'], 'Regulation cavalry jacket (yellow lace, 12 buttons), sky-blue reinforced trousers; the 1st Maine Cavalry article notes it is unclear whether jacket or sack coat was issued. 1863 mix Unknown per regiment.', 'forage cap or slouch hat', 'short jacket (yellow lace) or sack coat', 'sky-blue, reinforced seat')
        if arm == 'artillery':
            return ('U-ART-DEFAULT', 'Documented', ['REGS61'], 'Light artillery jacket with scarlet trim per 1861 regulations (art.11/13); field wear Unknown per battery.', 'forage cap', 'dark blue jacket, scarlet trim (regulation)', 'sky-blue with scarlet stripe (regulation)')
        if uid == 'U-20ME':
            return ('U-20ME-PRIVATE', 'Modelled', ['REGS61', 'GERRISH', 'NORTON'], 'Pilot unit: Enfield rifles documented (Gerrish; Norton); hat/coat shade/pack carriage Modelled or Contested.', *U_DEF)
        return ('U-INF-DEFAULT', 'Modelled', ['REGS61'], 'Default federal-issue infantry dress; unit-specific dress not yet researched.', *U_DEF)
    # Confederate
    if arm == 'artillery':
        return ('C-ART-DEFAULT', 'Modelled', ['WP-CSAUNI'], 'Default gray/butternut jacket; Confederate artillery trim (red) per 1861 CS regulations not yet verified.', *C_DEF)
    if arm == 'cavalry':
        return ('C-CAV-DEFAULT', 'Modelled', ['WP-CSAUNI'], 'Default Confederate cavalry dress; yellow trim rare (dye shortage per secondary source).', *C_DEF)
    if uid in ('C-1TX', 'C-4TX', 'C-5TX', 'C-3AR'):
        return ('C-TEXAS-BRIGADE', 'Unknown', ['WP-CSAUNI'], 'Secondary source: Texas units drew captured US blue uniforms (San Antonio depot, 1861) "worn as late as 1863". Not established for Hood\'s brigade in July 1863.', *C_DEF)
    if uid in ('C-5LA', 'C-6LA', 'C-7LA', 'C-8LA', 'C-9LA'):
        return ('C-LA-TIGERS', 'Documented', ['WP-UNION'], 'Wikipedia (9th Louisiana, Louisiana Tigers): Zouave dress of the original companies was replaced over time by Confederate uniforms and acquired clothing. July 1863 default.', *C_DEF)
    return ('C-INF-DEFAULT', 'Modelled', ['WP-CSAUNI', 'FREM'], 'Default: waist-length gray or butternut jacket (frock coats rarer), slouch hat, mixed trousers; shoes Contested (Heth shoe story).', *C_DEF)

for f in sorted(glob.glob(os.path.join(OOB, '*.json'))):
    b = os.path.basename(f)
    d = json.load(open(f, encoding='utf8'))
    side = 'Union' if b.startswith('union') else 'Confederate' if b.startswith('confederate') else None
    if not side:
        continue
    for r in d.get('regiments', []):
        arm = 'cavalry' if ('cavalry' in b or 'CAV' in r['regiment_id'] or 'cavalry' in r['designation'].lower()) else 'infantry'
        add(r['regiment_id'], r['designation'], side, arm, r.get('parent_brigade_id', ''), r.get('parent_corps_id', ''))
    if b == 'union_artillery.json':
        for br in d.get('corps_artillery_brigades', []) + d.get('artillery_reserve', {}).get('brigades', []):
            for bt in br.get('batteries', []):
                add(bt['battery_id'], bt['designation'], side, 'artillery', br.get('brigade_id', ''), br.get('corps', ''))
    if b == 'union_cavalry_artillery.json':
        for bt in d.get('horse_artillery', []):
            add(bt['battery_id'], bt['designation'], side, 'artillery', '', '')
    if b == 'confederate_artillery.json':
        for ck in ('first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery'):
            for bn in d[ck].get('battalions', []):
                for bt in bn.get('batteries', []):
                    add(bt.get('battery_id', bt.get('designation')), bt['designation'], side, 'artillery', bn.get('battalion_id', ''), ck)
    if b == 'confederate_cavalry.json':
        for bt in d.get('horse_artillery', []):
            add(bt['battery_id'], bt['designation'], side, 'artillery', '', '')
# de-duplicate by unit id keeping first
seen, out = set(), []
for r in rows:
    if r['unit_id'] in seen:
        continue
    seen.add(r['unit_id']); out.append(r)
p = os.path.join(HERE, 'kit-by-regiment.csv')
w = csv.DictWriter(open(p, 'w', newline='', encoding='utf8'), fieldnames=list(out[0].keys()))
w.writeheader(); w.writerows(out)
json.dump(S, open(os.path.join(HERE, 'kit-source-key.json'), 'w'), indent=1)
from collections import Counter
print('units', len(out), Counter(r['side'] for r in out))
print(Counter((r['dress_class'], r['evidence_label']) for r in out).most_common())
