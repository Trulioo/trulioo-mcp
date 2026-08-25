---
name: trulioo-docv
description: "Guides document verification using the Trulioo MCP server. Covers capture method selection (auto/eid/document/liveness), validation rule configuration (expiry_check, age_minimum, face_match, mrz_check, chip_auth), mobile handoff via QR/deep-link, webhook vs polling result retrieval, and capture tier standards (ICAO 9303 chip+MRZ for EID, camera OCR/MRZ for document, ISO 30107-3 PAD for liveness; equivalences to external assurance frameworks are unverified here). No image bytes or biometric scores flow through MCP. Use for document capture, eID/NFC chip authentication, or biometric face match flows."
---

# trulioo-docv

## Purpose

Create and manage document verification sessions. The agent creates a session,
delivers handoff materials (QR/deep-link) to the user, and polls for results.
No image bytes, biometric scores, or raw matcher tokens flow through MCP.

## When to invoke

- Document capture for identity verification (passport, driver's license, national ID)
- EID/NFC chip authentication (ICAO 9303 chip + MRZ - the strongest signal here)
- Biometric liveness + face match
- Age verification Rung 3 (docv with age_minimum validation rule)
- Any workflow calling `docv_create_session`, `docv_get_result`, `docv_create_mobile_handoff`, or `docv_cancel_session`

## Session creation

```json
{
  "capture_method": "auto",
  "document_types": ["PASSPORT", "DRIVERS_LICENSE"],
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
| `eid` | NFC chip-based eID | ICAO 9303, BSI TR-03110 |
| `document` | Camera-based OCR/MRZ | ICAO 9303 MRZ |
| `liveness` | Selfie + face match only | ISO 30107-3 PAD L1/L2 |

The `Standard` column names what the capture implements. It deliberately does not map a
tier to eIDAS or to a NIST IAL: those equivalences are UNVERIFIED here and are not a
compliance determination. An eIDAS level of assurance belongs to a notified eID scheme,
and NIST IAL3 requires proofing with physical presence plus biometric collection, which a
remote unsupervised chip read is not. The tier a relying party needs is its own call; see
`assurance_mapping_unverified` in the `docv_create_session` response manifest.

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

The integration is two-tier by client capability:

- **A2UI-capable client** (server has `TRULIOO_ENABLE_A2UI=true`): prefer
  `docv_render_capture` - A2UI wraps the SDK and embeds it directly in the chat.
- **Non-A2UI client / orchestration**: fall back to `docv_create_session`, deliver
  the QR / deep link, and poll `docv_get_result` (see "Session flow" above).

`docv_render_capture` (args: `country_code`, optional `capture_method`, `package_id`,
and `mode`) creates the session AND returns an `application/a2ui+json` surface:

- `mode="auto"` (default, preferred) - embeds the certified device-aware Trulioo DocV
  **UI SDK** (`@trulioo/kyc-documents`) in-chat via the `TruliooCapture` custom
  component. The UI SDK renders the ENTIRE experience from the short code (document
  selection, guidance, camera, liveness, retries, result) and adapts to the device -
  camera on a phone, its own continue-on-your-phone handoff on a computer - so one
  surface is the complete device-aware path. The session's secure link rides along as
  a fallback. `mode="in_chat"`/`"inline"` are aliases of `auto`.
- `mode="qr"` - renders only the phone handoff (QR + short code + link) via the
  `QrHandoff` custom component, for clients that prefer to hand off to a phone.
- When the SDK reports completion the client fires `a2ui_action` name `capture_complete`
  with the `session_id`; the server then polls `docv_get_result` and returns the verdict.
- The custom components resolve from the server's capability-manifest catalog.
  Capture stays inside the capability-manifest boundary: no image bytes cross MCP,
  the certified viewport is never overlaid, and the SDK is loaded (not transpiled).

## References

- `docv_verification_workflow` prompt
- `docv_render_capture` / `a2ui_action` (experimental, `TRULIOO_ENABLE_A2UI`)
- `trulioo://kyc/docv/{id}` resource
