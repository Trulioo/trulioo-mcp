---
name: trulioo-onboarding
description: "Initialize a Trulioo session from its advertised contract: health, capabilities, account packages, and country context. Use for startup, connectivity, and sandbox/live mode checks."
---

# trulioo-onboarding

## Purpose

Initialize and verify the Trulioo connection before any verification work.
This skill ensures the agent uses the contract advertised by the current session instead
of assuming every product family is enabled.

## When to invoke

- At agent startup before any Trulioo tool call
- When debugging connectivity or authentication issues
- When onboarding a new agent or environment to Trulioo

## Initialization sequence

Always run in this order:

```
1. trulioo_health()
   -> check: auth_status == "ok" and mode in ["sandbox", "test", "live"]
   -> if auth_status != "ok": stop. On the hosted server, re-run the OAuth
      authorization (the token is rejected or expired); self-hosted, check the
      deployment's Trulioo client id + secret. Do not continue on "error".

2. trulioo_capabilities()
   -> cache the enabled tool names for this session
   -> never call or promise a tool that is not listed
   -> DocV and standalone AML are optional and disabled by default

3. config_discover_account()
   -> returns available package_ids for this account
   -> package support is separate from server tool enablement
   -> cache result: packages rarely change per session

4. config_describe_context(package_id, country_code)
   -> returns exact field names, required consents, data sources, subdivisions
   -> call per country/package combination you will verify against
   -> in sandbox: also returns synthetic personas for predictable outcomes

5. config_list_test_entities(package_id, country_code, surface?)
   -> the subjects THIS session may actually run, and where they come from
   -> sandbox: synthetic fixtures served by the simulator
   -> test: your account's own Trulioo test entities, real upstream, VerificationType Demo
   -> live: available=false, with the credential change that would list them
```

## Startup checklist

- [ ] `trulioo_health` returns `auth_status: "ok"`
- [ ] `mode` matches expected environment (`sandbox` for dev, `test` for account
      acceptance runs, `live` for production)
- [ ] `trulioo_capabilities` cached; optional tools used only when listed
- [ ] `config_discover_account` returns at least one package
- [ ] `config_describe_context` called for each country you will verify against
- [ ] Required consent strings noted from `config_describe_context` response

## Sandbox vs test vs live

| `mode` | `sandbox` | `test` | `live` |
|---|---|---|---|
| Credentials needed | No (built-in demo) | Yes (your own) | Yes (your own) |
| Upstream reached | Simulator | Real Trulioo | Real Trulioo |
| `VerificationType` | `Demo` | `Demo` | `Live` |
| Subjects | Synthetic fixtures | Your account's test entities | Real people/businesses |
| Rate limits | None | Active | Active |

The authenticated session decides the mode, and `trulioo_health` is how you read
it. It is bound to the CREDENTIAL you authenticated with: do not infer it from the
deployment URL, a `package_id`, a tool name, pricing language, or a cached
instruction from another session. Call `config_list_test_entities` to see which
subjects the current session may actually run.
Never tell a user whether a call was billed: the mode fixes the `VerificationType` this
server sends, and the invoice is a fact about their Trulioo contract that no tool result
reports.

A hosted bootstrap may ASK for a less privileged mode than its credential grants:
`POST /oauth/token` accepts `scope=mode:test` (the OAuth spelling, preferred on a stock
OAuth library) or `mode=test` (form body or query string), and the response echoes `mode`,
`data` and the granted `scope`. Asking for `live` on a deployment that is not live is a
`400`: `invalid_scope` + `scopes_supported` if you asked as a scope, `invalid_request` +
`modes_supported` if you asked as a parameter. A spelling the server does not know is the
same `400`, never a silent fallback to a live session; scopes that are not ours are
ignored; a `mode` and a `scope` that disagree are refused, so send one. No tool argument
does this - only the bootstrap, and only downward.

Every tool result carries a `test_mode` marker. `mode`, `data` and `verification_type` are
on all of them; the prose `notice` is sent once per session and then suppressed. An absent
`notice` is NOT a mode change - branch on `data`.

A test-mode package+country with no seeded subject answers `test_personas: null` plus a
`seeding_request` block. That is a real answer: report the block's `remedy` to the user and
offer to hand them `support_request` verbatim. Do not retry, do not try another
`package_id`, and if a verify is run anyway, do not describe an unmatched invented subject
as a failed verification.

## Error states

| `auth_status` value | Meaning | Fix |
|---|---|---|
| `"ok"` | Ready | Proceed |
| `"error"` | Token acquisition failed, INCLUDING no credentials configured | Re-run the OAuth authorization against the hosted server; self-hosted, check the deployment's credentials are set, then that they are accepted |

`trulioo_health` reports exactly these two values. There is no `"unconfigured"` status:
missing credentials and rejected credentials both read as `"error"`, so a caller cannot
tell them apart from `auth_status` alone - check `sandbox_active` and whether a
credential was presented at all before concluding it is wrong.

## References

- `kyb_due_diligence_workflow` prompt
- `trulioo://config/{pkg}/{cc}` resource
