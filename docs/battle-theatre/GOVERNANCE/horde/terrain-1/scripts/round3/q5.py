Q=[]
def add(id, pat, key, lit=(), note='', **kw):
    d=dict(id=id,pat=pat,key=key,lit=list(lit),note=note); d.update(kw); Q.append(d)
add('n-hazlett', r'Hazlett[^.]{0,400}(battery|guns|Round Top|summit|hill)|(battery|guns)[^.]{0,200}Hazlett', ['hazlett'], note='Hazlett in 1863 newspapers', per_file=3, maxn=30)
add('n-cushing', r'Cushing[^.]{0,400}(battery|guns|canister|fence|wall)', ['cushing'], note='Cushing in 1863 newspapers', per_file=3, maxn=30)
add('n-bigelow', r'Bigelow[^.]{0,400}(battery|guns|prolonge|retired|Mississippi)', ['bigelow'], note='Bigelow in 1863 newspapers', per_file=3, maxn=30)
add('n-calef', r'Calef[^.]{0,300}(battery|guns|first)', ['calef'], note='Calef in 1863 newspapers', per_file=3, maxn=30)
add('n-wiedrich', r'(Wiedrich|Weidrich|Widrich)[^.]{0,300}(battery|guns|canister)', ['wiedrich','weidrich','widrich'], note='Wiedrich in 1863 newspapers', per_file=3, maxn=30)
add('n-lunette', r'(lunette|redan|earthwork|breastwork)s?[^.]{0,200}(guns|batter(y|ies)|artillery|Cemetery Hill)', ['lunette','redan','earthwork','breastwork'], note='works at guns in 1863 newspapers', per_file=3, maxn=40)
add('n-peach', r'Peach\s+Orchard[^.]{0,300}(batter(y|ies)|guns|artillery)|(batter(y|ies)|guns|artillery)[^.]{0,300}Peach\s+Orchard', ['peach orchard'], note='Peach Orchard guns in 1863 newspapers', per_file=3, maxn=40)
add('n-count', r'(one hundred and (fifty|forty|thirty|fifteen|twenty)|nearly (one hundred|150)|\b1[1-7]\d)\s+(guns|pieces of artillery|cannon|pieces)', ['guns','pieces of artillery','cannon'], note='gun counts in 1863 newspapers', per_file=3, maxn=40)
