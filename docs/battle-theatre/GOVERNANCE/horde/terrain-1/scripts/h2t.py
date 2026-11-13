"""html -> text for saved nps.gov pages.  python3 -I h2t.py in.htm out.txt"""
import sys, re, html
t = open(sys.argv[1], encoding='utf-8', errors='replace').read()
m = re.search(r'<main[^>]*>(.*?)</main>', t, re.S | re.I) or re.search(r'<div[^>]+id="cs_Content"[^>]*>(.*)', t, re.S | re.I)
body = m.group(1) if m else t
body = re.sub(r'<(script|style|nav|header|footer)[^>]*>.*?</\1>', ' ', body, flags=re.S | re.I)
body = re.sub(r'</(p|div|li|h[1-6]|tr|br|section)>', '\n', body, flags=re.I)
body = re.sub(r'<br\s*/?>', '\n', body, flags=re.I)
body = re.sub(r'<[^>]+>', ' ', body)
body = html.unescape(body)
body = re.sub(r'[ \t\r\f\v\xa0]+', ' ', body)
body = re.sub(r'\n\s*\n+', '\n', body).strip()
open(sys.argv[2], 'w', encoding='utf-8').write(body + '\n')
print(len(body))
