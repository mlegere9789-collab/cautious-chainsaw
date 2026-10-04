#!/usr/bin/env python3
"""PDF tools for the user guide (PyMuPDF; read-only except `post`).

  python tools/guide/pdf_tools.py post FILE.pdf --title T --author A --subject S --keywords K --date YYYY-MM-DD
        adds document properties to a Chrome-printed tagged PDF with an INCREMENTAL save, so the structure tree, the outline,
        the language and the viewer preferences stay exactly as Chrome wrote them
  python tools/guide/pdf_tools.py lint FILE.pdf [--json OUT.json] [--text OUT.txt] [--margin-top-mm 20] [--margin-bottom-mm 22]
        [--expect-bookmarks N] [--expect-internal-links N] [--expect-external-links N] [--max-kb 500] [--min-fill 55] [--min-last-fill 15]
        measures the PDF and checks the gates; exit 0 when every gate passes, 1 otherwise

Metrics (all measured from the file, none assumed): pages and size; tagged (MarkInfo/Marked and a structure tree, with a count of
structure elements by type); language; title / author / subject / keywords; DisplayDocTitle; bookmarks (count, depth, pages valid);
fonts (each one embedded or not); text size (share of characters at or above 10 pt, smallest size); text contrast against the page
or the filled box behind it (WCAG ratio, flagged below 4.5); page fill (how far down the body area the text reaches, per page);
orphan headings (a heading-size line that is the last text of a page); near-empty pages; links (external with address, internal
with a valid target page).
"""
import argparse
import json
import re
import statistics
import sys

try:
    import pymupdf as fitz
except ImportError:  # older PyMuPDF
    import fitz  # type: ignore

MM = 72.0 / 25.4


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = rgb
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def rgb_of(color_int):
    return ((color_int >> 16) & 255, (color_int >> 8) & 255, color_int & 255)


def struct_counts(doc):
    cat = doc.pdf_catalog()
    kind, val = doc.xref_get_key(cat, "StructTreeRoot")
    if kind != "xref":
        return None
    root = int(val.split()[0])
    counts = {}
    seen = set()

    def walk(xref, depth=0):
        if xref in seen or depth > 60:
            return
        seen.add(xref)
        k, v = doc.xref_get_key(xref, "S")
        if k == "name":
            counts[v.lstrip("/")] = counts.get(v.lstrip("/"), 0) + 1
        k, v = doc.xref_get_key(xref, "K")
        if k == "xref":
            walk(int(v.split()[0]), depth + 1)
        elif k == "array":
            for m in re.finditer(r"(\d+) 0 R", v):
                walk(int(m.group(1)), depth + 1)
        elif k == "dict":
            pass

    walk(root)
    return counts


