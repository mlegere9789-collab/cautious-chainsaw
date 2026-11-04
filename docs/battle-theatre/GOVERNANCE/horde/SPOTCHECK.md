# Integrator spot-check (merge_horde.py sample, seed 1)

Method: for 16 sampled "verified" timeline claims, the quoted passage was searched verbatim in the files present in this checkout. The raw OR27 OCR (`tmp/library/or27`) is NOT in this checkout and loc.gov / archive.org return 403 here, so no quote could be compared against the primary scan.

Result: 15 of 15 quotes searched were found verbatim in local text (T1-098, T2-180, T3-127, T3-096, T3-069, T1-045, T1-180, T1-085, T2-134, T3-066, T2-106, T2-118, T2-056, T1-153, T3-086; T2-232 has only paraphrase "supports" fields, so it was not tested).
- Found in an independent local OR text extraction: T3-127 (32,781 rounds; `tests/historian/fixtures/or27-chunks.json`), and T2-180, T3-069, T2-106, T2-118 (also in `history/positions/*.jsonl`, an extraction made separately from the timeline audit).
- Found only in `library/timeline_audit_T*.jsonl` (the earlier audit that the shards reused): the remaining quotes. These confirm the shards copied the audit faithfully, NOT that the audit matches the OR scan.

Not established: that any quote matches the printed OR page. Status 'verified' therefore means "citation and quote recorded and consistent with local extractions". A re-read against the scan is owed once the OR OCR is restored (owner act: re-download; tools/bt/fetch_library.py). The "supports" paraphrase fields (e.g. T2-180's second source) are counted as passage refs by the merge, but they are paraphrases, not quotes.
