"""Quote selection for documented claims whose anchor is a longer snippet than one 15-word quote allows.

choose(snip, claim_text, need_digits) -> the best contiguous window of at most 14 words of the (normalized, verbatim) anchor, scored by overlap
with the words of the claim (activity, printed when/place descriptions). The window is a substring of the anchor, so it is verbatim OCR text;
the builder verifies it with F.verify again."""
import re

STOP = set('the and was were that with from for his its had has have this which are not but they them their then there when into upon over after before about out all one two our who been would could also very more than only other those these such'.split())


def toks(s):
    return {w for w in re.findall(r"[a-z0-9']+", (s or '').lower()) if (len(w) >= 3 and w not in STOP) or w.isdigit()}


def choose(snip, claim_text, need_digit=False, maxw=14, when_text=''):
    words = snip.split(' ')
    if len(words) <= maxw:
        return snip, len(words), True
    want = toks(claim_text)
    wt = toks(when_text)
    lead = toks(claim_text[:140])
    best = None
    for i in range(0, len(words) - maxw + 1):
        win = words[i:i + maxw]
        got = toks(' '.join(win))
        sc = len(got & want) + 2 * len(got & wt) + len(got & lead)
        if need_digit and not any(re.search(r'\d|noon|midnight|daybreak|sunrise|sunset|dawn|dark', w, re.I) for w in win):
            sc -= 5
        if best is None or sc > best[0]:
            best = (sc, i)
    sc, i = best
    return ' '.join(words[i:i + maxw]), maxw, False


def need_digits(when_text):
    """clock-hour digit groups (N p. m., N a. m., N o'clock, N.MM, 12 m.) in the described time that a supporting quote should contain."""
    t = re.sub(r"\(OCR[^)]*\)", ' ', when_text or '')
    t = re.sub(r'"[^"]*"', ' ', t)
    return re.findall(r"(\d{1,2}(?:[.:]\d{2})?)\s*(?:p\.? ?m|a\.? ?m|o.clock|m\b)", t) + re.findall(r"\b(\d{1,2}[.:]\d{2})\b", t)


def has_digits(q, digs):
    """a clock-hour digit group from the description occurs in q followed by a clock marker (p. m., a. m., o'clock, m.); OCR-tolerant."""
    for d in digs:
        pat = re.escape(d).replace(r'\.', '[.,:]').replace(r'\:', '[.,:]')
        if re.search(r"(?<![\d.])%s\s*(?:[apAP]\.?\s?[mM]|o.{1,3}cl|m\b|[ap]\.)" % pat, q):
            return True
        if re.search(r"(?:at|about|until|till|before|after|by)\s+%s(?![\d])" % pat, q):
            return True
    return False


def choose_wide(region, claim_text, when_text, digs, maxw=14):
    """best window of at most maxw words of `region` that contains one of the time digit groups (None if none)."""
    words = region.split(' ')
    want = toks(claim_text)
    wt = toks(when_text)
    lead = toks(claim_text[:140])
    best = None
    for i in range(0, max(1, len(words) - maxw + 1)):
        win = ' '.join(words[i:i + maxw])
        if not has_digits(win, digs):
            continue
        got = toks(win)
        sc = len(got & want) + 2 * len(got & wt) + len(got & lead)
        if best is None or sc > best[0]:
            best = (sc, win)
    return best
