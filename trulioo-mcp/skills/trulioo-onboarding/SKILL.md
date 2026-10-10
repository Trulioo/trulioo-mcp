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
   -> cache the enabled tool names: resident AND deferred (see below)
   -> never call or promise a tool that is not listed
   -> DocV, standalone AML and monitoring are used only when listed here

3. config_discover_account()
   -> returns available package_ids for this account
   -> package support is separate from server tool enablement
   -> cache result: packages rarely change per session

4. config_describe_context(package_id, country_code)
   -> returns exact field names, required consents, data sources, subdivisions
   -> call per country/package combination you will verify against
   -> test_entities and test_personas are declared and ALWAYS null (see step 5)

5. sandbox_seed_scenario(surface, outcome, data_fields)   [sandbox sessions only]
   -> DECLARE the outcome you want instead of hunting for a seeded subject
   -> returns scenario_id (pass it to kyc_verify/kyb_verify), plus the
      transaction_id and record_id the call will run as, and expires_at
   -> sandbox_list_scenarios / trulioo://scenarios/active read back what you hold
   -> sandbox_reset_scenarios is the teardown; calling it twice is a no-op
   -> test and live: REFUSED, with the reason. The rail is real there, so a
      declared outcome cannot steer it. Do not look for a fallback.
   -> config_list_test_entities is the deprecated name for this question
```

## Resident and deferred tools

The hosted server uses progressive discovery. `tools/list` carries a small resident set
(orientation, discovery, config, the primary verbs, and every destructive tool); the rest
of what the session can run is deferred: absent from `tools/list` but callable.

- Resident: call it directly.
- Deferred: find it, read its schema, then call it through the invoker.

```
trulioo_find_tools   {"query": "registration types"}
trulioo_tool_schema  {"names": ["kyb_registration_lookup"]}
trulioo_invoke_tool  {"name": "kyb_registration_lookup", "arguments": {"country_code": "US"}}
```

`trulioo_find_tools` marks a deferred result `advertised: false`. The invoker refuses
destructive tools; those are always resident, so call them directly.

## Billed and consequential calls

The server runs what an authenticated session asks for; confirming is your job. Before
`kyb_verify` (above all when it requests ownership or AML), `kyb_run_follow_up`,
`aml_screen`, `kyc_verify`, `docv_create_session`, or a KYA issue or revoke, tell the user
what will be submitted and, on a `live` session, that it is a billed live call. Call it
only after they agree. A server that answers `reviewed_action_required` predates this
contract: stop and tell the user.

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
instruction from another session. On a sandbox session, `sandbox_list_scenarios`
shows what you have declared; on any other session there are no test subjects to list.
Never claim a past call was or was not billed: the mode fixes the `VerificationType` this
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

There is no test-entity catalogue to read any more: `test_entities` and `test_personas` are
declared and always null, and the `seeding_request` block is gone. In
`test` mode the rail is REAL even though the call is unbilled, so nothing can be declared and
nothing falls back - if a verify is run against a subject the account never seeded, do not
describe the unmatched result as a failed verification. Do not retry and do not try another
`package_id`: neither creates a subject. For a deterministic outcome, use a sandbox credential
and `sandbox_seed_scenario`.

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
