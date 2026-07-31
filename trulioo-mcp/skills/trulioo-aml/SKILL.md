---
name: trulioo-aml
description: "Guides AML watchlist and sanctions screening using the Trulioo MCP server. Covers entity type selection (person vs business), standalone vs bundled screening (include_aml=true on kyc_verify/kyb_verify), interpreting Hit/Potential Hit/Clear watchlist states, and escalation patterns. Use for compliance, transaction monitoring, periodic re-screening, or any workflow requiring sanctions and PEP screening."
---

# trulioo-aml

## Purpose

Screen persons or businesses against global watchlists, sanctions lists, and PEP
databases. Handles entity type routing, result interpretation, and escalation guidance.

## When to invoke

- Standalone AML/sanctions screening without full identity verification
- Compliance workflows requiring watchlist checks
- Periodic re-screening of existing customers
- Transaction monitoring for high-risk counterparties
- Any workflow calling `aml_screen`

## Entity types

### Person screening

```json
{
  "entity_type": "person",
  "package_id": "<from config_discover_account>",
  "country_code": "US",
  "data_fields": {
    "PersonInfo": {
      "FirstGivenName": "Jane",
      "FirstSurName": "Doe",
      "DayOfBirth": 15,
      "MonthOfBirth": 3,
      "YearOfBirth": 1985
    }
  }
}
```

### Business screening

```json
{
  "entity_type": "business",
  "business_name": "Acme Corp",
  "country_code": "US"
}
```

## Result interpretation

| `watchlist_state` | Meaning | Required action |
|---|---|---|
| `Clear` | No matches found | Proceed |
| `Potential Hit` | Possible match, needs review | Flag for manual compliance review |
| `Hit` | Confirmed match | Escalate; do not proceed without human review |

Do not surface raw watchlist data to end users. Log it for compliance audit only.

## Bundled vs standalone

**Bundled** (recommended for new verifications):
```json
{ "include_aml": true }   // on kyc_verify or kyb_verify
```
Runs screening in the same call. More efficient; single transaction record.

**Standalone** (for screening-only flows):
Use `aml_screen` directly. No identity verification required.

## References

- `aml_investigation_workflow` prompt
- `trulioo://aml/{id}` resource
