# Trulioo Prism - Claude Code plugin

Identity verification for AI agents. This plugin connects Claude Code to the
hosted **Prism MCP server** and bundles the product skills, guided workflow
commands, and an identity-orchestration agent so verification works the moment
you install it.

## Install

```
/plugin marketplace add https://mcp.trulioo.com/plugin/.claude-plugin/marketplace.json
/plugin install trulioo-mcp@trulioo
```

The marketplace manifest is served from `mcp.trulioo.com`; the plugin's tool
files are pulled from the internal repo via a `git-subdir` source (VPN + repo
access required). The MCP server it wires points at the no-token **sandbox**
endpoint (`https://mcp.trulioo.com/sandbox/mcp`), so there are no credentials to
configure. Sandbox returns synthetic data (no PII, no cost).

## What you get

- **MCP server `trulioo`** - the full Prism tool surface: KYC, KYB, AML
  screening, document verification (DocV), age assurance, and business
  monitoring.
- **Skills** (`trulioo-onboarding`, `-kyc`, `-kyb`, `-aml`, `-docv`, `-age`) -
  encode field structures per country, result interpretation, and safe defaults.
- **Slash commands** - guided multi-step workflows:
  `/trulioo-mcp:kyc-onboarding`, `:kyb-due-diligence`, `:aml-investigation`,
  `:age-verification`, `:docv-verification`, `:monitoring-enrollment`.
- **Agent `identity-orchestrator`** - picks the right tools and chains them into
  a compliant onboarding decision.

## Going live

Live verifications use `https://mcp.trulioo.com/mcp` with an OAuth 2.1 bearer
token. Sandbox and live share identical tool schemas - only the URL and token
change. To switch, override the MCP server config with the live endpoint and an
`Authorization` header:

```json
{
  "mcpServers": {
    "trulioo": {
      "type": "http",
      "url": "https://mcp.trulioo.com/mcp",
      "headers": { "Authorization": "Bearer ${TRULIOO_TOKEN}" }
    }
  }
}
```

Contact <mcp@trulioo.com> for credentials.

## Maintenance

This plugin is generated from the server's single sources of truth and kept in
lockstep by CI. Do not hand-edit `skills/*/SKILL.md`; regenerate with:

```
node core/prism/mcp-server/plugin/sync-plugin.mjs
```

The skill bodies come from `docs/site/.well-known/skills/`; the command set is
verified against the workflow prompts in `src/prompts.rs`. CI runs
`sync-plugin.mjs --check` and fails on drift.
