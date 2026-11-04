"""Reads a PDF and prints one JSON document with everything verify.mjs checks: Info dictionary, XMP packet, page count and size,
text per page, outline (bookmarks) with page numbers, links (external URIs and internal destinations), fonts with their embedding
state, images, and the accessibility tags (MarkInfo, StructTreeRoot, element counts, document language).

    python pdfinfo.py FILE.pdf
"""
import json
import re
import sys
from collections import Counter

import pymupdf
from pypdf import PdfReader


def deref(o):
    return o.get_object() if hasattr(o, "get_object") else o


def walk_struct(node, counts, depth=0, seen=None):
    seen = seen if seen is not None else set()
    node = deref(node)
    if isinstance(node, list):
        for k in node:
            walk_struct(k, counts, depth, seen)
        return
    if not hasattr(node, "get"):
        return
    ident = id(node)
    if ident in seen:
        return
    seen.add(ident)
    s = node.get("/S")
    if s is not None:
        counts[str(s)] += 1
        if "/Alt" in node:
            counts["_alt"] += 1
    if "/K" in node:
        walk_struct(node["/K"], counts, depth + 1, seen)


def scan_objects(doc, patterns):
    """every object dictionary (not page content) and every XML/metadata stream, searched for the audit patterns"""
    hits = []
    rx = [re.compile(p, re.I) for p in patterns]
    for x in range(1, doc.xref_length()):
        try:
            obj = doc.xref_object(x, compressed=False)
        except Exception:
            continue
        texts = [obj]
        if 'Metadata' in obj or '/XML' in obj:
            try:
                texts.append(doc.xref_stream(x).decode('utf-8', 'replace'))
            except Exception:
                pass
        for t in texts:
            for r in rx:
                m = r.search(t)
                if m:
                    hits.append({'xref': x, 'pattern': r.pattern, 'match': m.group(0)[:60]})
    return hits


def main(path, patterns=None):
    r = PdfReader(path)
    root = r.trailer["/Root"]
    info = {k[1:]: str(v) for k, v in (r.metadata or {}).items()}
    xmp = None
    if "/Metadata" in root:
        xmp = deref(root["/Metadata"]).get_data().decode("utf-8", "replace")

    fonts = {}
    images = 0
    for page in r.pages:
        res = deref(page.get("/Resources", {})) or {}
        fd = deref(res.get("/Font", {})) or {}
        for name, ref in fd.items():
            f = deref(ref)
            base = str(f.get("/BaseFont", name))
            desc = None
            if f.get("/Subtype") == "/Type0":
                d0 = deref(deref(f["/DescendantFonts"])[0])
                desc = deref(d0.get("/FontDescriptor", {}))
            else:
                desc = deref(f.get("/FontDescriptor", {}))
            emb = bool(desc) and any(k in desc for k in ("/FontFile", "/FontFile2", "/FontFile3"))
            fonts[base] = {"embedded": emb, "subtype": str(f.get("/Subtype"))}
        xo = deref(res.get("/XObject", {})) or {}
        for ref in xo.values():
            if deref(ref).get("/Subtype") == "/Image":
                images += 1

    counts = Counter()
    tagged = {"MarkInfo": None, "StructTreeRoot": "/StructTreeRoot" in root, "Lang": str(root.get("/Lang")) if "/Lang" in root else None}
    if "/MarkInfo" in root:
        tagged["MarkInfo"] = {k: str(v) for k, v in deref(root["/MarkInfo"]).items()}
    if "/StructTreeRoot" in root:
        walk_struct(deref(root["/StructTreeRoot"]).get("/K", []), counts)
    tagged["elements"] = dict(counts)

    doc = pymupdf.open(path)
    pages = []
    links = []
    for i, p in enumerate(doc):
        pages.append(p.get_text("text"))
        for l in p.get_links():
            if l.get("kind") == pymupdf.LINK_URI:
                links.append({"page": i + 1, "kind": "uri", "uri": l.get("uri")})
            elif l.get("kind") == pymupdf.LINK_NAMED:
                links.append({"page": i + 1, "kind": "goto", "to": l.get("page", -1) + 1, "name": l.get("nameddest")})
            elif l.get("kind") == pymupdf.LINK_GOTO:
                links.append({"page": i + 1, "kind": "goto", "to": l.get("page", -1) + 1})
    outline = [{"level": l, "title": t, "page": pg} for l, t, pg in doc.get_toc()]
    box = doc[0].rect
    min_size = 99.0
    for p in doc:
        for b in p.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                for sp in l['spans']:
                    if sp['text'].strip():
                        min_size = min(min_size, sp['size'])
    object_hits = scan_objects(doc, patterns) if patterns else []
    print(json.dumps({
        "info": info, "xmp": xmp, "pageCount": len(r.pages), "pageSizePt": [round(box.width, 1), round(box.height, 1)],
        "pages": pages, "outline": outline, "links": links, "fonts": fonts, "images": images, "tagged": tagged,
        "minFontPt": round(min_size, 2), "objectHits": object_hits, "pdfVersion": r.pdf_header, "encrypted": r.is_encrypted,
        "pageMode": str(root.get("/PageMode")), "viewerPrefs": {k: str(v) for k, v in deref(root.get("/ViewerPreferences", {})).items()},
    }, ensure_ascii=False))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    pats = json.load(open(sys.argv[2], encoding='utf-8'))['patterns'] if len(sys.argv) > 2 else None
    main(sys.argv[1], pats)
