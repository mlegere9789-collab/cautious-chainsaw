"""tools/accept/pdf_probe.py - dump everything a PDF carries that a reader (or a metadata viewer) can see, as JSON on stdout.

    python -I tools/accept/pdf_probe.py <file.pdf>

Used by copy_audit.mjs (Info dictionary, XMP packet, extracted text of every page, outline titles, link URIs, form fields,
embedded files, font names, page count, encryption flag).  Read-only; never writes the PDF.
"""
import json
import re
import sys


def main(path):
    out = {'file': path, 'ok': False, 'errors': []}
    try:
        from pypdf import PdfReader
    except Exception as e:  # pragma: no cover
        out['errors'].append('pypdf not importable: %s' % e)
        print(json.dumps(out))
        return 0
    try:
        r = PdfReader(path)
    except Exception as e:
        out['errors'].append('cannot open: %s' % e)
        print(json.dumps(out))
        return 0
    out['ok'] = True
    out['encrypted'] = bool(r.is_encrypted)
    out['pages'] = len(r.pages)
    info = {}
    try:
        for k, v in (r.metadata or {}).items():
            info[str(k)] = str(v)
    except Exception as e:
        out['errors'].append('info: %s' % e)
    out['info'] = info
    # raw trailer Info (in case pypdf normalised something)
    try:
        trailer = r.trailer.get('/Info')
        if trailer is not None:
            obj = trailer.get_object()
            out['info_raw'] = {str(k): str(v) for k, v in obj.items()}
    except Exception as e:
        out['errors'].append('info_raw: %s' % e)
    # XMP: the /Metadata stream of the catalog, decoded
    try:
        meta = r.trailer['/Root'].get('/Metadata')
        out['xmp'] = meta.get_object().get_data().decode('utf-8', 'replace') if meta is not None else None
    except Exception as e:
        out['xmp'] = None
        out['errors'].append('xmp: %s' % e)
    texts = []
    fonts = set()
    links = []
    for i, p in enumerate(r.pages):
        try:
            texts.append(p.extract_text() or '')
        except Exception as e:
            texts.append('')
            out['errors'].append('text p%d: %s' % (i + 1, e))
        try:
            res = p.get('/Resources')
            f = res.get_object().get('/Font') if res is not None else None
            if f is not None:
                for k, v in f.get_object().items():
                    try:
                        fonts.add(str(v.get_object().get('/BaseFont')))
                    except Exception:
                        pass
        except Exception:
            pass
        try:
            for a in (p.get('/Annots') or []):
                o = a.get_object()
                act = o.get('/A')
                if act is not None:
                    uri = act.get_object().get('/URI')
                    if uri is not None:
                        links.append({'page': i + 1, 'uri': str(uri)})
                if o.get('/Contents'):
                    links.append({'page': i + 1, 'annotation_contents': str(o.get('/Contents'))})
        except Exception:
            pass
    out['text'] = texts
    out['fonts'] = sorted(fonts)
    out['links'] = links

    def walk_outline(items, acc):
        for it in items:
            if isinstance(it, list):
                walk_outline(it, acc)
            else:
                try:
                    acc.append(str(it.title))
                except Exception:
                    pass
    try:
        ol = []
        walk_outline(r.outline, ol)
        out['outline'] = ol
    except Exception:
        out['outline'] = []
    try:
        out['attachments'] = {k: len(v[0]) if v else 0 for k, v in (r.attachments or {}).items()}
    except Exception:
        out['attachments'] = {}
    try:
        fields = r.get_fields() or {}
        out['form_fields'] = [str(k) for k in fields.keys()]
    except Exception:
        out['form_fields'] = []
    try:
        lay = r.trailer['/Root'].get('/PageLabels')
        out['page_labels'] = bool(lay)
        out['lang'] = str(r.trailer['/Root'].get('/Lang')) if r.trailer['/Root'].get('/Lang') else None
        out['tagged'] = bool(r.trailer['/Root'].get('/MarkInfo'))
        out['title_displayed'] = None
        vp = r.trailer['/Root'].get('/ViewerPreferences')
        if vp is not None:
            out['title_displayed'] = bool(vp.get_object().get('/DisplayDocTitle'))
    except Exception:
        pass
    print(json.dumps(out))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
