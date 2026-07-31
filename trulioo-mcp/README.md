# Trulioo MCP - Claude Code plugin

Identity verification for AI agents. This plugin connects Claude Code to the
hosted **Trulioo MCP server** and bundles the product skills, guided workflow
commands, and an identity-orchestration agent so verification works the moment
you install it.

## Install

```
/plugin marketplace add trulioo/trulioo-mcp
/plugin install trulioo-mcp@trulioo
```

The marketplace and plugin payload are hosted in the public
`github.com/trulioo/trulioo-mcp` repo (a mirror of this directory; see
`../DISTRIBUTION.md`). Adding via the mcp.trulioo.com URL also works
(`/plugin marketplace add https://mcp.trulioo.com/plugin/.claude-plugin/marketplace.json`) -
the `git-subdir` source resolves the payload from GitHub either way. The MCP
server it wires points at the no-token **sandbox** endpoint
(`https://mcp.trulioo.com/sandbox/mcp`), so there are no credentials to
configure. Sandbox returns synthetic data (no PII, no cost).

## What you get

- **MCP server `trulioo`** - the full Trulioo tool surface: KYC, KYB, AML
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

This repository is a generated, published mirror of the Trulioo MCP plugin. The
skill and command files are produced from the server's tool definitions and kept
in lockstep by CI, so they are not hand-edited here. Issues and questions:
<mcp@trulioo.com>.
