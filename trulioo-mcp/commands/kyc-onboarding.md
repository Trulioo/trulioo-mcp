---
description: Run the Trulioo KYC identity-verification onboarding workflow end to end.
argument-hint: "[country_code] [package_id]"
---

Execute the KYC onboarding workflow using the `trulioo` MCP server. Country code
and package id are optional arguments (default country `US`; package resolves on
submit): `$ARGUMENTS`.

Follow these steps in order:

1. Call `config_describe_context(package_id, country_code)` to get required
   consents, recommended fields, and sandbox `test_entities`.
2. Construct `data_fields` from the recommended fields. Key groups: `PersonInfo`
   (FirstGivenName, FirstSurName, DayOfBirth, MonthOfBirth, YearOfBirth),
   `Location` (BuildingNumber, StreetName, City, StateProvinceCode, PostalCode),
   `NationalId` (Number). Use the exact field names from
   `config_describe_context`.
3. Call `kyc_verify` with the recommended `data_fields`, `consents`, and
   `wait_for_completion=true` to get the final record in one call.
4. If `is_terminal=false`, follow the `next_action` hint: poll `kyc_get_status`
   until terminal, then call `kyc_get_record`.
5. Report status and relevant `appended_fields`. To find watchlist status, scan
   for the entry where `FieldName='WatchlistState'` and read its `Data`.

Apply the principle of minimum data: only include fields required for the
country. This is a sandbox/mock demo unless the session is pointed at the live
endpoint - say so if asked about real data.
