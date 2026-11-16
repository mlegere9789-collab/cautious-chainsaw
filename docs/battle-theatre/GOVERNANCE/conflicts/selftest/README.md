# Self-test of the conflict validator

`python3 -I tools/bt/conflicts/validate_resolution.py --self-test` copies the valid fixture `tools/bt/conflicts/selftest/c001-valid.json` (a complete resolution of C-001 built from the real register and two real passages of the Official Records; `tools/bt/conflicts/selftest/make_base.py` rebuilds it), plants one defect at a time and demands that the validator reports each with the code that names it. The four defects the plan names come first: a fabricated quote (`quote_not_found`), a dropped value of the PDF row (`pdf_value_dropped`), a documented tier on a lead-only source (`lead_cannot_document`), a missing reason (`reason_missing`). It also runs the command line and checks the exit statuses.

`RESULT.json` here is the result of the last run (date, number of defects caught, fixture errors). The fixture is a test fixture, not a research result.

Unit tests: `python3 -I -m unittest discover -s tools/bt/conflicts/tests -v`.
