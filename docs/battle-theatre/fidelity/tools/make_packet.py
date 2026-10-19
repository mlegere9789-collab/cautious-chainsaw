"""Source packet for the blind second pass: for a unit, the sentences of its source texts that name the unit or its commander and carry a time cue or a
movement / fire verb, in source order, with the printed page. Nothing from Pass A is read. usage: python make_packet.py U-83PA"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..')); ROOT = os.path.abspath(os.path.join(BASE, '..', '..', '..'))
SRC = {s['id']: s for s in json.load(open(os.path.join(BASE, 'pilot', 'sources.json'), encoding='utf-8'))['sources']}
KEY = {  # unit -> (source ids, name regex)
 'U-20ME': (['S02', 'S01'], r'Twentieth Maine|Chamberlain|my regiment|my left|Morrill|Company B'),
 'U-20ME-B': (['S02'], r'Company B|Morrill|skirmish'),
 'U-83PA': (['S05', 'S01', 'S02'], r'Eighty-third|Woodward|my command|my regiment|my skirmishers|my men'),
 'U-44NY': (['S04', 'S01'], r'Forty-fourth|Conner|Larrabee|our regiment|Company B'),
 'U-16MI': (['S03', 'S01'], r'Sixteenth Michigan|Welch|my regiment|my largest|Brady'),
 'U-140NY': (['S06', 'S08', 'S01'], r'hundred and fortieth|O.Rorke|leading regiment|Warren'),
 'U-146NY': (['S06', 'S08'], r'hundred and forty-sixth|other regiments|Weed|brigade was'),
 'U-91PA': (['S06', 'S08'], r'Ninety-first|other regiments|Weed|brigade was'),
 'U-155PA': (['S06', 'S08'], r'fifty-fifth|other regiments|Weed|brigade was'),
 'U-ART-D5US': (['S07', 'S09', 'S06'], r'Hazlett|Battery D|Rittenhouse'),
 'C-15AL': (['S11', 'S20'], r'Fifteenth Alabama|my regiment|Oates|I |my men|my right|my left'),
 'C-47AL': (['S13', 'S20'], r'Forty-seventh|my regiment|colonel|lieutenant-colonel'),
 'C-48AL': (['S14', 'S16', 'S20'], r'Forty-eighth|my regiment|Sheffield'),
 'C-44AL': (['S12', 'S16', 'S20'], r'Forty-fourth|my regiment|Perry|General Law'),
 'C-4TX': (['S16', 'S15'], r'Fourth Texas|my regiment|Bane|Key|Carter'),
 'C-5TX': (['S17', 'S18', 'S16'], r'Fifth Texas|regiment|Bryan|Powell|Rogers'),
}
CUE = re.compile(r'\b\d{1,2}[\.:]?\d{0,2}\s*(?:p\.? ?m|a\.? ?m)|o.clock|about \d|minutes|half an hour|an hour|moved|advance|formed|ordered|double-quick|position|opened|fire|charge|wheel|flank|halt|climb|ascend|arriv|reach|posted|line of battle', re.I)
def packet(unit):
    sids, rx = KEY[unit]; rx = re.compile(rx, re.I); out = []
    for sid in sids:
        p = os.path.join(ROOT, SRC[sid]['text']); t = open(p, encoding='utf-8', errors='replace').read()
        page = None
        for para in re.split(r'\n\s*\n', t):
            m = re.findall(r'\[\[p\.(\d+)\]\]', para);
            if m: page = m[-1]
            para = re.sub(r'\[\[p\.\d+\]\]', '', para).replace('�', "'")
            for sent in re.split(r'(?<=[\.;])\s+(?=[A-Z])', para):
                if rx.search(sent) and CUE.search(sent) and len(sent) > 40:
                    out.append(f'[{sid} p.{page}] ' + ' '.join(sent.split()))
    return out
if __name__ == '__main__':
    for u in sys.argv[1:]:
        print('=== PACKET', u)
        for line in packet(u): print(line)
