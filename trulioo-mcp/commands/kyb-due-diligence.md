---
description: Run the Trulioo KYB business due-diligence workflow (search, verify, UBO, AML).
argument-hint: "[business_name] [country_code]"
---

Execute the KYB due-diligence workflow with the `trulioo` MCP server. Business name
and country code are optional arguments (default country `US`): `$ARGUMENTS`.

`trulioo_capabilities` lists what this session can run. `kyb_search` and `kyb_verify`
are resident; reach a deferred tool (`kyb_get_partial_result`, `kyb_get_report`,
`kyb_run_follow_up`) with `trulioo_find_tools`, then call it through
`trulioo_invoke_tool {"name": "kyb_get_report", "arguments": {"record_id": "..."}}`.

1. `config_discover_account` for an approved business `package_id`, then
   `config_describe_context(package_id, country_code)` for the valid
   `business_data_fields` and consents.
2. `kyb_search(package_id, business_name, country_code)`. Read `search_summary`
   (candidate_count / decision / match_quality / selection), NOT the raw
   `RecordStatus`: search returns `nomatch` even when candidates exist. Report the
   closest candidate and its `match_quality`. Pick a row from
   `search_summary.selection.candidates` by `id`; it becomes `candidate_id`, and
   `selection.ref` becomes `candidate_ref`. Offer the `recommended_next_checks`
   ladder: strong match -> verify; weak match -> DocV.
3. Confirm with the user first: say what will be submitted and, on a `live` session,
   that the verify is billed. Then
   `kyb_verify(package_id, country_code, candidate_ref, candidate_id, include_aml=true)`
   (or `business_data_fields` instead of the candidate pair). For ownership add
   `ubo_discovery=true`; the package must be provisioned for it, so no ownership means
   the account may not be entitled to ask, never that there are no owners. Do NOT
   send `BeneficialOwnersCheck`: it never triggers UBO. There is no `tier` argument.
4. If `is_terminal: false`, follow `next_action` until terminal. Read
   `verify_summary.interpretation`, then `ubo_evidence` and `ubo_evidence_note`
   before the ownership under `AppendedFields` (there is no flat `ubo_persons`
   field). `ubo_evidence: false` means unsourced supplier data, not a register filing.
   Not confirmed -> step up to DocV; never an outright decline on one signal.
5. Only if `trulioo_capabilities` lists `monitoring_enroll`, offer
   `monitoring_enroll(record_id)` with the TransactionRecordID from `kyb_verify`.
6. Summarise: entity, registration status, UBO count (unsourced when `ubo_evidence`
   is false), AML result. Route any AML hit to human review.

State the session's mode, read from `trulioo_health`'s `mode` and each result's
`test_mode.data` marker (`synthetic` vs real). Never call a run a demo without
having read one of those. If a server answers `reviewed_action_required`, it
predates this contract: stop and tell the user.
