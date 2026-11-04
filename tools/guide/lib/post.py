"""Post-processes the printed guide: replaces the Info dictionary written by the browser's PDF engine with the site's own
metadata, adds an XMP packet, makes the viewer show the document title and open the bookmarks, and writes the final file.

    python post.py SRC.pdf DEST.pdf META.json

META.json: title, author, subject, keywords, language, creator (also used as producer), date (YYYY-MM-DD)
Everything else in the file (page content, fonts, the structure tree, the outline, links) is kept as printed.
"""
import json
import sys
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (BooleanObject, DictionaryObject, NameObject, DecodedStreamObject, TextStringObject)


def main(src, dest, meta_path):
    meta = json.load(open(meta_path, encoding="utf-8"))
    date = datetime.strptime(meta["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    pdf_date = date.strftime("D:%Y%m%d%H%M%S+00'00'")
    iso = date.strftime("%Y-%m-%dT%H:%M:%SZ")

    reader = PdfReader(src)
    writer = PdfWriter(clone_from=reader)

    # a clean Info dictionary: no producer or creator string of any tool
    writer.add_metadata({})
    info = writer._info
    for k in list(info.keys()):
        del info[k]
    for k, v in (("/Title", meta["title"]), ("/Author", meta["author"]), ("/Subject", meta["subject"]),
                 ("/Keywords", meta["keywords"]), ("/Creator", meta["creator"]), ("/Producer", meta["creator"]),
                 ("/CreationDate", pdf_date), ("/ModDate", pdf_date)):
        info[NameObject(k)] = TextStringObject(v)

    xmp = f"""<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/">
   <dc:format>application/pdf</dc:format>
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">{escape(meta["title"])}</rdf:li></rdf:Alt></dc:title>
   <dc:creator><rdf:Seq><rdf:li>{escape(meta["author"])}</rdf:li></rdf:Seq></dc:creator>
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">{escape(meta["subject"])}</rdf:li></rdf:Alt></dc:description>
   <dc:language><rdf:Bag><rdf:li>{escape(meta["language"])}</rdf:li></rdf:Bag></dc:language>
   <pdf:Keywords>{escape(meta["keywords"])}</pdf:Keywords>
   <pdf:Producer>{escape(meta["creator"])}</pdf:Producer>
   <xmp:CreatorTool>{escape(meta["creator"])}</xmp:CreatorTool>
   <xmp:CreateDate>{iso}</xmp:CreateDate>
   <xmp:ModifyDate>{iso}</xmp:ModifyDate>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>"""
    stream = DecodedStreamObject()
    stream.set_data(xmp.encode("utf-8"))
    stream[NameObject("/Type")] = NameObject("/Metadata")
    stream[NameObject("/Subtype")] = NameObject("/XML")
    root = writer._root_object
    root[NameObject("/Metadata")] = writer._add_object(stream)

    # viewer: show the title (not the file name) and open with the bookmarks panel
    vp = DictionaryObject()
    vp[NameObject("/DisplayDocTitle")] = BooleanObject(True)
    root[NameObject("/ViewerPreferences")] = vp
    root[NameObject("/PageMode")] = NameObject("/UseOutlines")
    root[NameObject("/Lang")] = TextStringObject(meta["language"])

    with open(dest, "wb") as f:
        writer.write(f)


if __name__ == "__main__":
    main(*sys.argv[1:4])
