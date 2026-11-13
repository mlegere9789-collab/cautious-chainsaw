#!/usr/bin/env python3
"""HEAD-probe a list of URLs at 1 request per second and append one JSON line per
request to a log (URL, HTTP status, content-length, content-type, last-modified).

Usage: python3 head_probe.py <urls.txt> <out.jsonl>
No retries on policy denials; a refused host is recorded as blocked.
"""
import json, subprocess, sys, time, datetime

def head(url):
    p = subprocess.run(
        ['curl', '-sS', '-I', '-L', '--max-redirs', '3', '-m', '60', url],
        capture_output=True, text=True)
    status = None
    hdr = {}
    for line in p.stdout.splitlines():
        if line.startswith('HTTP/'):
            parts = line.split()
            status = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
            hdr = {}
        elif ':' in line:
            k, v = line.split(':', 1)
            hdr[k.strip().lower()] = v.strip()
    return {
        'url': url,
        'method': 'HEAD',
        'http': status,
        'curl_exit': p.returncode,
        'curl_err': p.stderr.strip()[:200] or None,
        'content_length': int(hdr['content-length']) if hdr.get('content-length', '').isdigit() else None,
        'content_type': hdr.get('content-type'),
        'last_modified': hdr.get('last-modified'),
        'at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    }

def main():
    urls = [u.strip() for u in open(sys.argv[1]) if u.strip() and not u.startswith('#')]
    with open(sys.argv[2], 'a') as out:
        for u in urls:
            r = head(u)
            out.write(json.dumps(r) + '\n')
            out.flush()
            print(r['http'], r['content_length'], u)
            time.sleep(1.0)

if __name__ == '__main__':
    main()
