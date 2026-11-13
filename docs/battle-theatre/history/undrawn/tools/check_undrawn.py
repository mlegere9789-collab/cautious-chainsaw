"""Validator of the group files docs/battle-theatre/history/undrawn/<group>.jsonl (the contract: ../PLAN.md, section 5).

    python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py us-3c-2d            one group file (errors stop a merge; warnings do not)
    python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py us-3c-2d --complete also requires every unit of the group to be covered by evidence or by a gap record
    python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py --all              every group file present, with the checks that span files
    python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py --verify "QUOTE" --source OR27-1     where a quote stands in a source (offset, report or section, page)
    python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py --self-test        the fixtures: the good file must pass, every line of the bad file must fail

What it checks, mechanically: the shape of every record; that every id resolves (units, gazetteer places, troop-map labels, monuments,
structures, other records); that every quote is at most 14 words and stands verbatim (whitespace collapsed, line-break hyphenation
joined, typographic quotes folded) in the named local text, inside the named report or section, at the offset given; that a clock is
printed where t_iso is set and a day-part word where a period is set; the tier rules. It does not judge whether a passage supports a
claim: that is the reading, and the review.
Exit status: 0 no error, 1 errors, 2 a source text is not on this machine (the quote checks that need it are listed, not passed).
"""
import os, re, sys, json, glob, bisect, hashlib, argparse, copy

