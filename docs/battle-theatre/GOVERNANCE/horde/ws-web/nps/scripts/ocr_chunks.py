#!/usr/bin/env python3
"""Run scripts/ocr.py on the pages still missing from the OCR text of the scanned typescripts, in chunks of a few pages.

Why: tools/horde/bench.sh runs a whole source as one locked job; while timing jobs hold the machine lock that job can wait for an
hour or more. OCR of a page costs about 2 s of CPU (measured 2026-11-16: 5 pages = 10.8 s user), so a chunk of 8 pages stays
under the 30 s rule of the machine lock. Chunks run one after the other, niced, single-threaded (OMP_THREAD_LIMIT=1).
The queued whole-source jobs (scripts/ocr_queue.sh) stay in the lock queue; when they run they find the pages done and skip them.

  ocr_chunks.py ID[:A-B] [ID[:A-B]...]     sources (optionally one page range) in the order given
Run with python3 -I.
"""
import os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
CHUNK = 8


def pages_done(sid):
    p = os.path.join(LIB, sid, sid + '.ocr.txt')
    if not os.path.exists(p):
        return set()
    return {int(m.group(1)) for m in re.finditer(r'^=== PAGE (\d+) ===$', open(p, encoding='utf-8').read(), flags=re.M)}


def npages(sid):
    out = subprocess.run(['pdfinfo', os.path.join(LIB, sid, sid + '.pdf')], capture_output=True, text=True).stdout
    return int(out.split('Pages:')[1].split()[0])


def main():
    env = dict(os.environ, OMP_THREAD_LIMIT='1')
    for arg in sys.argv[1:]:
        sid, _, rng = arg.partition(':')
        lo, hi = (1, npages(sid))
        if rng:
            a, _, b = rng.partition('-')
            lo, hi = int(a), int(b or a)
        done = pages_done(sid)
        todo = [p for p in range(lo, hi + 1) if p not in done]
        print('%s: %d page(s) to read of %d-%d' % (sid, len(todo), lo, hi), flush=True)
        while todo:
            chunk, todo = todo[:CHUNK], todo[CHUNK:]
            # contiguous runs inside the chunk
            runs, start = [], chunk[0]
            for i in range(1, len(chunk) + 1):
                if i == len(chunk) or chunk[i] != chunk[i - 1] + 1:
                    runs.append((start, chunk[i - 1]))
                    if i < len(chunk):
                        start = chunk[i]
            for a, b in runs:
                t0 = time.time()
                subprocess.run(['nice', '-n', '10', sys.executable, '-I', os.path.join(HERE, 'ocr.py'), sid, '--pages', '%d-%d' % (a, b)], env=env, check=False,
                               stdout=subprocess.DEVNULL)
                print('  %s pages %d-%d done (%.0f s wall)' % (sid, a, b, time.time() - t0), flush=True)
                time.sleep(3)
    print('chunks finished', flush=True)


if __name__ == '__main__':
    main()
