---
description: Run the Trulioo KYB business due-diligence workflow (search, verify, UBO, AML).
argument-hint: "[business_name] [country_code]"
---

Execute the KYB due-diligence workflow using the `trulioo` MCP server. Business
name and country code are optional arguments (default country `US`):
`$ARGUMENTS`.

Follow these steps in order:

1. Call `kyb_search(business_name, country_code)` to find the registration
   number.
2. Call `kyb_verify` with `business_name`, `country_code`,
   `business_registration_number`, `ubo_discovery=true`, `include_aml=true`, and
   `tier='essentials'` (escalate tier if needed).
3. Check the response for status, registration numbers, and ownership data. For
   an ownership graph, look in `appended_fields` for the ownership hierarchy.
4. If ongoing monitoring is required, call `monitoring_enroll` with
   `transaction_record_id=<TransactionRecordID from kyb_verify>`.
5. Summarise: entity name, registration status, UBO count, AML screening result.

This is a sandbox/mock demo unless pointed at the live endpoint.