def lint(path, args):
    doc = fitz.open(path)
    out = {"file": path, "pages": doc.page_count, "bytes": __import__("os").path.getsize(path)}
    cat = doc.pdf_catalog()
    kind, mi = doc.xref_get_key(cat, "MarkInfo")
    marked = kind != "null" and "true" in mi.replace(" ", "").lower()
    sc = struct_counts(doc)
    out["tagged"] = bool(marked and sc)
    out["structure_elements"] = sc or {}
    out["structure_total"] = sum((sc or {}).values())
    out["lang"] = doc.xref_get_key(cat, "Lang")[1].strip("()") if doc.xref_get_key(cat, "Lang")[0] != "null" else None
    vp = doc.xref_get_key(cat, "ViewerPreferences")
    out["display_doc_title"] = "DisplayDocTitle true" in (vp[1] if vp[0] != "null" else "").replace("\n", " ").replace("  ", " ") or "/DisplayDocTitle true" in str(doc.xref_object(cat))
    md = doc.metadata or {}
    out["metadata"] = {k: md.get(k) for k in ("title", "author", "subject", "keywords", "creator", "producer")}
    toc = doc.get_toc()
    out["bookmarks"] = {"count": len(toc), "max_depth": max([t[0] for t in toc], default=0), "pages_valid": all(1 <= t[2] <= doc.page_count for t in toc)}

    # fonts
    fonts = {}
    for pno in range(doc.page_count):
        for f in doc[pno].get_fonts(full=True):
            xref, ext, typ, base, name = f[0], f[1], f[2], f[3], f[4]
            if xref in fonts:
                continue
            try:
                emb = bool(doc.extract_font(xref)[3])
            except Exception:
                emb = False
            fonts[xref] = {"name": base, "type": typ, "embedded": emb}
    out["fonts"] = list(fonts.values())

    mt, mb = args.margin_top_mm * MM, args.margin_bottom_mm * MM
    size_chars = {}
    small = 0
    total_chars = 0
    min_size = 1e9
    low_contrast = []
    fills, orphan, near_empty, page_info = [], [], [], []
    heading_size = args.heading_pt
    text_all = []
    for pno in range(doc.page_count):
        page = doc[pno]
        h = page.rect.height
        body_top, body_bottom = mt, h - mb
        fills_rects = []
        for d in page.get_drawings():
            if d.get("fill") and d.get("rect") is not None and d["rect"].width > 4 and d["rect"].height > 4:
                fills_rects.append((d["rect"], tuple(int(round(c * 255)) for c in d["fill"][:3])))
        blocks = page.get_text("dict")["blocks"]
        lines = []
        for b in blocks:
            if b.get("type") != 0:
                continue
            for ln in b["lines"]:
                spans = [s for s in ln["spans"] if s["text"].strip()]
                if not spans:
                    continue
                lines.append((ln["bbox"][1], ln["bbox"][3], spans))
                for s in spans:
                    n = len(s["text"].replace(" ", ""))
                    total_chars += n
                    sz = round(s["size"], 1)
                    size_chars[sz] = size_chars.get(sz, 0) + n
                    min_size = min(min_size, s["size"])
                    if round(s["size"], 1) < 10.0:  # 10 pt text measures 9.99.. in the file
                        small += n
                    # contrast against the filled box behind the span (innermost), else white
                    bg = (255, 255, 255)
                    area = None
                    cx, cy = (s["bbox"][0] + s["bbox"][2]) / 2, (s["bbox"][1] + s["bbox"][3]) / 2
                    for rect, col in fills_rects:
                        if rect.x0 <= cx <= rect.x1 and rect.y0 <= cy <= rect.y1:
                            a = rect.width * rect.height
                            if area is None or a < area:
                                area, bg = a, col
                    c = contrast(rgb_of(s["color"]), bg)
                    if c < 4.5:
                        low_contrast.append({"page": pno + 1, "text": s["text"][:40], "ratio": round(c, 2), "size": round(s["size"], 1)})
                text_all.append(" ".join(s["text"] for s in spans))
        body = [(y0, y1, sp) for (y0, y1, sp) in lines if y0 >= body_top - 2 and y1 <= body_bottom + 2]
        if body:
            last_y = max(y1 for (_, y1, _) in body)
            first_y = min(y0 for (y0, _, _) in body)
            fill = max(0.0, (last_y - body_top) / (body_bottom - body_top) * 100.0)
            last_lines = [sp for (y0, y1, sp) in body if y1 >= last_y - 1.0]
            if pno < doc.page_count - 1 and last_lines and all(max(s["size"] for s in sp) >= heading_size for sp in last_lines):
                orphan.append({"page": pno + 1, "text": " ".join(s["text"] for s in last_lines[-1])[:60], "kind": "heading"})
            elif pno < doc.page_count - 1 and last_lines:
                # a line made only of bold text at the foot of a page is a table header row or a lead-in left behind its content
                spans = [s for sp in last_lines for s in sp]
                isbold = lambda s: bool(s["flags"] & 16) or "bold" in s["font"].lower()
                # (bold in an accent colour: the colour of table header cells and headings, not of body text)
                if spans and all(isbold(s) and s["color"] not in (0, 1118481) for s in spans) and sum(len(s["text"]) for s in spans) < 120:
                    orphan.append({"page": pno + 1, "text": " ".join(s["text"] for s in spans)[:60], "kind": "bold line"})
        else:
            fill = 0.0
        fills.append(fill)
        page_info.append({"page": pno + 1, "fill_pct": round(fill, 1), "characters": sum(len(s["text"]) for (_, _, sp) in lines for s in sp)})
        min_fill = args.min_last_fill if pno == doc.page_count - 1 else args.min_fill
        if fill < min_fill:
            near_empty.append({"page": pno + 1, "fill_pct": round(fill, 1), "needs": min_fill})
    out["page_fill"] = page_info
    out["fill_min_pct"] = round(min(fills[:-1]) if len(fills) > 1 else fills[0], 1)
    out["fill_median_pct"] = round(statistics.median(fills), 1)
    out["fill_last_pct"] = round(fills[-1], 1)
    out["chars"] = total_chars
    out["chars_ge_10pt_pct"] = round(100.0 * (total_chars - small) / total_chars, 1) if total_chars else 0
    out["min_font_pt"] = round(min_size, 1) if total_chars else None
    out["size_histogram"] = {str(k): v for k, v in sorted(size_chars.items())}
    out["low_contrast_spans"] = low_contrast
    out["orphan_headings"] = orphan
    out["page_fill_failures"] = near_empty

    # links
    ext, internal, bad_internal = [], 0, 0
    for pno in range(doc.page_count):
        for lk in doc[pno].get_links():
            if lk.get("kind") == fitz.LINK_URI:
                ext.append(lk.get("uri"))
            elif lk.get("kind") in (fitz.LINK_GOTO, fitz.LINK_NAMED):
                internal += 1
                if lk.get("page") is None or not (0 <= lk["page"] < doc.page_count):
                    bad_internal += 1
    out["links"] = {"external": len(ext), "external_uris": sorted(set(ext)), "internal": internal, "internal_unresolved": bad_internal}
    out["javascript"] = any("/JavaScript" in doc.xref_object(x) for x in range(1, min(doc.xref_length(), 400)) if doc.xref_get_key(x, "S")[1] == "/JavaScript")
    text = "\n\n".join(text_all)
    out["text_chars"] = len(text)
    if args.text:
        with open(args.text, "w", encoding="utf-8") as fh:
            fh.write(text + "\n")

    gates = []

    def gate(gid, ok, value, need):
        gates.append({"id": gid, "ok": bool(ok), "value": value, "need": need})

    gate("tagged", out["tagged"], "yes" if out["tagged"] else "no", "yes: MarkInfo Marked and a structure tree")
    gate("language", out["lang"] == "en-US", out["lang"], "en-US")
    def real(v):
        # ReportLab writes "(anonymous)" and "(unspecified)" when nothing was set: that is no value
        return bool(v) and not re.match(r"^\(.*\)$", v.strip()) and not v.lower().endswith((".html", ".pdf"))

    gate("title", real(out["metadata"]["title"]), out["metadata"]["title"], "a real title")
    gate("display_doc_title", out["display_doc_title"], out["display_doc_title"], "true")
    gate("author_subject", real(out["metadata"]["author"]) and real(out["metadata"]["subject"]), [out["metadata"]["author"], out["metadata"]["subject"]], "author and subject set")
    gate("bookmarks", out["bookmarks"]["count"] >= (args.expect_bookmarks or 1) and out["bookmarks"]["pages_valid"], out["bookmarks"]["count"], f">= {args.expect_bookmarks or 1} with valid pages")
    gate("fonts_embedded", all(f["embedded"] for f in out["fonts"]) and out["fonts"], f"{sum(f['embedded'] for f in out['fonts'])}/{len(out['fonts'])}", "all embedded")
    gate("page_fill", not near_empty, f"min {out['fill_min_pct']}% (last {out['fill_last_pct']}%)", f">= {args.min_fill}% except the last page (>= {args.min_last_fill}%)")
    gate("orphan_headings", not orphan, len(orphan), "0")
    gate("contrast", not low_contrast, len(low_contrast), "0 spans below 4.5:1")
    gate("font_size", out["chars_ge_10pt_pct"] >= 90.0, f"{out['chars_ge_10pt_pct']}% at 10 pt or more (smallest {out['min_font_pt']} pt)", ">= 90% of characters at 10 pt or more")
    gate("links_resolve", bad_internal == 0, f"{internal} internal, {len(ext)} external", "every internal link has a target page")
    if args.expect_internal_links is not None:
        gate("internal_links", internal >= args.expect_internal_links, internal, f">= {args.expect_internal_links}")
    if args.expect_external_links is not None:
        gate("external_links", len(ext) >= args.expect_external_links, len(ext), f">= {args.expect_external_links}")
    gate("size", out["bytes"] <= args.max_kb * 1000, f"{out['bytes'] / 1000:.0f} KB", f"<= {args.max_kb} KB")
    gate("no_javascript", not out["javascript"], out["javascript"], "none")
    out["gates"] = gates
    out["pass"] = all(g["ok"] for g in gates)
    return out


