---
description: Run the Trulioo SDK-mediated document verification workflow.
argument-hint: "[country_code] [capture_method]"
---

Execute the document verification workflow using the `trulioo` MCP server.
Country code and capture method are optional arguments (default country `US`):
`$ARGUMENTS`. No image bytes or biometric scores flow through MCP - the agent
creates a session and hands off capture to the user's device.

Follow these steps in order:

1. Call `docv_create_session` with the chosen `capture_method` and any
   `validation_rules` (expiry_check, age_minimum, face_match, mrz_check,
   chip_auth).
2. Present `handoff.qr_data` as a QR code or `handoff.session_url` for web flow.
3. If the shortcode expires before the user scans, call
   `docv_create_mobile_handoff`.
4. Poll `docv_get_result` until `is_terminal=true`; follow the `next_action`
   hint (or use a `delivery.webhook_url` instead of polling).
5. Report the outcome from the terminal result.

Capability tiers: `eid` = NFC chip + MRZ (ICAO 9303, the strongest signal here),
`document` = camera capture + AI fraud models, `liveness` = certified biometric
PAD (ISO/IEC 30107-3). Equivalences to an eIDAS level of assurance or a NIST IAL
are UNVERIFIED here and are not a compliance determination; see
`assurance_mapping_unverified` in the session response manifest.

Consent: display verbatim consent strings from `config_describe_context` - do
not paraphrase; jurisdiction-specific wording is legally binding. This is a
sandbox/mock demo unless pointed at the live endpoint.
