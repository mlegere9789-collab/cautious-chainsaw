# Request to the integration step (bt-conflicts-integrate) or the orchestrator: mirror the conflict-tool tests under tests/governance/conflicts

From: workstream bt-conflicts (stage prep), 2026-11-16.

The task of the preparation stage asks for "tests under tests/governance/conflicts". That directory is not on the ownership list of the stage (which names `docs/battle-theatre/GOVERNANCE/conflicts/**`, `tools/bt/conflicts/**`, `GOVERNANCE/horde/ws-conflicts/**`, `tmp/conflicts/**`), so the tests were written inside the owned tree and run from there:

- `tools/bt/conflicts/tests/test_validate_resolution.py` (22 tests, run on 2026-11-16: the clock, number and day parsers; the registers; the ledger hashes; the valid fixture; every planted defect of the self-test; the command-line exit statuses; the 47 dossiers).
- `tools/bt/conflicts/validate_resolution.py --self-test` (the fixture `tools/bt/conflicts/selftest/c001-valid.json` and over forty planted defects with three positive controls; writes `GOVERNANCE/conflicts/selftest/RESULT.json`).

What is asked: create `tests/governance/conflicts/test_validate_resolution.py` with exactly this content (it runs the tests that live with the tools, so nothing is duplicated and the file works from either place):

```python
"""Tests of the conflict-resolution tools (tools/bt/conflicts): a thin runner of tools/bt/conflicts/tests/test_validate_resolution.py.
Run: python3 -I tests/governance/conflicts/test_validate_resolution.py   (exit 1 while any check fails)."""
import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt', 'conflicts', 'tests'))
from test_validate_resolution import *   # noqa: F401,F403  (the TestCase classes are picked up by unittest)

if __name__ == '__main__':
    unittest.main(verbosity=2)
```

The integration step (`bt-conflicts-integrate`, task item 5) adds its own python tests "under tests/governance/conflicts" (a conflict loses a value; a default has no resolution file; the source-panel text is missing): they belong next to this file. Nothing else is needed from this request; if the directory is created by another stage first, add the file there.