def post(path, args):
    doc = fitz.open(path)
    d = (args.date or "2026-10-04").replace("-", "")
    stamp = f"D:{d}000000+00'00'"
    md = dict(doc.metadata or {})
    md.update({"title": args.title or md.get("title", ""), "author": args.author or "", "subject": args.subject or "", "keywords": args.keywords or "", "creationDate": stamp, "modDate": stamp})
    doc.set_metadata(md)
    doc.saveIncr()
    doc.close()


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("post")
    p.add_argument("file"); p.add_argument("--title"); p.add_argument("--author"); p.add_argument("--subject"); p.add_argument("--keywords"); p.add_argument("--date")
    q = sub.add_parser("lint")
    q.add_argument("file"); q.add_argument("--json"); q.add_argument("--text")
    q.add_argument("--margin-top-mm", type=float, default=20); q.add_argument("--margin-bottom-mm", type=float, default=22)
    q.add_argument("--heading-pt", type=float, default=12.5)
    q.add_argument("--expect-bookmarks", type=int); q.add_argument("--expect-internal-links", type=int); q.add_argument("--expect-external-links", type=int)
    q.add_argument("--max-kb", type=float, default=500); q.add_argument("--min-fill", type=float, default=55); q.add_argument("--min-last-fill", type=float, default=15)
    args = ap.parse_args()
    if args.cmd == "post":
        post(args.file, args)
        return 0
    res = lint(args.file, args)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(res, fh, indent=1, ensure_ascii=False)
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps({k: res[k] for k in ("pages", "bytes", "tagged", "structure_total", "lang", "metadata", "bookmarks", "fill_min_pct", "fill_median_pct", "fill_last_pct", "chars_ge_10pt_pct", "min_font_pt", "links", "pass")}, ensure_ascii=False))
    for g in res["gates"]:
        print(("PASS " if g["ok"] else "FAIL ") + f"{g['id']}: {g['value']} (needs {g['need']})")
    return 0 if res["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
