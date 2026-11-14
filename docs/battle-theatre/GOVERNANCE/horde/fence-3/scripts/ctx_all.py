import sys, json
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
import lib
res = json.load(open('/home/user/cautious-chainsaw/tmp/fence-3/data/verify_all.json'))
want = sys.argv[1:]
seen = set()
for rec in res:
    if want and rec['row'] not in want:
        continue
    k = (rec['key'], rec['quote'])
    if k in seen:
        continue
    seen.add(k)
    print('=====', rec['row'], rec['key'], '| claimed', rec.get('claimed_report'), rec['claimed_page'])
    for h in rec['hits']:
        if rec['kind'] == 'OR':
            r = lib.or_record(h['part'], h['start'])
            print('  record', h['record'], '|', h['who'], '| page', h['page'], '| off', h['start'], h['end'])
            print('  ', lib.or_context(h['part'], h['start'], h['end'], 700, 700))
        else:
            print('  ', h['vol'], h['section'], h['section_title'], 'page', h['page'], 'interp', h['interpolated'], 'off', h['offset'])
            print('  ', lib.sv_context(h['vol'], h['offset'], len(rec['quote']) + 5, 700, 700))
