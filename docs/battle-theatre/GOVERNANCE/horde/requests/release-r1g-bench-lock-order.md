# Request from release-r1g (timing triage), 2026-11-16: tools/horde/bench.sh makes a `--timing` request wait for every QUEUED shared job, not only the running ones

File to change (not owned by release-r1g): `tools/horde/bench.sh`.  Nothing was changed there by this workstream.

## What was measured (cloud machine, 4 vCPU container; the numbers are waits, not timings of a site)

* 2026-11-16 02:42:48Z: `tools/horde/bench.sh --timing tmp/r1g-timing/bin/job.sh w1` was queued (it had one other `--timing` request, pid 15638, in front of it).
* At that moment 18 processes held the shared lock (`flock -s 9` on `tmp/horde-bench.lock`; `grep FLOCK /proc/locks` shows 18 READ locks), but only two of them were running: the other 16 were still polling for a free slot (`horde-slot-1.lock`, `horde-slot-2.lock`).
* The exclusive `flock -x 9` of a `--timing` job cannot be granted before every holder of the shared lock has finished.  The queued jobs took the shared lock before they got a slot, so the timing job waited for all 18 to run, not for the two that were running.  Drain rate seen: 18 holders at 02:42, 11 at 02:55, 8 at 03:05, 6 at 03:15, 2 at 03:27; at 03:37 the last two (long browser labs that restart their own node child under the same `bench.sh` shell) were still there, 54 minutes after the request, and the `--timing` job had not started.
* While a `horde-timing.wanted.<pid>` file exists no new shared job may start, so every engineer's new browser job waited behind two `--timing` requests at the same time.

## Why it matters

A timing measurement needs a quiet machine, and the lock is the only way to get one; a wait of about an hour per window makes the second round (the pair in the other order) cost another hour, and the whole queue is stalled while the request is pending.

## The exact change proposed (the owner of tools/horde decides)

Take the shared lock only when a slot is held, so that a queued job does not hold it:

```bash
# shared path of tools/horde/bench.sh, replacing the block from "while :; do stale; ls ..." to the end
while :; do
  stale
  if ls "$L"/horde-timing.wanted.* >/dev/null 2>&1; then sleep 5; continue; fi
  for s in 1 2; do
    exec 8>"$L/horde-slot-$s.lock"
    if flock -n 8; then
      exec 9>"$L/horde-bench.lock"; flock -s 9        # at most the two slot holders can be in front of a --timing request
      nice -n 10 "$@"; exit $?
    fi
  done
  sleep 3
done
```

With it a `--timing` request waits for at most two running jobs.  A job that already has a slot and is blocked on `flock -s 9` behind a `--timing` job keeps its slot, which costs nothing while the timing job runs.

## Not part of the request

No change to what a `--timing` job promises (it runs alone, cooperating jobs only).  Processes that do not go through `bench.sh` (OCR, PDF tools, `rg`, a Python script started by hand) are not kept away by any lock; between 02:44 and 03:37 the 1-minute load average read 30, 30, 32, 35, 21 and 12 (about every ten minutes), with OCR, PDF and Python processes running outside the lock next to the browser jobs, so the lock alone does not give a quiet machine.  tmp/r1g-timing/bin/job.sh and quiet.sh record the busy percentage of the machine and wait (budgeted) for a quiet moment before each timing run.
