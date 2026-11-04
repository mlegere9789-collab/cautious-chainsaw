"""Small helpers for the XII Corps data modules (positions_data_B_XII_*.py): literal-quote regexes, short date/time arguments and
conflict groups.

X(text)   literal regex of OCR text as printed ('~' in text = up to 4 arbitrary characters, for OCR noise)
C(...)    claim() with a literal quote: C(unit, kind, rec, quote, activity, when, 'MM-DD', 'HH:MM' or None, place=..., ..., grp='name')
          grp='name' makes the claim a member of conflict group 'name': every member lists every other member in conflicts_with
          (pairwise, symmetric). join('name', label, label, ...) adds already-labelled claims (written with label=) to a group.
          Groups hold claims that give DIFFERENT values for the same event; nothing is resolved.
"""
import re
from positions_claims import claim, gap

GROUPS = {}
LABELS = {}


def X(s):
    return re.escape(s).replace(r'\ ', ' ').replace(r'\~', '.{0,4}')


PLACE_GROUPS = {'jun29_place', 'jul1_night_2d'}


def _link(a, b, grp=None):
    """Link two members of a conflict group when they give DIFFERENT values: in a place group always; otherwise when both print a clock time
    and the times differ, or when the dates differ. Same clock time = same value = no link; a member without a clock time is not compared
    with a timed one on the same date."""
    if grp not in PLACE_GROUPS:
        ta, tb = a.get('t_iso'), b.get('t_iso')
        if a.get('date') != b.get('date'):
            pass
        elif ta and tb and ta != tb:
            pass
        else:
            return
    la, lb = a['label'], b['label']
    if 'label:' + lb not in a['conflicts']:
        a['conflicts'].append('label:' + lb)
    if 'label:' + la not in b['conflicts']:
        b['conflicts'].append('label:' + la)


def _add(grp, spec):
    g = GROUPS.setdefault(grp, [])
    if any(o is spec for o in g):
        return
    for o in g:
        _link(spec, o, grp)
    g.append(spec)


def C(unit, kind, rec, quote, activity, when, md, hm=None, place=None, grp=None, **kw):
    mon, day = md.split('-')
    date = '1863-%s-%s' % (mon, day)
    t = ('%sT%s' % (date, hm)) if hm else None
    item = claim(unit, kind, rec, X(quote), activity, when_printed=when, date=date, t_iso=t, place_printed=place, **kw)
    spec = item[1]
    if grp and not spec.get('label'):
        spec['label'] = 'g_%s_%d' % (grp, len(GROUPS.get(grp, [])))
    if spec.get('label'):
        if spec['label'] in LABELS:
            raise ValueError('duplicate label ' + spec['label'])
        LABELS[spec['label']] = spec
    if grp:
        _add(grp, spec)
    return item


def join(grp, *labels):
    for lab in labels:
        _add(grp, LABELS[lab])


def G(*a, **kw):
    return gap(*a, **kw)
