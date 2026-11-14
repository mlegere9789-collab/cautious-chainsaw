import sys, json
sys.argv = [sys.argv[0]] + sys.argv[1:]
exec(open('/home/user/cautious-chainsaw/tmp/tl-01/audit/extend.py').read().split("if __name__ == '__main__':")[0])
pairs = [a.split(':') for a in sys.argv[1:]]
for rid, key in pairs:
    r = rows[rid]; c = [x for x in r['citations'] if x['key'] == key][0]
    e = ext(c, maxlen=700)
    print('== %s %s p.%s\n   OLD: %s\n   NEW: %s' % (rid, key, c.get('printed_page'), c['quote'][:200], e))
