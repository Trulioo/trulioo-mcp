---
description: Run the Trulioo age-assurance workflow across the regulatory rungs.
argument-hint: "[age_threshold]"
---

Execute the age verification workflow using the `trulioo` MCP server. Minimum
age is an optional argument (default `18`): `$ARGUMENTS`. Work through the rungs
in order and stop at the first rung that gives a clear result.

Rung 1 - Data check (no capture):

1. Call `age_check` with the available `data_fields` and `age_threshold`.
2. If `threshold_met=true` and clearly above the boundary, accept and stop.
3. If `threshold_met=false` and clearly under-age, reject and stop.
4. If near the threshold or inconclusive, escalate to rung 3.

Rung 2 - Biometric estimate: `age_estimate_biometric` is not yet implemented;
skip to rung 3 if rung 1 is inconclusive.

Rung 3 - Authoritative DOB (document or EID):

5. Call `docv_create_session` with `capture_method=eid` (preferred) or
   `document`, `validation_rules.age_minimum=<threshold>`,
   `validation_rules.face_match=true`.
6. Present `handoff.qr_data` as a QR code or `handoff.session_url` for web flow.
7. If the shortcode expires, call `docv_create_mobile_handoff`.
8. Poll `docv_get_result` until terminal; follow the `next_action` hint.
9. Read the extracted `date_of_birth` to make the final age determination.

This is a sandbox/mock demo unless pointed at the live endpoint.
