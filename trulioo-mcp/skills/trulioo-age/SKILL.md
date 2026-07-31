---
name: trulioo-age
description: "Guides age assurance using the Trulioo MCP server. Covers the three-rung regulatory ladder: Rung 1 (age_check, data-only DOB), Rung 2 (age_estimate_biometric, face-based estimation, requires TRULIOO_ENABLE_BIOMETRIC_AGE=true), Rung 3 (docv_create_session with age_minimum validation). Maps regulatory contexts to appropriate rungs: COPPA (Rung 1+), UK AAS soft (Rung 1), UK AAS robust (Rung 2-3), GDPR (context-dependent). Use for age-gated content, gambling, alcohol, financial services, or any age verification flow."
---

# trulioo-age

## Purpose

Select and execute the appropriate age assurance rung for a regulatory requirement.
Maps regulatory contexts to verification methods and guides escalation through the
three-rung age assurance ladder.

## When to invoke

- Age-gated content platforms (COPPA, GDPR, DSA)
- UK Age Assurance Standard (soft and robust checks)
- Gambling, alcohol, tobacco, financial services age requirements
- Any workflow calling `age_check` or `age_estimate_biometric`

## The three-rung ladder

| Rung | Tool | Method | Use when |
|---|---|---|---|
| 1 | `age_check` | Data-only DOB lookup | Soft check, low-friction, COPPA soft/UK AAS soft |
| 2 | `age_estimate_biometric` | Face-based age estimation | UK AAS robust estimate, no document needed. Requires `TRULIOO_ENABLE_BIOMETRIC_AGE=true` |
| 3 | `docv_create_session` with `age_minimum` rule | Document + liveness | Highest assurance, NIST IAL2+, UK AAS high |

## Regulatory mapping

| Regulation | Minimum rung | Notes |
|---|---|---|
| COPPA (US) | Rung 1 | Parental consent still required under 13 |
| UK AAS soft | Rung 1 | Self-declaration acceptable for some contexts |
| UK AAS robust | Rung 2-3 | Face estimation or document required |
| GDPR child protection | Context-dependent | Varies by member state; 13-16 threshold |
| Gambling (UK, EU) | Rung 2-3 | Robust check required |
| Alcohol/tobacco | Rung 1-2 | Varies by jurisdiction |

## Rung 1: age_check

```json
{
  "country_code": "US",
  "package_id": "<identity or age package>",
  "age_threshold": 18,
  "data_fields": {
    "PersonInfo": {
      "DayOfBirth": 15,
      "MonthOfBirth": 3,
      "YearOfBirth": 1990
    }
  }
}
```

Returns: `{ "passes_threshold": true/false, "age_threshold": 18 }`

## Rung 2: age_estimate_biometric

Requires `TRULIOO_ENABLE_BIOMETRIC_AGE=true` on the server. The tool will not appear
in `tools/list` unless this flag is set.

No PII stored. Age estimate only - does not return a DOB.

## Rung 3: document via DocV

Use `docv_create_session` with `validation_rules.age_minimum` set to the required age.
Trulioo extracts DOB from the document and applies the minimum check during capture.
Returns ACCEPT/DECLINE with age validation included in the result.

## Escalation pattern

```
try age_check (Rung 1)
  if passes: done
  if fails or regulatory context requires more:
    escalate to age_estimate_biometric (Rung 2, if enabled)
    if still insufficient for regulation:
      escalate to docv_create_session with age_minimum (Rung 3)
```

## References

- `age_verification_workflow` prompt
- `trulioo://kyc/age/{id}` resource