HERE = os.path.dirname(os.path.abspath(__file__))
UND = os.path.abspath(os.path.join(HERE, '..'))
BT = os.path.abspath(os.path.join(UND, '..', '..'))
ROOT = os.path.abspath(os.path.join(BT, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_lib import build_nview, norm_query, utf8_stdout  # noqa: E402

utf8_stdout()
J = lambda p: json.load(open(p, encoding='utf-8'))

# ------------------------------------------------------------------------------------------------ vocabularies (PLAN.md section 5)
KINDS = ['unit', 'arrival', 'arrival_road', 'march', 'position', 'movement', 'engagement', 'night_position', 'departure', 'strength', 'absent',
         'line_order', 'road_identification', 'source', 'gap']
PLACED = ['position', 'engagement', 'night_position']                 # kinds that put a unit at a place for a window
TIERS = ['documented', 'inferred', 'plausible-procedural', 'open gap']
FLAG = {'documented': 0, 'inferred': 1, 'plausible-procedural': 2, 'open gap': None}
ROLES = ['unit_commander', 'formation_commander', 'staff', 'other_officer', 'participant', 'official_table', 'map', 'compiler', 'historian', 'newspaper']
ROLES_DOCUMENTED = ['unit_commander', 'formation_commander', 'staff', 'other_officer', 'participant', 'official_table', 'map']
ACTIVITIES = ['march', 'double_quick', 'halt', 'stand', 'rest', 'fire', 'serve_guns', 'gallop', 'build_works', 'camp', 'other']
FORMATIONS = ['line', 'column_fours', 'column_mass', 'skirmish_line', 'battery', 'mounted_column', 'mounted_line']
ANCHORS = ['gazetteer', 'troopmap', 'monument', 'structure', 'road_crossing', 'along_road', 'unit', 'none']
RELS = ['at', 'in', 'on', 'near', 'north_of', 'northeast_of', 'east_of', 'southeast_of', 'south_of', 'southwest_of', 'west_of', 'northwest_of',
        'left_of', 'right_of', 'front_of', 'rear_of', 'with', 'between']
BASES = ['printed_clock', 'printed_period', 'sequence', 'day_only']
# a period token needs one of its words in when.printed (lower case). Noon and midnight are CLOCKS (the layer reads the words noon, midday and midnight as 12:00 and 00:00, claim-clock.mjs):
# write them as printed_clock. The clock window of every token is ONE table of the integrator (PLAN.md section 6.3); the 14 tokens are the words an Official Records report uses for a part of a day.
PERIODS = {
    'before_daylight': ['before daylight', 'before day', 'before dawn', 'before light'],
    'daybreak': ['daybreak', 'day-break', 'dawn', 'daylight', 'day-light', 'break of day', 'first light'],
    'sunrise': ['sunrise', 'sun-rise', 'sunup', 'sun-up'],
    'early_morning': ['early in the morning', 'early morning', 'early hour of the morning', 'early in the day'],
    'morning': ['morning'], 'forenoon': ['forenoon'],
    'early_afternoon': ['early in the afternoon', 'early afternoon'], 'afternoon': ['afternoon'],
    'late_afternoon': ['late in the afternoon', 'late afternoon', 'toward evening', 'towards evening', 'late in the day'],
    'sunset': ['sunset', 'sundown', 'sun-down', 'sun-set', 'going down of the sun'],
    'dusk': ['dusk', 'dark', 'nightfall', 'twilight'], 'evening': ['evening'], 'night': ['night'],
    'all_day': ['all day', 'during the day', 'throughout the day', 'the whole day', 'the entire day'],
}
COMPASS = {'north': 0, 'northeast': 45, 'north-east': 45, 'east': 90, 'southeast': 135, 'south-east': 135, 'south': 180, 'southwest': 225, 'south-west': 225, 'west': 270, 'northwest': 315, 'north-west': 315}
FACING = ['printed_compass', 'toward_place', 'parallel_to_road', 'toward_unit', 'none']
STRENGTH_WHAT = ['officers_and_men', 'men', 'enlisted', 'officers', 'muskets', 'sabers', 'aggregate_present', 'present_for_duty', 'engaged', 'carried_into_action', 'effective']
UNIT_ACTIONS = ['add', 'absent', 'attached', 'merge', 'fix', 'status', 'rename', 'reparent']
UNIT_STATUS = ['on_field', 'partly_on_field', 'never_on_field', 'never_main_field']      # the statuses of history/units.json; documented_absent is not one of them: it is what an `absent` evidence record earns
UNIT_LEVELS = ['army', 'corps', 'division', 'brigade', 'regiment', 'battalion', 'battery', 'company', 'artillery_brigade', 'artillery_battalion', 'artillery_group', 'group', 'command', 'headquarters', 'person']
UNIT_ARMS = ['infantry', 'cavalry', 'artillery', 'staff', 'medical', 'train', 'headquarters']
UNITS_PER = {'yards': 0.9144, 'feet': 0.3048, 'miles': 1609.344, 'rods': 5.0292, 'm': 1.0}      # exact definitions; a pace has no fixed length here: unit 'paces' carries m null
GAP_WHAT = ['arrival', 'positions', 'path', 'strength', 'departure', 'roster']
COMMON_KEYS = {'claim_id', 'group', 'kind', 'unit_id', 'tier', 'render_flag', 'weak_source', 'claim_support_verified', 'fidelity_check', 'fidelity_note', 'ocr_uncertain', 'flag_single_source',
               'conflicts_with', 'corroborates', 'conflict_key', 'timeline', 'statement', 'reasoning', 'source', 'note'}
_PLACED = {'when', 'until', 'place', 'activity', 'activity_printed', 'formation', 'facing'}
# a gap record may also carry gap.covers (units under its unit that the same searches cover) and gap.days (the days of 1 to 3 July it concerns; all days when absent)
KIND_KEYS = {'unit': {'unit', 'when'}, 'arrival': {'when', 'until', 'place', 'arrival'}, 'arrival_road': {'when', 'until', 'road'}, 'march': {'when', 'until', 'road', 'place'}, 'position': _PLACED, 'engagement': _PLACED,
             'night_position': _PLACED, 'movement': {'when', 'until', 'from', 'to', 'gait'}, 'departure': {'when', 'until', 'road', 'place'}, 'strength': {'strength'}, 'absent': {'absent', 'when', 'until'},
             'line_order': {'order', 'when', 'until'}, 'road_identification': {'road_identification'}, 'source': {'source_decl'}, 'gap': {'gap'}}
MAX_QUOTE_WORDS, MAX_PLACE_WORDS = 14, 30
# the copy audit: no shipped file says how the page was made (the pattern of tests/ui.spec.mjs). The prose fields of a record reach the cards: they must pass; a historical quote that holds one of the words is listed (the integrator elides it)
COPY_RE = re.compile(r'\b(AI|A\.I\.|Claude|Anthropic|LLM|language model|generated|automated|subagent|agent|prompt)\b', re.I)
PROSE_KEYS = {'statement', 'reasoning', 'note', 'fidelity_note', 'basis', 'fix', 'name', 'result', 'terms', 'where', 'activity_printed', 'title', 'cite', 'licence_basis'}
MAX_PASSAGE_CHARS = 4000                  # the passage read (source.passage) is the sentences that support the claim, not a report: longer is split into records with a passage each
DATE_LO, DATE_HI = '1863-06-25', '1863-07-15'
ID_RE = re.compile(r'^U-([a-z0-9]+(?:-[a-z0-9]+)*)-(\d{4})$')
UNIT_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')

# ------------------------------------------------------------------------------------------------ repository data the records refer to
class Repo:
    def __init__(self):
        self.groups = J(os.path.join(UND, 'groups.json'))
        self.gids = {g['id'] for g in self.groups['groups']}
        self.group_units = {g['id']: [u['id'] for u in g['units']] for g in self.groups['groups']}
        self.unit_class = {u['id']: u['class'] for g in self.groups['groups'] for u in g['units']}
        self.unit_group = {u['id']: g['id'] for g in self.groups['groups'] for u in g['units']}
        self.status = {u['id']: u for u in J(os.path.join(UND, 'status.json'))['units']}
        self.unit_missing = {u['id']: u['missing'] for g in self.groups['groups'] for u in g['units']}
        units = J(os.path.join(BT, 'history/units.json'))['units']
        self.units = {u['id']: u for u in units}
        self.gaps = {e['id']: e for e in J(os.path.join(UND, 'roster-gaps.json'))['entries']}
        self.sources = J(os.path.join(UND, 'sources.json'))['sources']
        gz = J(os.path.join(BT, 'app/data/gazetteer.json'))['places']
        self.gz = {p['id']: p for p in gz}
        self.mon = {('MON-%d' % m['no']) for m in J(os.path.join(BT, 'app/data/site-bookmarks.json'))['monuments']}
        s3 = J(os.path.join(BT, 'app/data/structures3d.json'))
        self.struct = {x['id'] for x in s3['buildings']} | {x['id'] for x in s3['points']}
        self.tm = {}
        for f in glob.glob(os.path.join(BT, 'history/positions/troopmap_*.jsonl')):
            for line in open(f, encoding='utf-8'):
                if line.strip():
                    c = json.loads(line); self.tm[c['claim_id']] = (c['unit_id'], (c.get('when') or {}).get('date'))
        self.old = set(self.tm)
        for f in glob.glob(os.path.join(BT, 'history/positions/positions_[A-E].jsonl')):
            for line in open(f, encoding='utf-8'):
                if line.strip(): self.old.add(json.loads(line)['claim_id'])
        self.orx = {r['id']: r for r in J(os.path.join(BT, 'library/or27_index.json'))['records']}
        sv = J(os.path.join(BT, 'library/statevol_index.json'))
        self.sec = {s['id']: s for s in sv['sections']}

    def ancestors(self, uid):
        out = []
        while uid in self.units and self.units[uid]['parent']:
            uid = self.units[uid]['parent']; out.append(uid)
        return out


# ------------------------------------------------------------------------------------------------ quotes in the local texts
APOS = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"'})
fold = lambda s: s.translate(APOS)
_texts = {}


class Missing(Exception):
    pass


def _generic(path):
    """Normalized view of a plain OCR text: whitespace collapsed, end-of-line hyphenation joined, quotes folded; no page model."""
    if path not in _texts:
        if not os.path.exists(path): raise Missing(path)
        with open(path, encoding='utf-8', errors='replace', newline='') as f: text = f.read()
        ntext, nmap = build_nview(text)
        _texts[path] = (fold(ntext), nmap, text)
    return _texts[path]


def find_quote(repo, source_id, quote, declared=None):
    """-> list of hits {offset, end, report_id|section, page, interpolated}. Raises Missing when the text is not on this machine."""
    src = repo.sources.get(source_id) or (declared or {}).get(source_id)
    if not src: raise KeyError(source_id)
    q0 = fold(norm_query(quote)); hits = []
    cands = [q0, re.sub(r'(\w)- (\w)', r'\1\2', q0), re.sub(r'(\w)-(\w)', r'\1\2', q0)]
    if src['kind'] == 'or27':
        import or27_find as F
        if not os.path.exists(os.path.join(ROOT, src['path'])): raise Missing(src['path'])
        P = F.get_part(src['part'])
        nt = getattr(P, '_folded', None)
        if nt is None: nt = P._folded = fold(P.ntext)
        for cq in cands:
            i = nt.find(cq)
            while i >= 0:
                s, e = P.orig_span(i, i + len(cq)); c = P.cite(s, e)
                hits.append({'offset': s, 'end': e, 'report_id': c['record'], 'page': c['page']}); i = nt.find(cq, i + 1)
            if hits: break
    elif src['kind'] == 'statevol':
        import statevol_find as SF
        import statevol_index as SI
        if not os.path.exists(os.path.join(SI.RAW_DIR, SI.VOLUMES[src['key']]['file'] + '_djvu.txt')):
            # the tool reads tmp/library/misc/<file>_djvu.txt: link the copy named in sources.json there
            p = os.path.join(ROOT, src['path'])
            if not os.path.exists(p): raise Missing(src['path'])
            os.makedirs(SI.RAW_DIR, exist_ok=True); os.symlink(os.path.relpath(p, SI.RAW_DIR), os.path.join(SI.RAW_DIR, SI.VOLUMES[src['key']]['file'] + '_djvu.txt'))
        V = _texts.get(('sv', src['key'])) or _texts.setdefault(('sv', src['key']), SF.Vol(src['key'], SF.index()))
        for cq in cands:
            i = V.ntext.find(cq)
            while i >= 0:
                o = V.orig(i); sec, page, interp, _ = V.cite(o)
                hits.append({'offset': o, 'end': V.orig(i + len(cq) - 1) + 1, 'section': sec['id'] if sec else None, 'page': str(page), 'interpolated': bool(interp)}); i = V.ntext.find(cq, i + 1)
            if hits: break
    else:
        nt, nmap, _ = _generic(os.path.join(ROOT, src['path']))
        for cq in cands:
            i = nt.find(cq)
            while i >= 0:
                hits.append({'offset': nmap[i], 'end': nmap[i + len(cq) - 1] + 1, 'page': None}); i = nt.find(cq, i + 1)
            if hits: break
    return hits


def view_of(repo, source_id, declared=None):
    """-> (folded normalized text, nmap) of a source, as find_quote reads it; call after a successful find_quote of the same source."""
    src = repo.sources.get(source_id) or (declared or {}).get(source_id)
    if src['kind'] == 'or27':
        import or27_find as F
        P = F.get_part(src['part']); nt = getattr(P, '_folded', None)
        if nt is None: nt = P._folded = fold(P.ntext)
        return nt, P.nmap
    if src['kind'] == 'statevol':
        V = _texts[('sv', src['key'])]
        return V.ntext, V.nmap
    nt, nmap, _ = _generic(os.path.join(ROOT, src['path']))
    return nt, nmap


def passage_view(repo, source_id, a, b, declared=None):
    """The normalized, case-folded words of the original-offset span [a, b) of a source: what a `printed` field of a record must be found in."""
    nt, nmap = view_of(repo, source_id, declared)
    return nt[bisect.bisect_left(nmap, a):bisect.bisect_left(nmap, b)].lower()


# ------------------------------------------------------------------------------------------------ printed clocks (the rule of app/src/history/claim-clock.mjs)
NUM = r'(\d{1,2})(?:[.:]\s*\.?\s*(\d{2}))?'


def printed_clocks(printed):
    s = str(printed or '').replace(' ', ' '); out = []
    for m in re.finditer(NUM + r"\s*(o['’]?\s?clock|\(?[ap]\.?\s?m\b\.?\)?|m\b\.)", s, re.I):
        w = m.group(3).lstrip('(').lower(); h = int(m.group(1)); mi = int(m.group(2) or 0)
        out.append((h % 12, mi, 'a' if w.startswith('a') else 'p' if w.startswith('p') else 'noon' if w.startswith('m') else None))
    r = re.search(r'(?:between|from)\s+' + NUM + r'\s+(?:and|to|until)\s+' + NUM + r"\s*(?:(\(?[ap])\.?\s?m\b|o['’]?\s?clock)", s, re.I)
    if r: out.append((int(r.group(1)) % 12, int(r.group(2) or 0), r.group(5).replace('(', '').lower() if r.group(5) else None))
    if re.search(r'\b(noon|midday)\b', s, re.I): out.append((0, 0, 'noon'))
    if re.search(r'\bmidnight\b', s, re.I): out.append((0, 0, 'midnight'))
    return out


def clock_agrees(printed, t_iso):
    hh, mm = int(t_iso[11:13]), int(t_iso[14:16])
    for h12, mi, mer in printed_clocks(printed):
        if h12 == hh % 12 and mi == mm and (hh == 12 if mer == 'noon' else hh == 0 if mer == 'midnight' else True if mer is None else (mer == 'a') == (hh < 12)): return True
    return False


ISO_D = re.compile(r'^1863-\d{2}-\d{2}$'); ISO_T = re.compile(r'^1863-\d{2}-\d{2}T\d{2}:\d{2}$')
words = lambda s: len(str(s or '').split())


# ------------------------------------------------------------------------------------------------ one file
class Check:
    def __init__(self, repo, known_ids=None, declared_units=None):
        self.repo, self.err, self.warn, self.nosrc = repo, [], [], []
        self.known_ids = set(known_ids or []); self.declared_units = set(declared_units or []); self.passage_lc = None

    def E(self, at, msg): self.err.append('%s: %s' % (at, msg))
    def W(self, at, msg): self.warn.append('%s: %s' % (at, msg))

    def unit_ok(self, uid): return uid in self.repo.units or (uid in self.repo.gaps and not self.repo.gaps[uid].get('footnote_of')) or uid in self.declared_units

    def when(self, at, w, need=True, name='when'):
        if w is None:
            if need: self.E(at, '%s is required' % name)
            return
        if not isinstance(w, dict): return self.E(at, '%s must be an object' % name)
        d = w.get('date')
        if not (isinstance(d, str) and ISO_D.match(d)): return self.E(at, '%s.date must be 1863-MM-DD' % name)
        if not (DATE_LO <= d <= DATE_HI): self.E(at, '%s.date %s is outside %s to %s' % (name, d, DATE_LO, DATE_HI))
        if w.get('date_basis') not in ('printed', 'context'): self.E(at, '%s.date_basis must be printed or context' % name)
        b = w.get('basis')
        if b not in BASES: return self.E(at, '%s.basis must be one of %s' % (name, ', '.join(BASES)))
        pr, t, te, per = w.get('printed'), w.get('t_iso'), w.get('t_end_iso'), w.get('period')
        if b in ('printed_clock', 'printed_period') and not (isinstance(pr, str) and pr.strip()): self.E(at, '%s.printed (the time words as printed) is required for basis %s' % (name, b))
        if b == 'printed_clock':
            if not (isinstance(t, str) and ISO_T.match(t)): self.E(at, '%s.t_iso is required for basis printed_clock' % name)
            elif t[:10] != d and not (t[11:16] == '00:00'): self.E(at, '%s.t_iso is not on %s.date' % (name, name))
            elif not clock_agrees(pr, t): self.E(at, '%s.t_iso %s is not a clock printed in "%s"' % (name, t[11:], pr))
            if te is not None and not (isinstance(te, str) and ISO_T.match(te) and clock_agrees(pr, te)): self.E(at, '%s.t_end_iso is not a clock printed in the time words' % name)
            if per is not None: self.E(at, '%s.period must be null when a clock is printed (the clock outranks the day part)' % name)
        else:
            if t is not None or te is not None: self.E(at, '%s.t_iso is set only for a printed clock' % name)
        if b == 'printed_period':
            if per not in PERIODS: self.E(at, '%s.period must be one of %s' % (name, ', '.join(PERIODS)))
            elif not any(k in (' ' + str(pr).lower() + ' ') for k in PERIODS[per]): self.E(at, '%s.period %s has none of its words (%s) in "%s"' % (name, per, ' / '.join(PERIODS[per]), pr))
            elif printed_clocks(pr): self.E(at, '%s.printed carries a clock ("%s"): a printed clock outranks the day part, use basis printed_clock with t_iso (noon, midday and midnight are clocks)' % (name, pr))
        if b in ('sequence', 'day_only') and per is not None: self.E(at, '%s.period is set only for basis printed_period' % name)
        if b == 'sequence' and not (w.get('after') or w.get('before')): self.E(at, '%s: basis sequence needs after or before (ids of records that bound it)' % name)
        for k in ('after', 'before'):
            for i in (w.get(k) or []): self.ref(at, i, '%s.%s' % (name, k))
        if not isinstance(w.get('approx'), bool): self.E(at, '%s.approx must be true or false' % name)

    def ref(self, at, i, what):
        if not isinstance(i, str): return self.E(at, '%s: an id is expected' % what)
        if i in self.known_ids or i in self.repo.old or re.match(r'^(C-\d{3}|CF-|T\d-\d{3}|RC-\d{2}|AP-\d{2}|PO-\d{2}|DP-\d{2}|EG-)', i): return
        self.E(at, '%s: %s is not a record of the group files, a claim of the ledgers or troop maps, or a C-, T-, RC-, AP-, PO-, DP- or EG- id' % (what, i))

    def place(self, at, p, need_anchor, when_date=None, unit=None):
        if not isinstance(p, dict): return self.E(at, 'place must be an object')
        if not (isinstance(p.get('printed'), str) and p['printed'].strip()): self.E(at, 'place.printed (the place words as printed) is required')
        elif words(p['printed']) > MAX_PLACE_WORDS: self.E(at, 'place.printed is longer than %d words' % MAX_PLACE_WORDS)
        a = p.get('anchor')
        if not isinstance(a, dict) or a.get('type') not in ANCHORS: return self.E(at, 'place.anchor.type must be one of %s' % ', '.join(ANCHORS))
        t, r = a['type'], a.get('ref')
        if t == 'gazetteer':
            if r not in self.repo.gz: self.E(at, 'place.anchor.ref %s is not a gazetteer id' % r)
            elif self.repo.gz[r].get('kind') == 'line' and need_anchor: self.E(at, 'a road (%s) is not a place: use along_road or road_crossing' % self.repo.gz[r]['name'])
        elif t == 'troopmap':
            if r not in self.repo.tm: self.E(at, 'place.anchor.ref %s is not a troop-map claim' % r)
            else:
                tu, td = self.repo.tm[r]
                if unit and unit in self.repo.units and tu != unit and tu not in self.repo.ancestors(unit) and unit not in self.repo.ancestors(tu): self.E(at, 'troop-map claim %s is of %s, not of the unit or a formation above it' % (r, tu))
                if when_date and td and td != when_date: self.E(at, 'troop-map claim %s is of %s, the record is of %s' % (r, td, when_date))
        elif t == 'monument':
            if r not in self.repo.mon: self.E(at, 'place.anchor.ref %s is not a monument of app/data/site-bookmarks.json (MON-<no>)' % r)
            if not (isinstance(a.get('basis'), str) and len(a['basis']) >= 40): self.E(at, 'a monument anchor needs anchor.basis: the printed statement (source of this record) that the monument or marker stands where the unit stood, in 40 characters or more')
        elif t == 'structure':
            if r not in self.repo.struct: self.E(at, 'place.anchor.ref %s is not a building or point of app/data/structures3d.json' % r)
        elif t == 'road_crossing':
            rs = a.get('refs') or []
            if len(rs) != 2 or any(x not in self.repo.gz or self.repo.gz[x].get('kind') != 'line' for x in rs): self.E(at, 'road_crossing needs anchor.refs: two gazetteer roads')
        elif t == 'along_road':
            if r not in self.repo.gz or self.repo.gz[r].get('kind') != 'line': self.E(at, 'along_road needs anchor.ref: a gazetteer road')
            n = a.get('near')
            if n is not None and not (n in self.repo.gz or n in self.repo.mon or n in self.repo.struct): self.E(at, 'along_road anchor.near %s is not a gazetteer, monument or structure id' % n)
        elif t == 'unit':
            if not self.unit_ok(r): self.E(at, 'place.anchor.ref %s is not a unit' % r)
            if r == unit: self.E(at, 'a unit cannot be placed relative to itself')
        elif t == 'none' and need_anchor:
            self.W(at, 'no anchor: the place stays words and the builder cannot stand the unit there (give the nearest anchor the words support, or say in note why none exists)')
        rel = p.get('relation')
        if rel is not None:
            if not isinstance(rel, dict) or rel.get('rel') not in RELS: self.E(at, 'place.relation.rel must be one of %s' % ', '.join(RELS))
            else:
                dist = rel.get('distance')
                if dist is not None:
                    if not isinstance(dist, dict) or not isinstance(dist.get('printed'), str): self.E(at, 'place.relation.distance needs printed (the words), value, unit and m')
                    elif dist.get('unit') == 'paces':
                        if dist.get('m') is not None: self.E(at, 'a distance in paces carries m null (no pace length is fixed here)')
                    elif dist.get('unit') not in UNITS_PER or not isinstance(dist.get('value'), (int, float)): self.E(at, 'place.relation.distance.unit must be one of %s or paces, with a numeric value' % ', '.join(UNITS_PER))
                    elif not isinstance(dist.get('m'), (int, float)) or abs(dist['m'] - dist['value'] * UNITS_PER[dist['unit']]) > max(1.0, 0.01 * dist['m']): self.E(at, 'place.relation.distance.m is not value x %s' % UNITS_PER[dist['unit']])
        if t == 'unit' and (rel is None or rel.get('rel') not in ('left_of', 'right_of', 'front_of', 'rear_of', 'with', 'between')): self.E(at, 'a unit anchor needs relation.rel left_of, right_of, front_of, rear_of, with or between')

    def source(self, at, r, declared):
        s = r.get('source')
        if not isinstance(s, dict): return self.E(at, 'source is required')
        sid = s.get('source_id'); src = self.repo.sources.get(sid) or declared.get(sid)
        if not src: return self.E(at, 'source.source_id %s is not in sources.json and is not declared by a source record of this file' % sid)
        if s.get('author_role') not in ROLES: self.E(at, 'source.author_role must be one of %s' % ', '.join(ROLES))
        q = s.get('quote')
        if not (isinstance(q, str) and q.strip()): return self.E(at, 'source.quote is required')
        if words(q) > MAX_QUOTE_WORDS: self.E(at, 'source.quote has %d words (at most %d)' % (words(q), MAX_QUOTE_WORDS))
        if not isinstance(s.get('cite'), str) or len(s['cite']) < 12: self.E(at, 'source.cite (the citation in words) is required')
        pas = s.get('passage')
        if not (isinstance(pas, list) and len(pas) == 2 and all(isinstance(x, int) for x in pas) and pas[0] < pas[1]): self.E(at, 'source.passage [from, to] (character offsets of the passage read) is required')
        try: hits = find_quote(self.repo, sid, q, declared)
        except Missing as e: self.nosrc.append('%s: the text of %s is not on this machine (%s): quote not checked' % (at, sid, e)); return
        if not hits: return self.E(at, 'source.quote is not in %s: "%s"' % (sid, q))
        off = s.get('quote_offset')
        hit = next((h for h in hits if h['offset'] == off), None)
        if hit is None: return self.E(at, 'source.quote_offset %s is not where the quote stands in %s (found at %s)' % (off, sid, ', '.join(str(h['offset']) for h in hits[:6])))
        if isinstance(pas, list) and len(pas) == 2 and all(isinstance(x, int) for x in pas):
            if not (pas[0] <= hit['offset'] and hit['end'] <= pas[1]): self.E(at, 'source.passage does not contain the quote')
            elif pas[1] - pas[0] > MAX_PASSAGE_CHARS: self.E(at, 'source.passage is %d characters (at most %d): give the sentences that state the claim, and split a longer reading into records' % (pas[1] - pas[0], MAX_PASSAGE_CHARS))
            else: self.passage_lc = passage_view(self.repo, sid, pas[0], pas[1], declared)
        if src['kind'] == 'or27':
            if s.get('report_id') not in self.repo.orx: self.E(at, 'source.report_id %s is not in the OR index' % s.get('report_id'))
            elif hit['report_id'] != s['report_id']: self.E(at, 'the quote stands in %s, not in source.report_id %s' % (hit['report_id'], s['report_id']))
            if s.get('printed_page') in (None, ''): self.E(at, 'source.printed_page is required for the Official Records (the page of the model: %s)' % hit['page'])
            elif str(s['printed_page']) != str(hit['page']) and not s.get('page_basis'): self.W(at, 'source.printed_page %s differs from the page model (%s): give source.page_basis (for example the running head read) or use the model' % (s['printed_page'], hit['page']))
        elif src['kind'] == 'statevol':
            if s.get('section') not in self.repo.sec: self.E(at, 'source.section %s is not in the state-volume index' % s.get('section'))
            elif hit['section'] != s['section']: self.E(at, 'the quote stands in %s, not in source.section %s' % (hit['section'], s['section']))
            if s.get('printed_page') in (None, ''): self.E(at, 'source.printed_page is required for an indexed volume (the page of the model: %s)' % hit['page'])
        return src

    def copy_check(self, at, node, path=''):
        if isinstance(node, dict):
            for k, v in node.items():
                if k == 'quote' and isinstance(v, str) and COPY_RE.search(v): self.W(at, '%s: the historical quote holds "%s", a word the copy audit forbids on a card: the integrator elides it' % (path + k, COPY_RE.search(v).group(0)))
                elif k in PROSE_KEYS and isinstance(v, str) and COPY_RE.search(v): self.E(at, '%s holds "%s": wording that says how the page was made is not shipped (copy audit); write the history in plain words' % (path + k, COPY_RE.search(v).group(0)))
                elif isinstance(v, (dict, list)): self.copy_check(at, v, path + k + '.')
        elif isinstance(node, list):
            for i, v in enumerate(node): self.copy_check(at, v, path + '[%d].' % i)

    def in_passage(self, at, what, text, soft):
        """A `printed` field is the words as the text prints them: it must stand in the passage read (case, spacing, line-break hyphenation and typographic quotes folded; the OCR as it stands)."""
        if self.passage_lc is None or not isinstance(text, str) or not text.strip(): return
        q = fold(norm_query(text)).lower()
        if any(c in self.passage_lc for c in (q, re.sub(r'(\w)- (\w)', r'\1\2', q), re.sub(r'(\w)-(\w)', r'\1\2', q))): return
        (self.W if soft else self.E)(at, '%s "%s" is not in the passage read (source.passage): copy the words as the text prints them, or move source.passage' % (what, str(text)[:70]))

    def printed_checks(self, at, r):
        soft = r.get('ocr_uncertain') is True
        for nm in ('when', 'until'):
            w = r.get(nm)
            if isinstance(w, dict): self.in_passage(at, nm + '.printed', w.get('printed'), soft)
        pl = r.get('place')
        for key, x in (('place', pl), ('from', r.get('from')), ('to', r.get('to'))):
            if isinstance(x, dict):
                self.in_passage(at, key + '.printed', x.get('printed'), soft)
                rel = x.get('relation')
                if isinstance(rel, dict) and isinstance(rel.get('distance'), dict): self.in_passage(at, key + '.relation.distance.printed', rel['distance'].get('printed'), soft)
        for key in ('road', 'facing', 'strength', 'absent', 'road_identification'):
            x = r.get(key)
            if isinstance(x, dict):
                for f in ('printed', 'printed_name', 'where_printed', 'duty_printed'): self.in_passage(at, key + '.' + f, x.get(f), soft)

    def record(self, n, r, gid, declared):
        at = 'line %d' % n
        if not isinstance(r, dict): return self.E(at, 'not a JSON object')
        cid = r.get('claim_id'); at = '%s %s' % (at, cid)
        m = ID_RE.match(cid or '')
        if not m or m.group(1) != gid: self.E(at, 'claim_id must be U-%s-nnnn (four digits)' % gid)
        if r.get('group') != gid: self.E(at, 'group must be %s (the name of the file)' % gid)
        k = r.get('kind')
        if k not in KINDS: return self.E(at, 'kind must be one of %s' % ', '.join(KINDS))
        for key in r:
            if key not in COMMON_KEYS and key not in KIND_KEYS[k] and not key.startswith('_'): self.W(at, 'field "%s" is not part of a %s record: the integrator ignores it' % (key, k))
        self.copy_check(at, {x: y for x, y in r.items() if not x.startswith('_')})
        if k == 'source':
            d = r.get('source_decl') or {}
            for f in ('source_id', 'title', 'year', 'archive_identifier', 'url', 'path', 'bytes', 'sha256', 'licence_basis', 'class'):
                if d.get(f) in (None, ''): self.E(at, 'source_decl.%s is required' % f)
            if d.get('path') and not str(d['path']).startswith('tmp/units-%s/' % gid): self.E(at, 'source_decl.path must be under tmp/units-%s/' % gid)
            if d.get('url') and not re.match(r'^https://(archive\.org|www\.loc\.gov)/', str(d['url'])): self.E(at, 'source_decl.url must be on archive.org or www.loc.gov (the hosts that are reachable; a refused host is recorded as blocked in the report)')
            p = os.path.join(ROOT, str(d.get('path') or ''))
            if d.get('path') and os.path.exists(p):
                if hashlib.sha256(open(p, 'rb').read()).hexdigest() != d.get('sha256'): self.E(at, 'source_decl.sha256 is not the hash of %s' % d['path'])
            elif d.get('path'): self.nosrc.append('%s: %s is not on this machine' % (at, d['path']))
            return
        uid = r.get('unit_id')
        if not (isinstance(uid, str) and UNIT_RE.match(uid)): return self.E(at, 'unit_id must be lowercase letters, digits and hyphens')
        if uid in self.repo.gaps and self.repo.gaps[uid].get('footnote_of') and uid not in self.repo.units:
            return self.E(at, 'unit_id %s is a footnote of the organization table that carries the status of %s, not a unit: record the status on those units' % (uid, ', '.join(self.repo.gaps[uid]['footnote_of'])))
        if not self.unit_ok(uid): self.E(at, 'unit_id %s is not in the roster, not pre-assigned in roster-gaps.json and not added by a unit record' % uid)
        elif gid in self.repo.group_units and uid in self.repo.units and uid not in self.repo.group_units[gid]:
            self.E(at, 'unit_id %s belongs to group %s, not to %s: a group file holds evidence for the units of its own group (put it in %s.jsonl, or write a request note for the owner of that group)' % (uid, self.repo.unit_group.get(uid), gid, self.repo.unit_group.get(uid)))
        elif uid in self.repo.gaps and self.repo.gaps[uid]['group'] != gid and uid not in self.repo.units: self.E(at, 'unit_id %s is pre-assigned to group %s in roster-gaps.json, not to %s' % (uid, self.repo.gaps[uid]['group'], gid))
        t = r.get('tier')
        if t not in TIERS: return self.E(at, 'tier must be one of %s' % ', '.join(TIERS))
        if r.get('render_flag') != FLAG[t]: self.E(at, 'render_flag must be %s for tier %s' % (FLAG[t], t))
        for i in (r.get('conflicts_with') or []) + (r.get('corroborates') or []): self.ref(at, i, 'conflicts_with/corroborates')
        if r.get('conflict_key') is not None and not (isinstance(r['conflict_key'], str) and re.match(r'^[a-z0-9-]+\|[a-z_]+\|', r['conflict_key'])): self.E(at, 'conflict_key must be "<unit id>|<topic>|<date or blank>"')
        for i in (r.get('timeline') or []):
            if not re.match(r'^T\d-\d{3}$', str(i)): self.E(at, 'timeline: %s is not a timeline row id' % i)
        if k == 'gap':
            g = r.get('gap') or {}
            if t != 'open gap': self.E(at, 'a gap record has tier "open gap"')
            if not g.get('what') or any(x not in GAP_WHAT for x in g['what']): self.E(at, 'gap.what must list what is missing: %s' % ', '.join(GAP_WHAT))
            se = g.get('searched') or []
            if len(se) < 3: self.E(at, 'gap.searched needs at least three searches (source_id, where, terms, result)')
            elif sum(1 for x in se if isinstance(x, dict) and (x.get('source_id') in self.repo.sources or x.get('source_id') in declared)) < 2: self.E(at, 'gap.searched: at least two of the searches must be in texts that are on this machine (sources.json or a source record of the file); a text that could not be acquired is listed as NOT-ACQUIRED:<title> with the reason')
            for x in se:
                if not isinstance(x, dict) or not all(isinstance(x.get(f), str) and x[f] for f in ('source_id', 'where', 'terms', 'result')): self.E(at, 'gap.searched entries need source_id, where, terms, result'); break
                if x['source_id'] not in self.repo.sources and x['source_id'] not in declared and not x['source_id'].startswith('NOT-ACQUIRED:'): self.E(at, 'gap.searched source_id %s is unknown (a text that could not be acquired is written NOT-ACQUIRED:<title>)' % x['source_id'])
            for x in (g.get('covers') or []):
                if not self.unit_ok(x) or (x in self.repo.units and gid in self.repo.group_units and x not in self.repo.group_units[gid]): self.E(at, 'gap.covers: %s is not a unit of this group' % x)
                elif x != uid and x not in self.repo.units: self.E(at, 'gap.covers: %s is not in the roster' % x)
                elif x != uid and uid in self.repo.units and uid not in self.repo.ancestors(x): self.E(at, 'gap.covers: %s is not a unit under %s (a gap record covers its unit and the units below it)' % (x, uid))
            for d in (g.get('days') or []):
                if not (isinstance(d, str) and ISO_D.match(d) and DATE_LO <= d <= DATE_HI): self.E(at, 'gap.days: %s must be a date 1863-MM-DD between %s and %s' % (d, DATE_LO, DATE_HI))
            if not (isinstance(g.get('register'), str) and g['register'].startswith('docs/battle-theatre/GOVERNANCE/horde/ws-units/proposed-register/%s-' % gid)): self.E(at, 'gap.register must name the proposed register entry docs/battle-theatre/GOVERNANCE/horde/ws-units/proposed-register/%s-<name>.md' % gid)
            elif not os.path.exists(os.path.join(ROOT, g['register'])): self.W(at, 'the proposed register entry %s does not exist yet' % g['register'])
            return
        if t == 'open gap': self.E(at, 'tier "open gap" is for gap records only')
        self.passage_lc = None
        src = self.source(at, r, declared) or {}
        self.printed_checks(at, r)
        role = (r.get('source') or {}).get('author_role')
        if t == 'documented':
            if role not in ROLES_DOCUMENTED: self.E(at, 'tier documented needs an officer, participant, official table or map as the author (role %s is at most inferred)' % role)
            if r.get('claim_support_verified') is not True: self.E(at, 'tier documented needs claim_support_verified true (the whole passage read, and it states exactly this)')
        if t == 'inferred' and not (isinstance(r.get('reasoning'), str) and len(r['reasoning'].strip()) >= 20): self.E(at, 'tier inferred needs reasoning (how it follows from the passage)')
        if t == 'plausible-procedural': self.E(at, 'a group file holds what a source prints (documented, inferred) and gaps; procedural fill is the builder\'s, never typed in')
        if r.get('fidelity_check') != 'passed_full_read': self.E(at, 'fidelity_check must be passed_full_read (set only after reading the passage of source.passage in full)')
        if not isinstance(r.get('claim_support_verified'), bool): self.E(at, 'claim_support_verified must be true or false')
        for f in ('ocr_uncertain', 'flag_single_source'):
            if not isinstance(r.get(f), bool): self.E(at, '%s must be true or false' % f)
        if not (isinstance(r.get('statement'), str) and 12 <= len(r['statement']) <= 400): self.E(at, 'statement (one sentence in your words of what the passage states of this unit) is required, 12 to 400 characters')
        w = r.get('when')
        # ---- by kind
        if k == 'unit':
            u = r.get('unit') or {}
            if u.get('action') not in UNIT_ACTIONS: self.E(at, 'unit.action must be one of %s' % ', '.join(UNIT_ACTIONS))
            if u.get('action') in ('add', 'absent'):
                for f in ('parent', 'name', 'level', 'arm'):
                    if not u.get(f): self.E(at, 'unit.%s is required to add a unit' % f)
                if u.get('level') and u['level'] not in UNIT_LEVELS: self.E(at, 'unit.level must be one of %s' % ', '.join(UNIT_LEVELS))
                if u.get('arm') and u['arm'] not in UNIT_ARMS: self.E(at, 'unit.arm must be one of %s' % ', '.join(UNIT_ARMS))
                if u.get('parent') and not self.unit_ok(u['parent']): self.E(at, 'unit.parent %s is not a unit' % u['parent'])
                if uid in self.repo.units: self.E(at, '%s is already in the roster' % uid)
                elif uid not in self.repo.gaps and not uid.startswith(str(u.get('parent')) + '-'): self.E(at, 'a new id is the parent id, a hyphen and a slug')
                if u.get('action') == 'absent' and u.get('status') not in ('never_on_field', 'never_main_field'): self.E(at, 'unit.status must be never_on_field or never_main_field for an absent unit (the table prints it as not engaged)')
                if u.get('action') == 'add' and u.get('status', 'on_field') not in UNIT_STATUS: self.E(at, 'unit.status must be one of %s' % ', '.join(UNIT_STATUS))
            if u.get('action') == 'status' and u.get('status') not in UNIT_STATUS: self.E(at, 'unit.status must be one of %s (the new roster status)' % ', '.join(UNIT_STATUS))
            if u.get('action') == 'rename' and not (isinstance(u.get('name'), str) and u['name'].strip()): self.E(at, 'unit.name (the new name, as printed) is required to rename a unit')
            if u.get('action') == 'fix' and not (isinstance(u.get('fix'), str) and len(u['fix'].strip()) >= 40): self.E(at, 'unit.fix (what is wrong with the roster entry and what it should be, 40 characters or more) is required')
            if u.get('action') == 'merge' and (len(u.get('merge_of') or []) < 2 or any(x not in self.repo.units for x in u['merge_of'])): self.E(at, 'unit.merge_of must list two or more roster ids')
            if u.get('action') == 'attached' and not self.unit_ok(u.get('attached_to')): self.E(at, 'unit.attached_to must be a unit')
            if u.get('action') == 'reparent':
                # the unit stands under another formation than the roster says: from `when` (a transfer during the battle), or for the whole battle when `when` is absent (the roster entry is wrong)
                np_, op_ = u.get('new_parent'), u.get('old_parent')
                if not (isinstance(np_, str) and self.unit_ok(np_)): self.E(at, 'unit.new_parent must be a unit (a roster id, or one added by a unit record of this file)')
                elif np_ == uid or (uid in self.repo.units and uid in self.repo.ancestors(np_)): self.E(at, 'unit.new_parent %s is the unit itself or a unit below it' % np_)
                elif np_ == (self.repo.units.get(uid) or {}).get('parent'): self.E(at, 'unit.new_parent %s is the roster parent already: nothing changes' % np_)
                if op_ is not None:
                    if not (isinstance(op_, str) and self.unit_ok(op_)): self.E(at, 'unit.old_parent must be a unit when it is given')
                    elif uid in self.repo.units and op_ != self.repo.units[uid].get('parent'): self.W(at, 'unit.old_parent %s is not the roster parent of %s (%s)' % (op_, uid, self.repo.units[uid].get('parent')))
                if w is not None: self.when(at, w, need=False)
            elif w is not None: self.E(at, 'a unit record carries `when` only for a reparent (the time the change took effect)')
            return
        if k == 'strength':
            s = r.get('strength') or {}
            if s.get('what') not in STRENGTH_WHAT: self.E(at, 'strength.what must be one of %s' % ', '.join(STRENGTH_WHAT))
            v, lo, hi = s.get('value'), s.get('min'), s.get('max')
            ok = isinstance(v, int) and v > 0 and lo is None and hi is None or v is None and isinstance(lo, int) and isinstance(hi, int) and 0 < lo <= hi
            if not ok: self.E(at, 'strength needs value (one printed number) or min and max (a printed range), positive integers')
            if not (isinstance(s.get('printed'), str) and s['printed']): self.E(at, 'strength.printed (the words and figures as printed) is required')
            elif isinstance(v, int) and not re.search(r'\d', s['printed']) and not s.get('number_in_words'): self.E(at, 'strength.printed carries no digit: set strength.number_in_words true if the number is printed in words')
            if not (isinstance(s.get('as_of'), str) and ISO_D.match(s['as_of'])): self.E(at, 'strength.as_of (the date the figure refers to) must be 1863-MM-DD')
            if not isinstance(s.get('approx'), bool): self.E(at, 'strength.approx must be true or false')
            return
        if k == 'road_identification':
            x = r.get('road_identification') or {}
            if not x.get('printed_name'): self.E(at, 'road_identification.printed_name is required')
            if x.get('ref') not in self.repo.gz or self.repo.gz[x['ref']].get('kind') != 'line': self.E(at, 'road_identification.ref must be a gazetteer road')
            if not (isinstance(x.get('basis'), str) and len(x['basis']) >= 40): self.E(at, 'road_identification.basis (what in the passage ties the printed name to the road) is required')
            return
        if k == 'line_order':
            o = r.get('order') or {}
            if o.get('direction') not in ('right_to_left', 'left_to_right', 'front_to_rear', 'head_to_tail'): self.E(at, 'order.direction must be right_to_left, left_to_right, front_to_rear or head_to_tail (a column)')
            us = o.get('units') or []
            if len(us) < 2 or any(not self.unit_ok(x) for x in us): self.E(at, 'order.units must list two or more units')
            self.when(at, w)
            return
        if k == 'absent':
            a = r.get('absent') or {}
            if not isinstance(a.get('whole_battle'), bool): self.E(at, 'absent.whole_battle must be true or false')
            if not (isinstance(a.get('where_printed'), str) or isinstance(a.get('duty_printed'), str)): self.E(at, 'absent needs where_printed or duty_printed')
            if a.get('whole_battle') is False: self.when(at, w); self.when(at, r.get('until'), need=False, name='until')
            if a.get('part') is not None and not isinstance(a['part'], str): self.E(at, 'absent.part (which part of the unit, as printed) is a string')
            return
        self.when(at, w, need=(k != 'arrival_road'))
        if r.get('until') is not None: self.when(at, r['until'], name='until')
        wd = (w or {}).get('date') if isinstance(w, dict) else None
        if k in ('arrival_road', 'departure', 'march'):
            rd = r.get('road')
            if k != 'march' or rd is not None:
                if not isinstance(rd, dict) or not (isinstance(rd.get('printed'), str) and rd['printed']): self.E(at, 'road.printed (the road or route words as printed) is required')
                else:
                    ref = rd.get('ref')
                    if ref is not None and (ref not in self.repo.gz or self.repo.gz[ref].get('kind') != 'line'): self.E(at, 'road.ref %s is not a gazetteer road' % ref)
                    if ref is not None and rd.get('identification') is None:
                        names = [self.repo.gz[ref]['name']] + (self.repo.gz[ref].get('aliases') or []) if ref in self.repo.gz else []
                        if not any(nm.lower() in rd['printed'].lower() for nm in names): self.E(at, 'road.printed does not carry a name of %s: give road.identification (a road_identification record, an RC- id of the concordance, or null ref)' % ref)
                    if rd.get('identification') is not None: self.ref(at, rd['identification'], 'road.identification')
                    if k == 'arrival_road' and not isinstance(rd.get('enters_ground'), bool): self.E(at, 'road.enters_ground must be true (the passage puts the unit on this road as it comes to the field) or false (a road of an earlier march)')
        if k == 'arrival':
            a = r.get('arrival') or {}
            if a.get('scope') not in ('field', 'vicinity'): self.E(at, 'arrival.scope must be field (the unit reaches the battlefield) or vicinity (it halts short of it)')
            if r.get('place') is None: self.E(at, 'place is required')
            else: self.place(at, r['place'], False, wd, uid)
        if k in PLACED:
            self.place(at, r.get('place'), True, wd, uid)
            if r.get('activity') not in ACTIVITIES: self.E(at, 'activity must be one of %s' % ', '.join(ACTIVITIES))
            if r.get('activity') == 'other' and not r.get('activity_printed'): self.E(at, 'activity other needs activity_printed (the verb as printed)')
            if r.get('formation') is not None and r['formation'] not in FORMATIONS: self.E(at, 'formation must be null or one of %s' % ', '.join(FORMATIONS))
            f = r.get('facing')
            if not isinstance(f, dict) or f.get('basis') not in FACING: self.E(at, 'facing.basis must be one of %s' % ', '.join(FACING))
            else:
                fb = f['basis']
                if fb == 'printed_compass':
                    pr = str(f.get('printed') or '').lower(); hit = [c for c in COMPASS if re.search(r'\b' + c + r'\b', pr)]
                    if not hit: self.E(at, 'facing.printed carries no compass word')
                    elif f.get('deg') not in {COMPASS[c] for c in hit}: self.E(at, 'facing.deg must be the bearing of the printed compass word (%s)' % ', '.join('%s=%d' % (c, COMPASS[c]) for c in hit))
                elif fb == 'none':
                    if f.get('deg') is not None: self.E(at, 'facing.deg is null when nothing is printed')
                else:
                    if f.get('deg') is not None: self.E(at, 'facing.deg is computed by the builder for basis %s: leave it null and give facing.ref' % fb)
                    ref = f.get('ref')
                    ok = (fb == 'toward_unit' and self.unit_ok(ref)) or (fb == 'parallel_to_road' and ref in self.repo.gz and self.repo.gz[ref].get('kind') == 'line') or (fb == 'toward_place' and (ref in self.repo.gz or ref in self.repo.mon or ref in self.repo.struct))
                    if not ok: self.E(at, 'facing.ref %s does not fit basis %s' % (ref, fb))
                    if not f.get('printed'): self.E(at, 'facing.printed (the words that give the front) is required')
            if k == 'night_position' and isinstance(w, dict) and w.get('basis') == 'printed_period' and w.get('period') not in ('night', 'dusk', 'evening', 'midnight', 'before_daylight'): self.W(at, 'a night_position usually carries a night word')
        if k == 'movement':
            for end in ('from', 'to'):
                x = r.get(end)
                if isinstance(x, str): self.ref(at, x, end)
                elif isinstance(x, dict): self.place(at, x, False, wd, uid)
                elif end == 'to': self.E(at, 'movement.to is required (a record id or a place)')
            if r.get('gait') not in ('march', 'double_quick', 'gallop', 'unknown'): self.E(at, 'gait must be march, double_quick, gallop or unknown')
        if k == 'departure' and r.get('place') is not None: self.place(at, r['place'], False, wd, uid)

    def file(self, path, gid, complete=False):
        if gid not in self.repo.gids and not gid.startswith('r2-'): self.E(path, 'the file name is not a group id of groups.json')
        raw = open(path, encoding='utf-8').read()
        if '\r' in raw: self.E(path, 'the file has carriage returns: Unix newlines only')
        rows = []
        for n, line in enumerate(raw.split('\n'), 1):
            if not line.strip(): continue
            try: rows.append((n, json.loads(line)))
            except Exception as e: self.E('line %d' % n, 'not JSON: %s' % e)
        ids = [r.get('claim_id') for _, r in rows if isinstance(r, dict)]
        for i in sorted({i for i in ids if ids.count(i) > 1}, key=str): self.E(path, 'claim_id %s is used twice' % i)
        if os.path.dirname(os.path.abspath(path)) == UND:
            for i in sorted({i for i in ids if isinstance(i, str) and ID_RE.match(i) and int(ID_RE.match(i).group(2)) >= 9000}): self.E(path, 'claim_id %s: the numbers from 9000 are reserved for the fixtures and the self-test (use 0001 to 8999)' % i)
        self.known_ids |= set(i for i in ids if isinstance(i, str))
        declared = {}
        for _, r in rows:
            if isinstance(r, dict) and r.get('kind') == 'source' and isinstance(r.get('source_decl'), dict) and r['source_decl'].get('source_id'):
                d = r['source_decl']; declared[d['source_id']] = {'kind': 'text', 'path': d.get('path') or ''}
            if isinstance(r, dict) and r.get('kind') == 'unit' and isinstance(r.get('unit'), dict) and r['unit'].get('action') == 'add' and isinstance(r.get('unit_id'), str) and not (self.repo.gaps.get(r['unit_id']) or {}).get('footnote_of'): self.declared_units.add(r['unit_id'])      # a footnote entry of roster-gaps.json is no unit: an `add` of its id declares nothing and is refused at the record
        for n, r in rows: self.record(n, r, gid, declared)
        # ---- coverage of the group's units: evidence of the right kind or a gap record for every word of what is missing (see coverage())
        cov = {}
        for _, r in rows:
            if isinstance(r, dict) and isinstance(r.get('unit_id'), str): cov.setdefault(r['unit_id'], set()).add(r.get('kind'))
        need = [u for u in self.repo.group_units.get(gid, []) if self.repo.unit_class.get(u) in ('not_drawn', 'edge_only', 'partly_drawn')]
        owed, n_items = coverage(self.repo, gid, [r for _, r in rows])
        for u in sorted(owed):
            if complete: self.E(path, 'unit %s: still owed %s' % (u, '; '.join('%s%s' % (w, (' on ' + d) if d else '') for w, d in owed[u])))
        return {'records': len(rows), 'units_named': len(cov), 'units_to_cover': len(need), 'units_owed': len(owed), 'items_owed': sum(len(v) for v in owed.values()), 'items': n_items,
                'kinds': {k: sum(1 for _, r in rows if isinstance(r, dict) and r.get('kind') == k) for k in KINDS}}


WORDS_INHERITED = ('arrival', 'positions', 'path')          # these come down the line of command in the layer: evidence or a gap of a formation above covers the units below
EVIDENCE_FOR = {'arrival': ('arrival',), 'positions': tuple(PLACED) + ('movement', 'departure'), 'path': ('arrival_road',), 'strength': ('strength',)}
FIELD_DAYS = ['1863-07-01', '1863-07-02', '1863-07-03']


def coverage(repo, gid, rows):
    """-> ({ unit: [(word, day or None)] } of what is still owed, the number of items to cover): for every unit of the group that is not drawn, at the edge or partly drawn and every word of its `missing`, evidence of the right kind
    (its own, or a formation above's for arrival, positions and path) or a gap record that names the word. positions: one record or gap per day of 1 to 3 July on which the layer holds no place."""
    by = {}
    for r in rows:
        if isinstance(r, dict) and isinstance(r.get('unit_id'), str) and r.get('kind') not in ('source',): by.setdefault(r['unit_id'], []).append(r)
    owed = {}

    def gaps_for(u, word, day):
        for x in [u] + repo.ancestors(u):
            for r in by.get(x, []):
                if r.get('kind') != 'gap': continue
                g = r.get('gap') or {}
                if word not in (g.get('what') or []): continue
                if not (x == u or u in (g.get('covers') or []) or word in WORDS_INHERITED): continue
                if day and g.get('days') and day not in g['days']: continue
                return True
        return False

    def evidence(u, word, day):
        for x in [u] + repo.ancestors(u):
            if x != u and word not in WORDS_INHERITED: continue
            for r in by.get(x, []):
                k = r.get('kind')
                if word == 'parent_only':
                    if x == u and k not in ('gap',): return True
                    continue
                if k not in EVIDENCE_FOR.get(word, ()): continue
                if word == 'arrival' and (r.get('arrival') or {}).get('scope') != 'field': continue
                if word == 'path' and not (r.get('road') or {}).get('enters_ground'): continue
                if word == 'positions' and day and ((r.get('when') or {}).get('date') != day): continue
                return True
        return False
    total = 0
    # the roster-gap entries of the group (roster-gaps.json): each is confirmed by a `unit` record of its id, or answered by a gap record that names the word `roster`; an entry with `needs` also needs a `unit` record of each action named
    # (reparent: the roster's parent is wrong, or changes during the battle). A footnote entry (`footnote_of`) is not a unit: it is answered by the records of the entries it carries.
    for e in sorted(getattr(repo, 'gaps', {}).values(), key=lambda x: x['id']):
        if e.get('group') != gid or e.get('footnote_of'): continue
        recs = by.get(e['id'], []); units_ = [r for r in recs if r.get('kind') == 'unit']
        roster_gap = any(r.get('kind') == 'gap' and 'roster' in ((r.get('gap') or {}).get('what') or []) for r in recs)
        total += 1
        if not units_ and not roster_gap: owed.setdefault(e['id'], []).append(('roster entry (a unit record, or a gap record with what: roster)', None))
        for need in e.get('needs') or []:
            total += 1
            if not roster_gap and not any((r.get('unit') or {}).get('action') == need for r in units_): owed.setdefault(e['id'], []).append(('unit record of action %s' % need, None))
    for u in repo.group_units.get(gid, []):
        if repo.unit_class.get(u) not in ('not_drawn', 'edge_only', 'partly_drawn'): continue
        st = repo.status.get(u) or {}
        for word in repo.unit_missing.get(u, []):
            if word == 'positions':
                days = [d for d in FIELD_DAYS if (st.get('places') or {}).get(d) == 'none']
                total += len(days)
                for d in days:
                    if not evidence(u, word, d) and not gaps_for(u, word, d): owed.setdefault(u, []).append((word, d))
            else:
                total += 1
                if not evidence(u, word, None) and not gaps_for(u, word, None): owed.setdefault(u, []).append((word, None))
    return owed, total


def run(paths, complete=False, quiet=False):
    repo = Repo(); allids, allunits = set(), set()
    files = []
    for p in paths:
        f = p if p.endswith('.jsonl') else os.path.join(UND, p + '.jsonl')
        files.append((f, os.path.basename(f)[:-6]))
    for f in sorted(set(glob.glob(os.path.join(UND, '*.jsonl'))) | {f for f, _ in files}):      # ids and added units of every group file first, so that a record may point into another group's file
        if not os.path.exists(f): continue
        for line in open(f, encoding='utf-8'):
            try: r = json.loads(line)
            except Exception: continue
            if isinstance(r, dict):
                if isinstance(r.get('claim_id'), str): allids.add(r['claim_id'])
                if r.get('kind') == 'unit' and (r.get('unit') or {}).get('action') == 'add' and isinstance(r.get('unit_id'), str): allunits.add(r['unit_id'])
    bad = nos = 0; seen = {}
    for f, gid in files:
        if not os.path.exists(f): print('%s: no such file' % f); bad += 1; continue
        c = Check(repo, allids, allunits); st = c.file(f, gid, complete)
        for line in open(f, encoding='utf-8'):
            try: i = json.loads(line).get('claim_id')
            except Exception: continue
            if i in seen and seen[i] != gid: c.E(f, 'claim_id %s is also in %s.jsonl' % (i, seen[i]))
            seen[i] = gid
        if not quiet:
            for e in c.err: print('ERROR  ' + e)
            for w in c.warn: print('warn   ' + w)
            for w in c.nosrc: print('NOTEXT ' + w)
        print('%s: %d records, %d units named, %d errors, %d warnings%s | owed: %d of %d units still owed something, %d of %d items (a missing word; for positions one per day without a place) | %s' % (os.path.basename(f), st['records'], st['units_named'], len(c.err), len(c.warn), (', %d quotes not checked (text missing)' % len(c.nosrc)) if c.nosrc else '', st['units_owed'], st['units_to_cover'], st['items_owed'], st['items'], ' '.join('%s %d' % kv for kv in st['kinds'].items() if kv[1])))
        bad += len(c.err); nos += len(c.nosrc)
    return 1 if bad else 2 if nos else 0


def self_test():
    fx = os.path.join(HERE, 'fixtures'); ok = True
    repo = Repo()
    good = os.path.join(fx, 'us-3c-2d.good.jsonl'); badf = os.path.join(fx, 'us-3c-2d.bad.jsonl')
    c = Check(repo); c.file(good, 'us-3c-2d')
    print(('PASS' if not c.err else 'FAIL') + ' the good fixture has no error' + ('' if not c.err else ': ' + ' | '.join(c.err)))
    ok &= not c.err
    for w in c.warn: print('   warning kept: ' + w[:200])
    if c.nosrc: print('NOTE   %d quotes of the good fixture could not be checked: the text is not on this machine' % len(c.nosrc))
    rows = [(n, l) for n, l in enumerate(open(badf, encoding='utf-8').read().split('\n'), 1) if l.strip()]
    c = Check(repo); c.file(badf, 'us-3c-2d')
    by = {}
    for e in c.err:
        m = re.match(r'line (\d+)', e)
        if m: by.setdefault(int(m.group(1)), []).append(e)
    bad_ok = True
    for n, l in rows:
        try: exp = json.loads(l).get('_expect')
        except Exception: exp = 'not JSON'
        errs = by.get(n, [])
        if not errs: print('FAIL   bad line %d is not refused (expected: %s)' % (n, exp)); bad_ok = False
        elif exp and not any(exp.lower() in e.lower() for e in errs): print('FAIL   bad line %d is refused for another reason than "%s": %s' % (n, exp, errs[0][:200])); bad_ok = False
    print(('PASS' if bad_ok else 'FAIL') + ' every one of the %d lines of the bad fixture is refused, each for the defect it carries' % len(rows))
    ok &= bad_ok
    # a `unit` record and a `gap` record: the two kinds the fixtures do not hold (they need no passage of a text for their shape); built here from a good record and never written
    recs = [json.loads(l) for l in open(good, encoding='utf-8') if l.strip()]
    base = next(r for r in recs if r['claim_id'].endswith('9003'))
    u = copy.deepcopy(base); u.update(claim_id='U-us-3c-2d-9201', kind='unit', unit_id='us-3c-2d-provost-synth', unit={'action': 'add', 'parent': 'us-3c-2d', 'name': 'synthetic unit of the self-test', 'level': 'company', 'arm': 'infantry'}); u.pop('place'); u.pop('when'); u.pop('arrival'); u.pop('conflicts_with'); u['conflicts_with'] = []
    g = {'claim_id': 'U-us-3c-2d-9202', 'group': 'us-3c-2d', 'kind': 'gap', 'unit_id': 'us-3c-2d-brewster-74ny', 'tier': 'open gap', 'render_flag': None,
         'gap': {'what': ['arrival'], 'register': 'docs/battle-theatre/GOVERNANCE/horde/ws-units/proposed-register/us-3c-2d-synth.md',
                 'searched': [{'source_id': 'OR27-1', 'where': 'part 1, reports R158 to R178', 'terms': 'a synthetic search of the self-test', 'result': 'synthetic'}, {'source_id': 'OR27-2', 'where': 'part 2', 'terms': 'synthetic', 'result': 'synthetic'},
                              {'source_id': 'NOT-ACQUIRED:a book that is not on this machine', 'where': 'none', 'terms': 'none', 'result': 'not searched: the text is not available'}]}}
    tmp = os.path.join(fx, '_synthetic.jsonl')
    try:
        with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
            for r in (u, g): f.write(json.dumps(r, ensure_ascii=False) + '\n')
        c = Check(repo); c.file(tmp, 'us-3c-2d')
        syn = [e for e in c.err]
        print(('PASS' if not syn else 'FAIL') + ' a unit record and a gap record that follow the contract are accepted' + ('' if not syn else ': ' + ' | '.join(syn)))
        ok &= not syn
    finally:
        if os.path.exists(tmp): os.remove(tmp)
    # reparent: a `unit` record that puts a unit under another formation, from a time (a transfer during the battle) or for the whole battle (the roster entry is wrong); synthetic, never written
    def synth(rows_, repo_=None):
        tmp_ = os.path.join(fx, '_synthetic2.jsonl')
        try:
            with open(tmp_, 'w', encoding='utf-8', newline='\n') as f:
                for r_ in rows_: f.write(json.dumps(r_, ensure_ascii=False) + '\n')
            c_ = Check(repo_ or repo); c_.file(tmp_, 'us-3c-2d'); return c_.err, c_.warn
        finally:
            if os.path.exists(tmp_): os.remove(tmp_)
    def rp(n, uid='us-3c-2d-carr-1ma', when=True, **un):
        r_ = copy.deepcopy(base); r_.update(claim_id='U-us-3c-2d-%04d' % (9300 + n), kind='unit', unit_id=uid, unit=un)
        for k_ in ('place', 'arrival'): r_.pop(k_)
        if not when: r_.pop('when')
        r_['conflicts_with'] = []; r_['conflict_key'] = None
        return r_
    rp_cases = [('a reparent from a time is accepted', [rp(1, action='reparent', new_parent='us-3c-2d-brewster', old_parent='us-3c-2d-carr')], None),
                ('a reparent for the whole battle (no time) is accepted', [rp(2, when=False, action='reparent', new_parent='us-3c-2d-brewster')], None),
                ('a reparent without a new parent is refused', [rp(3, action='reparent')], 'unit.new_parent must be a unit'),
                ('a reparent to a name that is no unit is refused', [rp(4, action='reparent', new_parent='us-3c-2d-nowhere')], 'unit.new_parent must be a unit'),
                ('a reparent under itself is refused', [rp(5, action='reparent', new_parent='us-3c-2d-carr-1ma')], 'the unit itself or a unit below it'),
                ('a reparent under the unit\'s own descendant is refused', [rp(6, uid='us-3c-2d-carr', action='reparent', new_parent='us-3c-2d-carr-1ma')], 'the unit itself or a unit below it'),
                ('a reparent to the roster parent changes nothing and is refused', [rp(7, action='reparent', new_parent='us-3c-2d-carr')], 'roster parent already'),
                ('a time on a unit record that is not a reparent is refused', [rp(8, action='status', status='on_field')], 'only for a reparent'),
                ('a reparent with a time that is not a date is refused', [dict(rp(9, action='reparent', new_parent='us-3c-2d-brewster'), when={'date': 'July 1', 'approx': False})], 'when.date must be')]
    rp_ok = True
    for name, rows_, want in rp_cases:
        errs_, _w = synth(rows_)
        if want is None and errs_: print('FAIL   %s: %s' % (name, ' | '.join(errs_)[:300])); rp_ok = False
        elif want is not None and not any(want.lower() in e.lower() for e in errs_): print('FAIL   %s: no error holding "%s" (errors: %s)' % (name, want, ' | '.join(errs_)[:300])); rp_ok = False
    repo_f = copy.copy(repo); repo_f.gaps = dict(repo.gaps, **{'us-3c-2d-footnote-synth': {'id': 'us-3c-2d-footnote-synth', 'group': 'us-3c-2d', 'footnote_of': ['us-3c-2d-carr-1ma']}})
    errs_, _w = synth([rp(10, uid='us-3c-2d-footnote-synth', when=False, action='add', parent='us-3c-2d', name='a footnote', level='company', arm='infantry')], repo_f)
    if not any('is a footnote' in e for e in errs_): print('FAIL   a record that names a footnote entry as a unit is not refused: %s' % ' | '.join(errs_)[:300]); rp_ok = False
    print(('PASS' if rp_ok else 'FAIL') + ' reparent records and footnote entries (%d cases)' % (len(rp_cases) + 1))
    ok &= rp_ok
    # coverage: what a unit is still owed, and what covers it (synthetic rows, never written)
    unit, gid = 'us-3c-2d-carr-1ma', 'us-3c-2d'
    repo = copy.copy(repo)          # the test states its own status (a unit not drawn that has no place on 2 and 3 July), so that it does not change when the layer does
    repo.status = {unit: {'places': {'1863-07-01': 'before_gate', '1863-07-02': 'none', '1863-07-03': 'none'}}}; repo.unit_missing = {unit: ['arrival', 'positions', 'path', 'strength']}
    repo.unit_class = {unit: 'not_drawn'}; repo.group_units = {gid: [unit]}
    R_ = lambda kind, u, **kw: dict(kind=kind, unit_id=u, **kw)
    full = [R_('arrival_road', 'us-3c-2d-carr', road={'enters_ground': True}), R_('arrival', unit, arrival={'scope': 'field'}), R_('strength', unit),
            R_('position', unit, when={'date': '1863-07-02'}), R_('night_position', unit, when={'date': '1863-07-03'})]
    words = lambda rows: {w + ('@' + d if d else '') for w, d in coverage(repo, gid, rows)[0].get(unit, [])}
    cases = [('nothing recorded: all words owed', [], {'arrival', 'path', 'strength', 'positions@1863-07-02', 'positions@1863-07-03'}),
             ('a road of a formation above, an arrival, a strength and a place on each day without one: nothing owed', full, set()),
             ('no strength record: the strength is owed', [r for r in full if r['kind'] != 'strength'], {'strength'}),
             ('a road that does not enter the ground does not cover the path', [dict(full[0], road={'enters_ground': False})] + full[1:], {'path'}),
             ('an arrival at the vicinity does not cover the arrival', [full[0], R_('arrival', unit, arrival={'scope': 'vicinity'})] + full[2:], {'arrival'}),
             ('no place on 3 July: that day is owed', [r for r in full if r['kind'] != 'night_position'], {'positions@1863-07-03'}),
             ('a gap of the brigade for positions on 3 July covers that day (it comes down the line)', [r for r in full if r['kind'] != 'night_position'] + [R_('gap', 'us-3c-2d-carr', gap={'what': ['positions'], 'days': ['1863-07-03']})], set()),
             ('a gap of the brigade for strength does not cover the regiment unless it lists it', [r for r in full if r['kind'] != 'strength'] + [R_('gap', 'us-3c-2d-carr', gap={'what': ['strength']})], {'strength'}),
             ('a gap that lists the regiment in covers does', [r for r in full if r['kind'] != 'strength'] + [R_('gap', 'us-3c-2d-carr', gap={'what': ['strength'], 'covers': [unit]})], set())]
    cov_ok = True
    for name, rows_, want in cases:
        got = words(rows_)
        if got != want: print('FAIL   coverage: %s: owed %s, wanted %s' % (name, sorted(got), sorted(want))); cov_ok = False
    print(('PASS' if cov_ok else 'FAIL') + ' coverage of the words a unit is missing (%d cases)' % len(cases))
    ok &= cov_ok
    # coverage of the roster-gap entries of a group (synthetic entries)
    repo2 = copy.copy(repo); repo2.group_units = {gid: []}; repo2.unit_class = {}; repo2.unit_missing = {}
    repo2.gaps = {'g-a': {'id': 'g-a', 'group': gid}, 'g-b': {'id': 'g-b', 'group': gid, 'needs': ['reparent']}, 'g-f': {'id': 'g-f', 'group': gid, 'footnote_of': ['g-a']}, 'g-x': {'id': 'g-x', 'group': 'another-group'}}
    UR = lambda uid, action: R_('unit', uid, unit={'action': action}); GR = lambda uid: R_('gap', uid, gap={'what': ['roster']})
    owed_ = lambda rows_: {k: [w for w, _d in v] for k, v in coverage(repo2, gid, rows_)[0].items()}
    gcases = [('nothing recorded: the two entries of the group are owed, not the footnote and not the other group\'s entry', [], {'g-a', 'g-b'}),
              ('a unit record of each, but not the reparent that g-b needs: g-b is owed', [UR('g-a', 'add'), UR('g-b', 'status')], {'g-b'}),
              ('the reparent record answers the need', [UR('g-a', 'add'), UR('g-b', 'status'), UR('g-b', 'reparent')], set()),
              ('a gap record that names roster answers an entry and its needs', [GR('g-a'), GR('g-b')], set()),
              ('a gap record that names another word does not answer the entry', [R_('gap', 'g-a', gap={'what': ['strength']}), UR('g-b', 'reparent')], {'g-a'})]
    g_ok = True
    for name, rows_, want in gcases:
        got = set(owed_(rows_))
        if got != want: print('FAIL   roster entries: %s: owed %s, wanted %s' % (name, sorted(got), sorted(want))); g_ok = False
    print(('PASS' if g_ok else 'FAIL') + ' coverage of the roster-gap entries of a group (%d cases)' % len(gcases))
    ok &= g_ok
    print('self-test', 'OK' if ok else 'FAILED')
    return 0 if ok else 1


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('groups', nargs='*'); ap.add_argument('--all', action='store_true'); ap.add_argument('--complete', action='store_true'); ap.add_argument('--quiet', action='store_true')
    ap.add_argument('--verify'); ap.add_argument('--source'); ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test: sys.exit(self_test())
    if a.verify:
        repo = Repo(); srcs = [a.source] if a.source else [k for k, v in repo.sources.items() if v['kind'] != 'text' or not k.startswith(('ADAMS', 'GBG-'))]
        n = 0
        for sid in srcs:
            try: hits = find_quote(repo, sid, a.verify)
            except Missing as e: print('NOTEXT %s (%s)' % (sid, e)); continue
            except KeyError: print('UNKNOWN source %s' % sid); continue
            for h in hits:
                n += 1; print('FOUND %s quote_offset=%d end=%d %s page=%s | words=%d' % (sid, h['offset'], h['end'], ('report_id=%s' % h['report_id']) if 'report_id' in h else ('section=%s' % h['section']) if 'section' in h else '', h.get('page'), words(a.verify)))
        if not n: print('NOT FOUND (%d words): %s' % (words(a.verify), a.verify))
        sys.exit(0 if n else 1)
    paths = a.groups
    if a.all:
        paths = sorted(os.path.basename(f)[:-6] for f in glob.glob(os.path.join(UND, '*.jsonl')))
        if not paths: print('no group file is present yet (%s/<group>.jsonl): nothing to check' % os.path.relpath(UND, ROOT).replace(os.sep, '/')); sys.exit(0)
    if not paths: ap.print_help(); sys.exit(1)
    sys.exit(run(paths, a.complete, a.quiet))
