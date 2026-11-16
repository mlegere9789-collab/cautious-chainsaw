Q=[]
def add(id, pat, key, lit=(), note='', **kw):
    d=dict(id=id,pat=pat,key=key,lit=list(lit),note=note); d.update(kw); Q.append(d)
add('x-cabell-house', r'Cabell[^.]{0,500}(Sherfy|Rose|Wentz|Staub|Codori|Rogers|Klingel|Trostle|Millerstown|brick|house)', ['cabell'], groups=('nps','ws9','extra'), note='Cabell 3 Jul position near a house', per_file=6, maxn=60)
add('x-sherfybrick', r'Sherfy[^.]{0,300}\bbrick\b|\bbrick\b[^.]{0,300}Sherfy', ['sherfy'], groups=('nps','ws9'), note='Sherfy house brick', per_file=4)
add('x-smallbrick', r'small\s+brick', ['small brick'], groups=('nps','ws9','extra','or27'), note='small brick (any)', per_file=8, maxn=60)
