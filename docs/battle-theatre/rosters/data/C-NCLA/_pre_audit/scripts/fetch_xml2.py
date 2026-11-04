import sys; sys.path.insert(0, 'scripts')
from ncla_common import *
for ident, base, tag in [('05913252.3309.emory.edu', '05913252_3309', 'emory_v1'), ('05913252.3310.emory.edu', '05913252_3310', 'emory_v2')]:
    p = get(f'https://archive.org/download/{ident}/{base}_djvu.xml', f'{tag}.{base}_djvu.xml', timeout=600)
    print(tag, p, flush=True)
