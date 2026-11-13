#!/bin/bash
# Machine locks for the shared 4-vCPU container.
#   tools/horde/bench.sh <command...>            heavy or browser job: at most two run at once, never during a timing job
#   tools/horde/bench.sh --timing <command...>   timing-sensitive job: runs alone
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; L="$ROOT/tmp"; mkdir -p "$L"
stale() { for f in "$L"/horde-timing.wanted.*; do [ -e "$f" ] || continue; p="${f##*.}"; kill -0 "$p" 2>/dev/null || rm -f "$f"; done; }
if [ "$1" = "--timing" ]; then
  shift
  touch "$L/horde-timing.wanted.$$"
  exec 9>"$L/horde-bench.lock"; flock -x 9
  rm -f "$L/horde-timing.wanted.$$"
  nice -n 5 "$@"; exit $?
fi
while :; do stale; ls "$L"/horde-timing.wanted.* >/dev/null 2>&1 || break; sleep 5; done
exec 9>"$L/horde-bench.lock"; flock -s 9
while :; do
  for s in 1 2; do
    exec 8>"$L/horde-slot-$s.lock"
    if flock -n 8; then nice -n 10 "$@"; exit $?; fi
  done
  sleep 3
done
