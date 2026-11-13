"""Readers for the master plan (docs/plan/FINAL) used by merge_status.py: roadmap nodes, WP dependency tables, plan acceptance text.

Everything here is a plain text reader: nothing is invented. A WP the plan text does not describe simply has no entry."""
import json
import os
import re

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FINAL = os.path.join(REPO, 'docs', 'plan', 'FINAL')

CHAPTER_FILES = {
    '01': '01-decision-register.md', '02': '02-tranche0-hotfix-runbook.md', '03': '03-source-rebuild-and-parity.md',
    '04': '04-time-model-and-historical-accuracy.md', '05': '05-performance-to-green.md', '06': '06-ux-ui-mobile-desktop.md',
    '07': '07-accessibility.md', '08a': '08a-subpages-A-B.md', '08b': '08b-subpages-C.md', '09': '09-infra-security-privacy-pwa.md',
    '10': '10-seo-growth.md', '11': '11-copy-docs-content.md', '12': '12-qa-ci-release.md', '13': '13-data-quality-and-accuracy.md',
    '14': '14-ask-the-historian-expansion.md', '15': '15-integrated-roadmap.md', '16': '16-audit-corrections-and-new-findings.md',
}
WP_RE = re.compile(r'WP-[A-Z0-9]+-\d+[a-z]?')


def read(path):
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def load_roadmap():
    return json.load(open(os.path.join(FINAL, '15-roadmap.json'), encoding='utf-8'))


def expand_wp_tokens(s):
    """'WP-INFRA-01/02, WP-ARCH-04..33, WP-PAGE-05, 07' -> ids (stdlib, no guessing beyond ranges, slashes and bare numbers after a prefix)."""
    ids, last = [], None
    for part in s.split(','):
        part = part.strip()
        m = re.match(r'^(WP-[A-Z0-9]+)-(\d+)\.\.(\d+)', part)
        if m:
            last = m.group(1)
            ids += ['%s-%02d' % (m.group(1), k) for k in range(int(m.group(2)), int(m.group(3)) + 1)]
            continue
        m = re.match(r'^(WP-[A-Z0-9]+)-(\d+[a-z]?)((?:/\d+[a-z]?)*)', part)
        if m:
            last = m.group(1)
            ids.append('%s-%s' % (m.group(1), m.group(2)))
            ids += ['%s-%s' % (m.group(1), x) for x in m.group(3).split('/') if x]
            continue
        m = re.match(r'^(\d+[a-z]?)\b', part)
        if m and last:
            ids.append('%s-%s' % (last, m.group(1)))
    return ids


def wp_to_nodes(roadmap):
    out = {}
    for n in roadmap['nodes']:
        for w in expand_wp_tokens(n.get('source_wps', '')):
            out.setdefault(w, [])
            if n['id'] not in out[w]:
                out[w].append(n['id'])
    return out


def _split_row(line):
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    return cells


def parse_dep_tables():
    """For every chapter table whose header has a 'Dep' column: WP id -> raw dependency cell."""
    deps = {}
    for ch, fn in CHAPTER_FILES.items():
        p = os.path.join(FINAL, fn)
        if not os.path.isfile(p):
            continue
        header = None
        for line in read(p).splitlines():
            if not line.startswith('|'):
                header = None
                continue
            cells = _split_row(line)
            if cells and cells[0] in ('WP', 'ID', 'Id') and any(c.lower().startswith('dep') for c in cells):
                header = [c.lower() for c in cells]
                continue
            wid = None
            if header and cells:
                if re.match(r'^WP-[A-Z0-9]+-\d+[a-z]?$', cells[0]):
                    wid = cells[0]
                elif ch in _SHORT_HEAD and re.match(r'^\d{2}$', cells[0]):
                    wid = '%s-%s' % (_SHORT_HEAD[ch][0], cells[0])
            if wid:
                idx = next((i for i, h in enumerate(header) if h.startswith('dep')), None)
                if idx is not None and idx < len(cells):
                    deps[wid] = cells[idx]
    return deps


def deps_from_cell(wp, cell):
    """Resolve a dependency cell to WP ids of the same family (bare numbers) and explicit WP ids. Nothing else is guessed."""
    fam = re.match(r'^(WP-[A-Z0-9]+)-', wp).group(1)
    out = [x for x in WP_RE.findall(cell)]
    stripped = WP_RE.sub(' ', cell)
    for tok in re.split(r'[,;/\s]+', stripped):
        tok = tok.strip().strip('.')
        if re.fullmatch(r'\d{1,2}[a-z]?', tok):
            out.append('%s-%s' % (fam, tok.zfill(2) if tok.isdigit() else tok))
    seen, res = set(), []
    for x in out:
        if x != wp and x not in seen:
            seen.add(x)
            res.append(x)
    return res


_HEAD_PATTERNS = [re.compile(r'^#{2,5}\s+(WP-[A-Z0-9]+-\d+[a-z]?(?:/\d+[a-z]?)*)'), re.compile(r'^\*\*(WP-[A-Z0-9]+-\d+[a-z]?(?:/\d+[a-z]?)*)')]
# chapter 08a part B names its WPs with the bare number inside the page sections ("**WP-18 chart (T1, A+, L 2.0-3.5 d).**"): family WP-PAGE
_SHORT_HEAD = {'08a': ('WP-PAGE', re.compile(r'^\*\*WP-(\d{2})\b'))}
_MARK = re.compile(r'(?:\*\*|\*)?\b(Accept(?:ance)?|Exit|Test|Tests)\b(?:\*\*|\*)?[.:]+(?:\*\*|\*)?\s*')
_NEXT_LABEL = re.compile(r'\s(?:\*\*|\*)(?:Moves|Risks?|Owner|Depends|Covers|Fix|Audit|Fix\.)(?:\*\*|\*)?[.:]')


def plan_sections():
    """WP id -> {'chapter', 'text'} for every WP the chapter files describe in a section of their own."""
    out = {}
    for ch, fn in CHAPTER_FILES.items():
        p = os.path.join(FINAL, fn)
        if not os.path.isfile(p):
            continue
        cur, buf = None, []
        for line in read(p).splitlines() + ['# END']:
            hit = None
            for pat in _HEAD_PATTERNS:
                m = pat.match(line)
                if m:
                    hit = m.group(1)
                    break
            if hit is None and ch in _SHORT_HEAD:
                fam, pat = _SHORT_HEAD[ch]
                m = pat.match(line)
                if m:
                    hit = '%s-%s' % (fam, m.group(1))
            if hit or re.match(r'^#{1,5}\s', line):
                if cur:
                    for wid in expand_wp_tokens(cur):
                        out.setdefault(wid, {'chapter': ch, 'text': '\n'.join(buf)})
                cur, buf = hit, ([line] if hit else [])
            elif cur:
                buf.append(line)
    return out


def accept_text(section_text, limit=700):
    """The plan's own acceptance sentence(s) of a WP section, verbatim, shortened at a sentence end."""
    if not section_text:
        return None
    m = _MARK.search(section_text)
    if not m:
        return None
    rest = section_text[m.end():]
    para = rest.split('\n\n')[0].split('\n')[0]
    cut = _NEXT_LABEL.search(para)
    if cut:
        para = para[:cut.start()]
    para = re.sub(r'\s+', ' ', para).strip().strip('*').strip()
    if len(para) > limit:
        short = para[:limit]
        k = max(short.rfind('. '), short.rfind('; '))
        para = (short[:k + 1] if k > 200 else short).rstrip() + ' ...'
    return para or None
