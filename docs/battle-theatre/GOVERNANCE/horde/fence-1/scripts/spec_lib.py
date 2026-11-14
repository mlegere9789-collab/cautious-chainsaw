"""Spec helpers for the fence-1 close-out. A row spec is plain data; build_corrections.py resolves every citation
against the local source texts (the quote must be found verbatim in the whitespace-normalised text, exactly once in
the named report/source, or the build fails)."""

def C(src, ref, quote, occ=None, role='supports', note=None, **kw):
    """citation. src: 'OR1' | 'OR2' | 'OR3' (Cornell scan, via or27_find) | 'OR1W' (second-witness scan of OR part 1; give report ref,
    witness='<archive id>' and page='<printed page>') | 'LIB' (ws9 library and the three books of the first pass) | 'ACQ' (book acquired by
    the tl-02 close-out, ref = its ledger id) | 'KIT' (book acquired by the oob-kit workstream, ref = archive.org identifier) | 'NPS' (73 NPS
    documents) | 'NPSW' (NPS web page saved by the photo-match workstream, ref = file stem) | 'CA' (Chronicling America page OCR, ref =
    'lccn/date/ed-N/seq-N'). ref: report id like 'R029' (OR) or the source id.
    kw: pp (printed page of the source, where known), reading (cleaned reading of an OCR-garbled quote), image (id in image_checks.json)."""
    d = dict(src=src, ref=ref, quote=quote, occ=occ, role=role, note=note)
    d.update(kw)
    return d

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
