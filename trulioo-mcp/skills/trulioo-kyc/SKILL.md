---
name: trulioo-kyc
description: "Guides KYC identity verification decisions using the Trulioo MCP server. Covers data_fields structure by country (PascalCase Trulioo field names), synchronous vs async result modes, is_terminal polling with next_action hints, consent requirements, and interpreting match/nomatch/review results. Use when building identity verification flows, user onboarding, or any workflow that needs to verify a person's identity via kyc_verify, kyc_get_status, or kyc_get_record."
---

# trulioo-kyc

## Purpose

Verify a person's identity against Trulioo's global data sources. Handles field
collection, consent, submission, async polling, and result interpretation.

## When to invoke

- User onboarding flows requiring identity verification
- Age-gated services needing identity confirmation
- Fraud prevention requiring identity checks
- Any workflow calling `kyc_verify`, `kyc_get_status`, or `kyc_get_record`

## Prerequisites

Initialize with the `trulioo-onboarding` skill first (it runs
`trulioo_health` -> `config_discover_account` -> `config_describe_context`).
Concretely, before your first `kyc_verify` you need a `package_id` from
`config_discover_account` and the exact field names + required consents from
`config_describe_context(package_id, country)`.

## What is a package_id (and why it's required)

A Trulioo **package** is the verification product configured for your account: it
determines which **data sources** are queried, which **document types** and
**country rules** apply, and what **consents** are required. It is the single input
that binds a verification to a specific product + jurisdiction configuration, which
is why `kyc_verify` requires `package_id` - the same person fields verify differently
under different packages/countries.

Discover packages with `config_discover_account` (returns `PackageId` +
`PackageName`/`PackageType`), then use `config_describe_context(package_id, country)`
for that package's exact fields and consents.

For the A2UI KYC form (`kyc_render_form`), `package_id` is **optional**: the form
renders from `country_code` alone, and `kyc_submit_action` resolves a default
identity package at submit time - so the user can start from just a country.

## Field structure

Fields use Trulioo's PascalCase naming inside `data_fields`. Always call
`config_describe_context` to get the exact required fields for each country/package.

```json
{
  "country_code": "US",
  "package_id": "<from config_discover_account>",
  "data_fields": {
    "PersonInfo": {
      "FirstGivenName": "Jane",
      "FirstSurName": "Doe",
      "DayOfBirth": 15,
      "MonthOfBirth": 3,
      "YearOfBirth": 1985
    },
    "Location": {
      "BuildingNumber": "123",
      "StreetName": "Main St",
      "City": "Austin",
      "StateProvinceCode": "TX",
      "PostalCode": "78701"
    },
    "Communication": {
      "Telephone": "5125550100"
    }
  }
}
```

## Async polling pattern

```
kyc_verify(...) -> {transaction_id, is_terminal, status}

if is_terminal == false:
  loop:
    kyc_get_status(transaction_id)
    -> {is_terminal, status, next_action}
    wait next_action.suggested_poll_interval_seconds (typically 2)
    if is_terminal == true: break

kyc_get_record(record_id = <transaction_record_id from status response>)
-> full match results per data source
```

## Terminal status values

| Status | Meaning | Next action |
|---|---|---|
| `match` | Identity verified | Proceed with onboarding |
| `nomatch` | No match found | Request more information or escalate |
| `review` | Manual review needed | Escalate to compliance team |
| `error` | Processing error | Check error details, retry if transient |

## Sandbox behavior

In sandbox (`TRULIOO_MODE=sandbox`, the default) results are synthetic and every
tool response carries a `test_mode` object (`{sandbox: true, verification_type:
"Demo", data: "synthetic", ...}`), so you can tell a demo result from a live one
inline without a separate `trulioo_health` probe.

To exercise each terminal branch, the sandbox picks the outcome from the submitted
surname (`PersonInfo.FirstSurName`, case-insensitive):

| Surname | Terminal status |
|---|---|
| `Nomatch` | `nomatch` |
| `Review` | `review` |
| `Error` | `error` |
| anything else (e.g. `Doe`) | `match` |

`config_describe_context` returns one `test_entities` persona per outcome, so you
can drive the full range of downstream handling, not just the happy path.

## Synchronous mode

For UX where you want to wait for the result inline:

```json
{
  "wait_for_completion": true
}
```

Server polls internally for up to 30s and returns a terminal result directly.
Use for low-latency flows; use async for progress-feedback UX.

## Combined KYC + AML

```json
{
  "include_aml": true
}
```

Runs AML watchlist screening in the same call. Returns `aml_result` alongside
verification results. More efficient than a separate `aml_screen` call.

## Consent handling

Some countries require explicit consent. Get the available consents from
`config_describe_context` (the `consents` array; each entry has a `Name` and legal
`Text`). Pass the consent **`Name`** values (e.g. `"MockCredit"`) - not the display
`Text`, not a boolean - to the top-level `consents` parameter of `kyc_verify`:

```json
{ "consents": ["MockCredit"] }
```

The server maps them to the NAPI `ConsentForDataSources` field; you do not nest them
inside `data_fields` yourself.

## Generative UI (A2UI) - experimental

When the client supports A2UI (advertised at MCP `initialize`) and the server has
`TRULIOO_ENABLE_A2UI=true`, prefer rendering a form over asking for fields in chat:

- `kyc_render_form` (args: `package_id`, `country_code`) returns a `CallToolResult`
  carrying an `application/a2ui+json` surface (a `Card > Column` of inputs + submit
  `Button`, basic catalog) plus a plain-text fallback. A2UI clients render the form;
  others show the text.
- The user's submission arrives back as `a2ui_action` (name `submit_kyc`). The server
  maps the form context to Trulioo `data_fields` (PersonInfo / Location / NationalIds)
  and runs `kyc_verify` with `wait_for_completion`. You do not assemble `data_fields`
  yourself in this flow.

The Trulioo MCP demo exposes this behind a Standard | Experimental switch; standard mode is
the plain chat + raw tool-trace behavior. See `docs/standards-and-next-steps.md`.

### White-labeling

Every A2UI surface is themeable (colors, radius, logo), defaulting to Trulioo tokens.
If the user wants to brand the experience, call `brand_render_studio` (optionally with
`prefill`) to render an A2UI brand form; its `apply_brand` action re-themes all surfaces
client-side. The demo also offers a manual Brand panel and "learn from a website" palette
extraction. Branding never affects verification logic or data - it is purely presentational.

## References

- `kyc_onboarding_workflow` prompt
- `kyc_render_form` / `a2ui_action` tools (experimental, `TRULIOO_ENABLE_A2UI`)
- `brand_render_studio` tool (experimental white-labeling)
- `trulioo://kyc/{id}` resource
