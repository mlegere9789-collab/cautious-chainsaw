# candidates/r1h

Home of the candidate groups of the main-site workstream for train R1h: page groups, bundle rows and data files that are built and tested here but registered in no train until the release workstream takes them.

Rules for everything in this folder:
- Nothing here ships by itself. A candidate becomes part of a train only when the release workstream registers it in tools/t0/trains.json and rebuilds.
- Each candidate has a red-first test (it must fail on the tree without it).
- No file here may mention how the site was produced; the same copy audit applies as for shipped files.
- The status of every plan item is in docs/plan/STATUS/items-A.json; items point here when their next step is a candidate group.
