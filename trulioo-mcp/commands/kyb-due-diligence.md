---
description: Run the Trulioo KYB business due-diligence workflow (search, verify, UBO, AML).
argument-hint: "[business_name] [country_code]"
---

Execute the KYB due-diligence workflow using the `trulioo` MCP server. Business
name and country code are optional arguments (default country `US`):
`$ARGUMENTS`.

Follow these steps in order:

1. Call `config_discover_account` to pick an approved business `package_id`, then
   `config_describe_context(package_id, country_code)` for the valid
   `business_data_fields` and required consents.
2. Call `kyb_search(package_id, business_name, country_code)`. Read the injected
   `search_summary` (candidate_count / has_results / best_match / match_quality /
   top_matches), NOT the raw `RecordStatus` - business search returns `nomatch` even
   when candidates exist. Report the closest candidate and how close it is
   (`best_match` + `match_quality`: strong / partial / weak), not a bare list. Take
   the registration number from `search_summary.best_match` (or `top_matches`).
   Offer the `recommended_next_checks` options (the fraud-uplift ladder: a strong
   match -> verify to confirm; a weak/near match -> step up to DocV).
3. Call `kyb_verify` with `package_id`, `country_code`, and a `business_data_fields`
   object (e.g. `BusinessName` and a registration field), plus `include_aml=true`.
   For ownership pass `ubo_discovery=true` (or `profile="complete"`), which is what
   sets `Entities=true` upstream - the only flag that triggers UBO discovery. The flag
   requests the tier; the account's package must be provisioned for it. If no ownership
   comes back, say the account may not be entitled to ask - never that the business has
   no beneficial owners. Do NOT
   send `BeneficialOwnersCheck`: an earlier build sent it, it never triggered UBO,
   and a request carrying it returns no ownership while looking like it asked for
   some. There is no `tier` argument and no top-level name/BRN - identity fields go
   inside `business_data_fields`.
4. If the response has `is_terminal: false`, FOLLOW `next_action` (it names
   `kyb_get_partial_result` and a poll interval) until terminal. On a terminal
   result, read `verify_summary.interpretation`, then read `ubo_evidence` and
   `ubo_evidence_note` BEFORE using the ownership graph under `AppendedFields` /
   `Ownerships` (there is no flat `ubo_persons` field). `ubo_evidence: false` means
   the hierarchy is unsourced supplier data and not a register filing, so it cannot
   be cited as one. Follow `recommended_next_checks` for the next
   options: a confirmed match -> monitoring + screening review; not confirmed ->
   step up to DocV. Never issue an outright decline on this one signal.
5. If ongoing monitoring is required, call `monitoring_enroll` with
   `transaction_record_id=<TransactionRecordID from kyb_verify>`.
6. Summarise: entity name, registration status, UBO count stated as unsourced
   supplier data when `ubo_evidence` is false (ADR-P-052 D3), AML screening result.
   A KYB result is a single signal - never a final adverse/onboarding decision on
   its own; route any AML hit to human review.

This is a sandbox/mock demo unless pointed at the live endpoint.
