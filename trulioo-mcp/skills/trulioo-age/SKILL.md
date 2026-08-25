---
name: trulioo-age
description: "Guides age assurance using the Trulioo MCP server. Covers the three-rung regulatory ladder: Rung 1 (age_check, data-only DOB), Rung 2 (age_estimate_biometric, face-based estimation, NOT IMPLEMENTED - returns not_implemented), Rung 3 (docv_create_session with age_minimum validation). Suggests a starting rung per regulatory context - COPPA (Rung 1+), UK AAS soft (Rung 1), UK AAS robust (Rung 3), GDPR (context-dependent) - as UNVERIFIED mappings that are not a compliance determination; the relying party decides what discharges its obligation. Use for age-gated content, gambling, alcohol, financial services, or any age verification flow."
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
- Any workflow calling `age_check` (rung 1) or `docv_create_session` with an `age_minimum`
  rule (rung 3). `age_estimate_biometric` is the rung-2 tool and is NOT IMPLEMENTED - see below

**Every framework name below is UNVERIFIED as a mapping and is not a compliance
determination (F196).** COPPA, GDPR, the DSA, the UK Age Assurance Standard and the
NIST assurance levels are administered by somebody else; this server implements capture
methods, not legal conclusions about them. Which rung discharges an obligation is the
relying party's determination, made with its own counsel and its own regulator.

## The three-rung ladder

| Rung | Tool | Method | Use when |
|---|---|---|---|
| 1 | `age_check` | Data-only DOB lookup | Soft check, low-friction, COPPA soft/UK AAS soft |
| 2 | `age_estimate_biometric` | Face-based age estimation | **NOT IMPLEMENTED - the tool returns `not_implemented` on every call.** `TRULIOO_ENABLE_BIOMETRIC_AGE=true` advertises it; it does not make it work. Escalate rung 1 straight to rung 3 |
| 3 | `docv_create_session` with `age_minimum` rule | Document + liveness | Highest assurance this server offers: a genuine document plus a live subject |

## Regulatory mapping

Read this table as a starting point for a conversation, not as an answer. The mapping is
UNVERIFIED here and is not a compliance determination; the rung column says what this
server can do, and only the relying party can say whether that satisfies the regulation.

| Regulation | Minimum rung | Notes |
|---|---|---|
| COPPA (US) | Rung 1 | Parental consent still required under 13 |
| UK AAS soft | Rung 1 | Self-declaration acceptable for some contexts |
| UK AAS robust | Rung 3 | Rung 2 is not implemented, so document + liveness is the only robust path this server offers today |
| GDPR child protection | Context-dependent | Varies by member state; 13-16 threshold |
| Gambling (UK, EU) | Rung 3 | Robust check required; rung 2 is not implemented |
| Alcohol/tobacco | Rung 1, or 3 where robust | Varies by jurisdiction; rung 2 is not implemented |

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

Returns: `{ "threshold_met": true | false | null, "age_threshold": 18, "method": ..., "interpretation": ..., "recommended_next_checks": [...] }`. There is no
`passes_threshold` field. `threshold_met` is THREE-valued and `null` is not a failure: it
means no usable date of birth was found, so nothing was decided. Read `interpretation`
before branching, and never treat `null` as under-age (F193).

## Rung 2: age_estimate_biometric

**Not implemented.** `age_estimate_biometric` returns a `not_implemented` error on every
call, whatever the flag says (see DEP-002 in the dependency register). Do not plan a flow
around it and do not report a rung-2 result: there is no code path that produces one. When
rung 1 is inconclusive, go to rung 3.

`TRULIOO_ENABLE_BIOMETRIC_AGE=true` controls only whether the tool is ADVERTISED in
`tools/list`. Setting it makes the tool visible and still non-functional.

The eventual rung 2 is designed to store no PII and to return an estimate rather than a DOB.
That is a design intent for unwritten code, not a property of anything running today (F194).

## Rung 3: document via DocV

Use `docv_create_session` with `validation_rules.age_minimum` set to the required age.
Trulioo extracts DOB from the document and applies the minimum check during capture.
Returns ACCEPT/DECLINE with age validation included in the result.

## Escalation pattern

```
try age_check (Rung 1)
  if passes: done
  if fails or regulatory context requires more:
    escalate to docv_create_session with age_minimum (Rung 3)
    (Rung 2 is skipped: age_estimate_biometric is not implemented)
```

## References

- `age_verification_workflow` prompt
- `trulioo://kyc/age/{id}` resource
