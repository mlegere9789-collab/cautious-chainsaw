"""Plain text of an HTML essay (tags removed with a regular expression, character entities unescaped, script and style blocks dropped, whitespace joined) for citation by build_corrections.py.
Usage: python3 -I html_to_text.py in.htm out.txt"""
import re, sys, html
t = open(sys.argv[1], encoding='utf-8', errors='replace').read()
t = re.sub(r'(?is)<(script|style)\b.*?</\1>', ' ', t)
t = re.sub(r'(?i)</?(p|br|div|tr|li|h\d|table|blockquote)\b[^>]*>', '\n', t)
t = re.sub(r'<[^>]+>', ' ', t)
t = html.unescape(t)
t = '\n'.join(' '.join(l.split()) for l in t.splitlines())
t = re.sub(r'\n{2,}', '\n\n', t).strip() + '\n'
open(sys.argv[2], 'w', encoding='utf-8').write(t)
