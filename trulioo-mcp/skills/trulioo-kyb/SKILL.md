---
name: trulioo-kyb
description: "Guides KYB business verification using the Trulioo MCP server. Covers registration number type discovery per country and jurisdiction, the full due-diligence sequence (search -> verify -> report), UBO discovery, AML bundling, and long-running verification handling. Use when building B2B onboarding, vendor due diligence, corporate structure analysis, or regulatory compliance workflows."
---

# trulioo-kyb

## Purpose

Verify businesses and their ownership structures using Trulioo's global business
registry data. Covers registration number discovery, full business verification,
UBO mapping, AML screening, and ongoing monitoring enrollment.

## When to invoke

- B2B onboarding requiring business verification
- Vendor due diligence and supply chain compliance
- Corporate structure analysis with UBO discovery
- Regulatory compliance (FATF, 5AMLD, FinCEN beneficial ownership)
- Any workflow calling `kyb_search`, `kyb_verify`, `kyb_get_report`, or monitoring tools

## Full due-diligence sequence

```
1. kyb_list_registration_types(country_code)
   -> what registration ID types are valid for this country?

2. kyb_search(business_name, country_code)
   -> {registration_number, match_candidates}

3. kyb_verify(registration_number, country_code,
              ubo_discovery=true, include_aml=true)
   -> {transaction_id, is_terminal, ...}
   poll if is_terminal=false (same pattern as KYC)

4. kyb_get_report(record_id=<transaction_record_id>)
   -> full structured report: directors, shareholders, UBO persons, AML results

5. (Optional) monitoring_enroll(transaction_record_id)
   -> ongoing change monitoring
```

## Jurisdiction-level registration types

US states and other jurisdictions have their own registration number types:

```
kyb_get_registration_types_by_jurisdiction(country_code="US", jurisdiction_code="DE")
-> Delaware-specific registration types
```

Use `kyb_get_all_registration_types` for a full global lookup.

## UBO discovery

```json
{ "ubo_discovery": true }
```

Maps beneficial ownership chains including indirect ownership. Required for FATF
Recommendation 24 compliance. Report includes `ubo_persons` array with each
beneficial owner's percentage ownership and relationship to the entity.

## Monitoring enrollment

After a successful KYB verification, enroll for ongoing monitoring:

```
monitoring_enroll(transaction_record_id)
-> {enrollment_id, status: "active"}

monitoring_get_alert(enrollment_id) -> latest change alert
monitoring_refresh(enrollment_id)   -> force immediate re-check
monitoring_cancel(enrollment_id)    -> stop monitoring (irreversible)
```

Monitoring triggers alerts on: director changes, address changes, registration
status changes, sanctions list additions, ownership structure changes.

## Terminal status values

Same as KYC: `match`, `nomatch`, `review`, `error`.

For long-running verifications (large corporate structures), use
`kyb_get_partial_result(transaction_id)` to retrieve intermediate results
while the full verification is still in progress.

## References

- `kyb_due_diligence_workflow` prompt
- `monitoring_enrollment_workflow` prompt
- `trulioo://kyb/{id}` resource
- `trulioo://kyb/monitoring/{id}` resource
