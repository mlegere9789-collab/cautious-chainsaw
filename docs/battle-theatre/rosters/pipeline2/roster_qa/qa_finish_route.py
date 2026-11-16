"""What follows the queued route test of roster-qa (the machine lock may give the job its slot long after the item was closed).

    python3 -I qa_finish_route.py            wait for GOVERNANCE/horde/ws-rosters/roster-qa/route-test.done, then finish (run once, in the background)
    python3 -I qa_finish_route.py --now      finish at once (the test has run: data2/qa/second-reading.json exists)

When the route test has run (exit code 0 and data2/qa/second-reading.json): re-run the detector, regenerate the report (section 4.2 and the summary), regenerate the closure texts (the files under
GOVERNANCE/horde/ws-rosters/roster-qa/closure; nothing is appended to a shared file but one dated line to GOVERNANCE/progress.md), drop the item PDFs of the sample (they are re-fetchable
through the cors endpoint; the pointer file keeps url, bytes and sha256) and write route-test.finished.  When the job failed: write route-test.failed.md with the tail of its error output and one
progress line, change nothing else.  It never touches a unit file, a flag file or a verdict; it runs once (route-test.finished stops a second run).  Light: well under 30 s of CPU.
"""
import sys, os, json, time, glob, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q

W = Q.WSQ
PROGRESS = os.path.join(Q.ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'progress.md')


def run(*args):
    return subprocess.run([sys.executable, '-I', os.path.join(HERE, args[0])] + list(args[1:]), capture_output=True, text=True, cwd=Q.ROOT)


def progress_line(sr):
    fams = []
    for fam, d in sr['families'].items():
        fams.append('%s %d pages%s, %s of %s lines AGREE (%s), tesseract words in the pinned leaf %.2f mean / %.2f lowest' % (
            fam, d['pages_read'], '' if d['pages_failed'] == 0 else ' (%d failed)' % d['pages_failed'], '{:,}'.format(d['agree']), '{:,}'.format(d['stored_lines']),
            ('%.0f percent' % (100 * d['agree'] / d['stored_lines'])) if d['stored_lines'] else 'n/a', d['share_in_pinned_leaf_mean'], d['share_in_pinned_leaf_min'] or 0))
    right = all(d['right_page_all'] for d in sr['families'].values())
    return ('- %s bt-rosters roster-qa (route test ran; agent report; nothing committed): the second-reading route test on 20 pages of each of the 6 source families ran through the machine lock after the item was closed (wall %s s): %s; right page for %s of the pages; the first text layer is compared with tesseract, not with the print (agreement, not accuracy); '
            'result in rosters/reports/roster-qa.md 4.2 (data2/qa/second-reading.json), the report and the closure texts regenerated, the item PDFs of the sample dropped (re-fetchable through the cors endpoint).' %
            (time.strftime('%Y-%m-%d %H:%M', time.gmtime()), sr.get('wall_s'), '; '.join(fams), 'all' if right else 'NOT all'))


def finish():
    marker = os.path.join(W, 'route-test.finished')
    if os.path.exists(marker):
        print('already finished')
        return 0
    done = os.path.join(W, 'route-test.done')
    code = open(done).read().strip() if os.path.exists(done) else None
    sr_p = os.path.join(Q.QA, 'second-reading.json')
    if code not in (None, '0') or not os.path.exists(sr_p):
        err = open(os.path.join(W, 'route-test.err'), encoding='utf-8', errors='replace').read()[-3000:] if os.path.exists(os.path.join(W, 'route-test.err')) else ''
        with open(os.path.join(W, 'route-test.failed.md'), 'w', encoding='utf-8') as f:
            f.write('# The queued route test of roster-qa did not produce data2/qa/second-reading.json\n\nexit code: %s\n\nthe end of route-test.err:\n\n```\n%s\n```\n\nRe-run `python3 -I pipeline2/roster_qa/qa_route_test.py run` through tools/horde/bench.sh, then `qa_finish_route.py --now`.\n' % (code, err))
        line = '- %s bt-rosters roster-qa (route test did not finish; agent report): the queued route test ended with exit code %s and wrote no data2/qa/second-reading.json; see GOVERNANCE/horde/ws-rosters/roster-qa/route-test.failed.md; gap G-QA06 stays open.\n' % (time.strftime('%Y-%m-%d %H:%M', time.gmtime()), code)
        with open(PROGRESS, 'a', encoding='utf-8') as f:
            f.write(line)
        open(marker, 'w').write('failed\n')
        return 1
    r1 = run('qa_route_test.py', 'detector')
    r2 = run('qa_report.py')
    r3 = run('qa_closure.py')
    sr = Q.jload(sr_p)
    ptr = Q.jload(os.path.join(Q.R2, 'sources', 'roster-qa.json'))
    names = {f['name'] for s in ptr['sources'] for f in s['files']}
    dropped = 0
    for p in glob.glob(os.path.join(Q.PDFDIR, '*')):
        if os.path.basename(p) in names and os.path.isfile(p):
            os.remove(p)
            dropped += 1
    with open(PROGRESS, 'a', encoding='utf-8') as f:
        f.write(progress_line(sr) + '\n')
    open(marker, 'w').write('finished %s; detector %d, report %d, closure %d; %d PDF and scan-data files dropped\n' % (time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), r1.returncode, r2.returncode, r3.returncode, dropped))
    print(open(marker).read())
    return 0


def main(argv):
    if '--now' not in argv:
        t0 = time.time()
        while not os.path.exists(os.path.join(W, 'route-test.done')) and time.time() - t0 < 12 * 3600:
            time.sleep(60)
    return finish()


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
