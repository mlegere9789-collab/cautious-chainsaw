# Request to the gates workstream (bt-gate-engine): Q27 under the owner's "no budget cap" order (2026-11-16)

The owner said: "there is no budget cap ... i give u unlimited allowance" (decision_log.md DEC-OWNER-2026-11-16 point 5). budget/phase_budget.json carries `owner_decision_2026_11_16` and keeps every cap null on purpose.

Q27 ("spend and compute against the Appendix F caps reported; cap breach triggers the stop condition") must therefore:
1. REPORT, never skip: spend (API-equivalent cost read from the session record at each milestone, as quoted in horde/CAMPAIGN.md lines), agent counts, compute hours per phase and per workstream, as far as they can be read from files; unknown figures are recorded as not measured.
2. Treat "cap = null with owner_decision_2026_11_16 present" as "no cap by owner order": no breach can be computed; the record says so and quotes the decision. A cap that is null WITHOUT that decision stays an open item (a gate is never passed by absence).
3. Keep the second half of Q27 (a fresh-context verification subagent per milestone that flags only correctness and requirement gaps, no self-certification) exactly as the spec states; it is not changed by the budget order.
Do not set Q27 passes=true until the runner has run and its record exists.
