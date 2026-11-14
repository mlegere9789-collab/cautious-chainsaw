#!/usr/bin/env python3
"""Merge entries into source_meta.json (what a document says about itself): meta_set.py file.json
file.json: {"SOURCE-ID": {"title":..., "author":..., "date":..., "from":..., ...}, ...}; keys given replace the stored ones.
Keeps the file's own formatting (json indent 1, ASCII escapes, no trailing newline). Run with python3 -I."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(os.path.dirname(HERE), 'source_meta.json')
m = json.load(open(p, encoding='utf-8'))
add = json.load(open(sys.argv[1], encoding='utf-8'))
for k, v in add.items():
    m['items'].setdefault(k, {}).update(v)
open(p, 'w', encoding='utf-8').write(json.dumps(m, indent=1))
print('source_meta.json: %d entries' % len(m['items']))
