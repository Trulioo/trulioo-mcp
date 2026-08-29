---
name: trulioo-aml
description: "Interpret AML screening safely. Standalone aml_screen is optional and disabled by default; bundled screening depends on the selected account package."
---

# trulioo-aml

## Purpose

Screen persons or businesses against global watchlists, sanctions lists, and PEP
databases. Handles entity type routing, result interpretation, and escalation guidance.

Standalone AML is incomplete and disabled by default. Use `aml_screen` only when
`trulioo_capabilities` or `tools/list` advertises it. If it is absent, do not call it.
An account package may still support bundled screening through `include_aml` on a
verification; confirm that package support through `config_discover_account`.

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

**Standalone** (only when advertised):
Use `aml_screen` directly. No identity verification is performed.

## References

- `aml_investigation_workflow` prompt
- `trulioo://aml/{id}` resource
