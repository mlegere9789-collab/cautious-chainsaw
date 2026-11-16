Q=[]
def add(id, pat, key, lit=(), note='', **kw):
    d=dict(id=id,pat=pat,key=key,lit=list(lit),note=note); d.update(kw); Q.append(d)
add('x-codoribrick', r'(Codori|Cordori|Cordora)[^.]{0,250}\bbrick\b|\bbrick\b[^.]{0,250}(Codori|Cordori|Cordora)', ['codori','cordori','cordora'], groups=('nps','ws9'), note='Codori house brick', per_file=3, maxn=30)
add('x-rogersbrick', r'Rogers[^.]{0,250}\bbrick\b|\bbrick\b[^.]{0,250}Rogers', ['rogers'], groups=('nps',), note='Rogers house brick', per_file=3, maxn=30)
add('x-sherfy2', r'Sherfy[^.]{0,200}(house|farmhouse)[^.]{0,200}\b(brick|frame|log|stone|stucco)\b', ['sherfy'], groups=('nps',), note='Sherfy house material', per_file=3, maxn=30)
