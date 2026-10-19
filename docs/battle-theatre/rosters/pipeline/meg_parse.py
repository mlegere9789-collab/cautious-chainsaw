"""Parse 'Twentieth Regiment Participants' (Maine at Gettysburg, 1898, pp. 263-270) from IA djvu.xml coordinates."""
import json, re, sys
from collections import Counter

P = json.load(open('../cache/meg_pages.json'))
PAGES = list(range(325, 333))   # printed pp. 263-270 (IA page index 325..332)


def lines_of(words):
    ws = sorted(words, key=lambda w: (w[1] + w[3]) / 2)
    out, cur, last = [], [], None
    for w in ws:
        yc = (w[1] + w[3]) / 2
        if cur and yc - last > 14:
            out.append(cur)
            cur = []
        cur.append(w)
        last = yc
    if cur:
        out.append(cur)
    for l in out:
        l.sort(key=lambda w: w[0])
    return out


def clean(s):
    s = re.sub(r'\s+', ' ', s).strip()
    return s


NAME = r"((?:[A-Z][a-z]+\.?|[A-Z]\.)(?:\s+(?:[A-Z][a-z'\-]+\.?|[A-Z]\.|2d|Jr\.))+)"
PARA = re.compile(NAME + r",\s+([A-Z][A-Za-z\.' ]*?(?:,\s+(?:R\.\s*\d+|N\.\s*B\.|Aroos\.?\s*Co\.))*)(?=\s*[,;\.]|\s*$)")


TITLE = re.compile(r"^(Acting\s+)?(First\s+Sergeant|1st\s*Sergt\.?|Sergeant|Corporal|Musician|Wagoner|Private)\s*[:,]\s*", re.I)


def parse_entry(s):
    s = TITLE.sub('', s)
    s = re.sub(r',\s*(Jr|Sr)\.?,', r' .,', s)
    s = s.rstrip(' ,.')
    if ',' not in s:
        return None
    first, rest = s.split(',', 1)
    first, rest = first.strip(), rest.strip()
    if ' ' not in first:       # Surname, Given M., Residence
        if ',' not in rest:
            return None
        giv, res = rest.split(',', 1)
        return clean(giv + ' ' + first), clean(res), 'sf'
    return first, clean(rest), 'gs'

people = []   # dict(co, rank, name, res, kind, page)
company = 'FS'
rank = 'field_staff'
para_mode = False
para_buf = []
para_page = None


def flush_para():
    global para_buf, para_mode
    if not para_buf:
        return
    txt = clean(' '.join(para_buf))
    txt = re.sub(r'(\w)- (\w)', r'\1\2', txt)
    txt = re.sub(r'^On Special Duty or Detached Service:?', '', txt).strip()
    # drop role fragments such as 'battery D, 5th U. S.' that follow a residence; keep names with residence
    for m in PARA.finditer(txt):
        nm, res = clean(m.group(1)), clean(m.group(2))
        if re.search(r'(battery|dept|Mass|U\. S|hosp|teamster|bugler|cook|guard|orderly|wagon|amb)', nm, re.I):
            continue
        people.append(dict(co=company, rank='special_duty', name=nm, res=res, kind='detached', page=para_page))
    para_buf = []
    para_mode = False


done = False
for pn in PAGES:
    if done:
        break
    words = P[str(pn)]
    lines = lines_of(words)
    L = min(l[0][0] for l in lines if l[0][4][:1].isalpha() and len(l) > 2)
    for l in lines:
        yc = (l[0][1] + l[0][3]) / 2
        txt = clean(' '.join(w[4] for w in l))
        if yc < 330:
            continue   # page head
        if re.search(r'REGIMENT\s+PARTICIPANTS|^PARTICIPANTS|MAINE\s+AT\s+GETTYSBURG|REVISED\s+REPORT', txt) or re.match(r'^\d{3}$', txt):
            if 'REVISED' in txt:
                flush_para()
                done = True
                break
            continue
        m = re.match(r'^Company\s+([A-K])\.?$', txt)
        if m:
            flush_para()
            company, rank = m.group(1), 'officers'
            continue
        if re.match(r'^(SERGEANTS|CORPORALS|PRIVATES|MUSICIANS|WAGONER)\.?$', txt, re.I):
            flush_para()
            rank = txt.strip('.').lower()
            continue
        if re.match(r'^FIELD,\s+STAFF', txt):
            company, rank = 'FS', 'field_staff'
            continue
        if txt.startswith('On Special Duty') or para_mode:
            if txt.startswith('On Special Duty'):
                flush_para()
                para_mode = True
                para_page = pn
            para_buf.append(txt)
            continue
        # entry lines: split into left / right entries
        left = [w for w in l if w[0] < L + 600]
        right = [w for w in l if w[0] >= L + 600]
        for part in (left, right):
            if not part:
                continue
            s = clean(' '.join(w[4] for w in part))
            if rank in ('field_staff', 'officers'):
                people.append(dict(co=company, rank=rank, raw=s, kind='officer_line', page=pn))
                continue
            ent = parse_entry(s)
            if ent:
                people.append(dict(co=company, rank=rank, name=ent[0], res=ent[1], kind='private' if ent[2] == 'sf' else 'nco', page=pn))
            else:
                people.append(dict(co=company, rank=rank, raw=s, kind='unparsed', page=pn))
flush_para()
json.dump(people, open('../cache/meg20_people.json', 'w'), indent=0)
print(len(people), Counter(p['kind'] for p in people))
print(Counter(p['co'] for p in people if p['kind'] in ('private', 'nco', 'detached')))
