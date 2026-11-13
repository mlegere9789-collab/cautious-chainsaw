"""Check quotes.  python3 -I chk.py SRC REF "quote" ["quote" ...]   (SRC: OR1|OR2|LIB|NPS)  prints offsets/page or NOT FOUND"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, spec_lib
src, ref = sys.argv[1:3]
for q in sys.argv[3:]:
    try:
        r = build.resolve(spec_lib.C(src, ref, q))
        print('OK  ', r.get('report_id') or r['source_id'], r.get('printed_page') or r.get('page_hint') or r.get('pdf_page'), r['offset'], '|', q[:90])
    except SystemExit as e:
        print('FAIL', str(e)[:200])
