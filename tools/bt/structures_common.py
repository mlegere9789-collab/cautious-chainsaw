"""Shared helpers for the B.7/B.8 structure & state-schedule data (generator + validator).
Tier is MECHANICAL: printed PDF tier AND >=1 cited key outside the weak-source set. No source was opened to confirm it
supports the exact claim (primary library not read), so `claim_support_verified` stays false everywhere."""
import re

YEAR = 1863
WEAK_PATTERNS = [
    (r'^Wiki-', 'wikipedia'), (r'^W-CONS$', 'wikipedia (consecration article)'),
    (r'^CWT', 'forum (CivilWarTalk)'), (r'^WHB', 'blog (Women History Blog, flagged unreliable by the PDF)'),
    (r'^GC-COMP$', 'blog (Gettysburg Compiler student post)'),
    (r'^SS-', 'Stone Sentinels'), (r'^SStone-', 'Stone Sentinels'),
]

def weak_kind(key):
    for pat, kind in WEAK_PATTERNS:
        if re.search(pat, key):
            return kind
    return None

def split_keys(s):
    return [k.strip() for k in re.split(r';', s) if k.strip()] if s else []

def primary_tier(printed):
    """Map the PDF's printed tier phrase / D-I-P code to one primary tier. Mixed phrases keep the first."""
    if printed is None:
        return None
    p = printed.strip()
    pl = p.lower()
    if pl.startswith('open gap') or pl in ('n/a', ''):
        return 'open_gap'
    if pl.startswith('documented') or re.match(r'^d\b', pl):
        return 'documented'
    if pl.startswith('inferred') or re.match(r'^i\b', pl):
        return 'inferred'
    if pl.startswith('plausible') or re.match(r'^p\b', pl):
        return 'plausible-procedural'
    if pl.startswith('contested'):
        return 'contested'
    if pl.startswith('derived'):
        return 'inferred'
    return 'unparsed'

def classify(printed, keys):
    """-> dict(tier, tier_printed, tier_mixed, weak_source, weak_keys, tier_reason)"""
    prim = primary_tier(printed)
    weak = {k: weak_kind(k) for k in keys}
    nonweak = [k for k, v in weak.items() if v is None]
    all_weak = bool(keys) and not nonweak
    tier, reason = prim, 'printed tier kept'
    if prim == 'documented' and not nonweak:
        tier = 'inferred'
        reason = ('downgraded: PDF printed documented but every cited key is weak (%s) or none cited'
                  % ', '.join(sorted({v for v in weak.values() if v})) if keys else
                  'downgraded: PDF printed documented but no source key cited')
    mixed = bool(printed) and (';' in printed or ('inferred' in printed.lower() and 'documented' in printed.lower())
                               or ('I' in printed and 'D' in printed.split('(')[0] and ',' in printed))
    return {'tier': tier, 'tier_printed': printed, 'tier_mixed': mixed,
            'weak_source': all_weak, 'weak_keys': sorted(k for k, v in weak.items() if v),
            'tier_reason': reason, 'claim_support_verified': False}

def iso(md, hm=None):
    """md 'MM-DD' ; hm 'HH:MM' (24h; '24:00' -> next day 00:00). Returns naive local-mean-time ISO string."""
    import datetime
    m, d = map(int, md.split('-'))
    y = YEAR
    if len(md.split('-')) == 3:
        y, m, d = map(int, md.split('-'))
    dt = datetime.datetime(y, m, d)
    if hm:
        h, mi = map(int, hm.split(':'))
        dt += datetime.timedelta(hours=h, minutes=mi)
    return dt.strftime('%Y-%m-%dT%H:%M')

def T(spec):
    """'07-02 06:00' -> iso ; '07-02' -> day start ; '07-02/end' -> 23:59 of that day ; None -> None"""
    if spec is None:
        return None
    if spec.endswith('/end'):
        return iso(spec[:-4], '23:59')
    parts = spec.split(' ')
    return iso(parts[0], parts[1] if len(parts) > 1 else None)

def W(e=None, l=None, d=None):
    return [T(e), T(l), T(d)]

def DAY(md):
    return W(md, md + '/end')

def DAYS(a, b):
    return W(a, b + '/end')
