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
   object (e.g. `BusinessName`, a registration field, and `BeneficialOwnersCheck:
   true` for UBO), plus `include_aml=true`. There is no `tier` argument and no
   top-level name/BRN - identity fields go inside `business_data_fields`.
4. If the response has `is_terminal: false`, FOLLOW `next_action` (it names
   `kyb_get_partial_result` and a poll interval) until terminal. On a terminal
   result, read `verify_summary.interpretation`, and find the ownership graph under
   `AppendedFields` / `Ownerships`. Follow `recommended_next_checks` for the next
   options: a confirmed match -> monitoring + screening review; not confirmed ->
   step up to DocV. Never issue an outright decline on this one signal.
5. If ongoing monitoring is required, call `monitoring_enroll` with
   `transaction_record_id=<TransactionRecordID from kyb_verify>`.
6. Summarise: entity name, registration status, UBO count, AML screening result.
   A KYB result is a single signal - never a final adverse/onboarding decision on
   its own; route any AML hit to human review.

This is a sandbox/mock demo unless pointed at the live endpoint.
