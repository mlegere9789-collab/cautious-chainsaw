"""Spec helpers for the fence-1 close-out. A row spec is plain data; build_corrections.py resolves every citation
against the local source texts (the quote must be found verbatim in the whitespace-normalised text, exactly once in
the named report/source, or the build fails)."""

def C(src, ref, quote, occ=None, role='supports', note=None):
    """citation. src: 'OR1' | 'OR2' | 'OR3' | 'LIB' | 'NPS'. ref: report id like 'R029' (OR) or library/NPS source id."""
    return dict(src=src, ref=ref, quote=quote, occ=occ, role=role, note=note)

def S(sc, claim, tier, support, cits=(), note=None):
    """sub-claim. tier: documented | inferred | plausible-procedural | open_gap.
    support: supported | partial | unsupported | contradicted | conflict | blocked_host."""
    return dict(sc=sc, claim=claim, tier=tier, support=support, citations=list(cits), note=note)

def R(id, verdict, row_status, pdf_claim, corrected, sub, stays_unsupported=(), conflicts=(), register=(), blocked=(),
      consequence=(), lookups=(), structures=(), notes=None, changes=()):
    return dict(id=id, verdict=verdict, row_status=row_status, pdf_claim=pdf_claim, corrected_claim=corrected,
                sub_claims=list(sub), stays_unsupported=list(stays_unsupported), conflicts_carried=list(conflicts),
                register_refs=list(register), blocked_host=list(blocked), product_consequence=list(consequence),
                lookups=list(lookups), structures_refs=list(structures), notes=notes, changes_vs_previous=list(changes))

def B(source_key, url, what, status='blocked_host'):
    return dict(source_key=source_key, url=url, status=status, what_to_read=what)

def L(corpus, pattern, hits, result):
    return dict(corpus=corpus, pattern=pattern, hits=hits, result=result)
