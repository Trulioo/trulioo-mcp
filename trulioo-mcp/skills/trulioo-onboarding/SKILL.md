---
name: trulioo-onboarding
description: "Agent quickstart for the Trulioo MCP server. Covers the initialization sequence (trulioo_health -> config_discover_account -> config_describe_context), sandbox test entities, credential setup, and the recommended startup checklist. Use when initializing a Trulioo MCP integration, debugging connectivity, or onboarding a new agent to Trulioo verification capabilities."
---

# trulioo-onboarding

## Purpose

Initialize and verify the Trulioo MCP server connection before any verification work.
This skill ensures your agent is properly connected, authenticated, and aware of available
verification capabilities before attempting any KYC, KYB, AML, or DocV calls.

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

2. config_discover_account()
   -> returns available package_ids for this account
   -> cache result: packages rarely change per session

3. config_describe_context(package_id, country_code)
   -> returns exact field names, required consents, data sources, subdivisions
   -> call per country/package combination you will verify against
   -> in sandbox: also returns test_entities for predictable outcomes
```

## Startup checklist

- [ ] `trulioo_health` returns `auth_status: "ok"`
- [ ] `mode` matches expected environment (`sandbox` for dev, `live` for production)
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

## Error states

| `auth_status` value | Meaning | Fix |
|---|---|---|
| `"ok"` | Ready | Proceed |
| `"error"` | Token acquisition failed | Check `TRULIOO_CLIENT_ID` / `TRULIOO_CLIENT_SECRET` |
| `"unconfigured"` | No credentials provided | Set credentials or confirm sandbox mode |

## References

- `kyc_onboarding_workflow` prompt
- `trulioo://config/{pkg}/{cc}` resource
