---
name: trulioo-docv
description: "Guides document verification using the Trulioo MCP server. Covers capture method selection (auto/eid/document/liveness), validation rule configuration (expiry_check, age_minimum, face_match, mrz_check, chip_auth), mobile handoff via QR/deep-link, webhook vs polling result retrieval, and capture tier standards (eIDAS High/NIST IAL3 for EID, IAL2 for document, ISO 30107-3 for liveness). No image bytes or biometric scores flow through MCP. Use for document capture, eID/NFC chip authentication, or biometric face match flows."
---

# trulioo-docv

## Purpose

Create and manage document verification sessions. The agent creates a session,
delivers handoff materials (QR/deep-link) to the user, and polls for results.
No image bytes, biometric scores, or raw matcher tokens flow through MCP.

## When to invoke

- Document capture for identity verification (passport, driver's license, national ID)
- EID/NFC chip authentication (eIDAS High / NIST IAL3)
- Biometric liveness + face match
- Age verification Rung 3 (docv with age_minimum validation rule)
- Any workflow calling `docv_create_session`, `docv_get_result`, `docv_create_mobile_handoff`, or `docv_cancel_session`

## Session creation

```json
{
  "capture_method": "auto",
  "document_types": ["passport", "driving_licence"],
  "validation_rules": {
    "expiry_check": true,
    "face_match": true,
    "mrz_check": true
  },
  "delivery": {
    "webhook_url": "https://your-app.example.com/webhooks/docv"
  },
  "session_ttl_minutes": 30
}
```

## Capture methods

| Method | Use case | Standard |
|---|---|---|
| `auto` | Let SDK select best method | - |
| `eid` | NFC chip-based eID | eIDAS High, NIST IAL3 |
| `document` | Camera-based OCR/MRZ | NIST IAL2 |
| `liveness` | Selfie + face match only | ISO 30107-3 PAD L1/L2 |

## Validation rules

| Rule | Effect |
|---|---|
| `expiry_check` | Reject expired documents |
| `age_minimum` | Enforce minimum age from document DOB |
| `face_match` | Require liveness selfie matching document face |
| `mrz_check` | Validate Machine Readable Zone |
| `chip_auth` | NFC chip authentication |

## Session flow

```
docv_create_session(...) -> {session_id, qr_code_url, deep_link_url, shortcode}

Deliver qr_code_url or deep_link_url to user (out of band)
User completes capture on their device via Trulioo SDK

Option A (webhook): Trulioo POSTs result to webhook_url
Option B (polling): loop docv_get_result(session_id) every 5s
  -> terminal: ACCEPT / REVIEW / DECLINE / EXPIRED

if shortcode expires: docv_create_mobile_handoff(session_id) -> new shortcode (5 min TTL)
if session abandoned: docv_cancel_session(session_id)
```

## Terminal states

| State | Meaning |
|---|---|
| `ACCEPT` | Document verified and accepted |
| `REVIEW` | Flagged for manual review |
| `DECLINE` | Verification failed |
| `EXPIRED` | Session TTL elapsed; create a new session |

## Generative UI (A2UI) - experimental

When the client supports A2UI and the server has `TRULIOO_ENABLE_A2UI=true`, prefer
`docv_render_capture` over hand-delivering a URL:

- `docv_render_capture` (args: `country_code`, optional `capture_method`, `package_id`,
  and `mode`) creates the session AND returns an `application/a2ui+json` surface:
  - `mode="qr"` (default) - a scannable QR + short code + desktop link (`QrHandoff`
    custom component). Best for desktop -> mobile handoff.
  - `mode="in_chat"` - mounts the certified Trulioo capture SDK inline
    (`TruliooCapture` custom component, `@trulioo/kyc-documents-capture`).
- After the user captures, the client fires `a2ui_action` name `capture_complete`
  with the `session_id`; the server polls `docv_get_result` and returns the verdict.
- The custom components load from the server's hosted component catalog.
  Capture stays inside the capability-manifest boundary: no image bytes cross MCP,
  the certified viewport is never overlaid, and the SDK is loaded (not transpiled).

## References

- `docv_verification_workflow` prompt
- `docv_render_capture` / `a2ui_action` (experimental, `TRULIOO_ENABLE_A2UI`)
- `trulioo://kyc/docv/{id}` resource
