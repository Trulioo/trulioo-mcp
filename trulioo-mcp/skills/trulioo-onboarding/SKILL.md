---
name: trulioo-onboarding
description: "Initialize a Trulioo MCP session from its advertised contract: health, capabilities, account packages, and country context. Use for startup, connectivity, and sandbox/live mode checks."
---

# trulioo-onboarding

## Purpose

Initialize and verify the Trulioo MCP server connection before any verification work.
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
   -> check: auth_status == "ok" and mode in ["sandbox", "live"]
   -> if auth_status != "ok": stop, check TRULIOO_CLIENT_ID / TRULIOO_CLIENT_SECRET

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
   -> in sandbox: also returns test_entities for predictable outcomes
```

## Startup checklist

- [ ] `trulioo_health` returns `auth_status: "ok"`
- [ ] `mode` matches expected environment (`sandbox` for dev, `live` for production)
- [ ] `trulioo_capabilities` cached; optional tools used only when listed
- [ ] `config_discover_account` returns at least one package
- [ ] `config_describe_context` called for each country you will verify against
- [ ] Required consent strings noted from `config_describe_context` response

## Sandbox vs live

| | Sandbox | Live |
|---|---|---|
| `TRULIOO_MODE` | `sandbox` (default) | `live` |
| Credentials needed | No (built-in demo) | Yes |
| Real verifications | No (mock adapters) | Yes |
| Test entities | Available | N/A |
| Rate limits | None | Active |

The authenticated session decides sandbox vs live. Do not infer mode from the
deployment URL, tool name, pricing language, or a cached instruction from another
session.

## Error states

| `auth_status` value | Meaning | Fix |
|---|---|---|
| `"ok"` | Ready | Proceed |
| `"error"` | Token acquisition failed, INCLUDING no credentials configured | Check that `TRULIOO_CLIENT_ID` / `TRULIOO_CLIENT_SECRET` are set, then that they are accepted |

`trulioo_health` reports exactly these two values. There is no `"unconfigured"` status:
missing credentials and rejected credentials both read as `"error"`, so a caller cannot
tell them apart from `auth_status` alone - check `sandbox_active` and whether the
credentials are present before concluding they are wrong (F193).

## References

- `kyc_onboarding_workflow` prompt
- `trulioo://config/{pkg}/{cc}` resource
