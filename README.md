# Trulioo MCP - Claude Code plugin

Identity verification for AI agents. This repository is the public, installable
distribution of the **Trulioo MCP** Claude Code plugin: it connects any Claude
Code session to Trulioo's hosted MCP server (KYC, KYB, AML screening, document
verification, age assurance, and business monitoring) and bundles product
skills, guided workflow commands, and an identity-orchestration agent.

## Install

```
/plugin marketplace add trulioo/trulioo-mcp
/plugin install trulioo-mcp@trulioo
```

The plugin defaults to the no-token **sandbox** endpoint
(`https://mcp.trulioo.com/sandbox/mcp`), so it works the moment you install it.
Sandbox returns synthetic data - no PII, no cost.

## What you get

- **MCP server `trulioo`** - the full Trulioo tool surface: KYC, KYB, AML
  screening, document verification (DocV), age assurance, and business
  monitoring.
- **Skills** (`trulioo-onboarding`, `-kyc`, `-kyb`, `-aml`, `-docv`, `-age`) -
  field structures per country, result interpretation, and safe defaults.
- **Slash commands** - guided workflows: `/trulioo-mcp:kyc-onboarding`,
  `:kyb-due-diligence`, `:aml-investigation`, `:age-verification`,
  `:docv-verification`, `:monitoring-enrollment`.
- **Agent `identity-orchestrator`** - chains the right tools into a compliant
  onboarding decision.

See [`trulioo-mcp/README.md`](trulioo-mcp/README.md) for going-live details and
the OAuth 2.1 configuration for live verifications.

## Repository layout

```
.claude-plugin/marketplace.json   # the marketplace catalog
trulioo-mcp/                       # the installable plugin payload
  .claude-plugin/plugin.json
  .mcp.json                        # points at the hosted sandbox endpoint
  skills/ commands/ agents/
```

## About this repository

This is a **generated, published mirror**. The plugin's skills and commands are
produced from the Trulioo MCP server's tool definitions and released here by an
automated pipeline. Files are not hand-edited in this repository. For issues,
questions, or credential requests, contact <mcp@trulioo.com>.

## License

See [LICENSE](LICENSE). (c) Trulioo. All rights reserved.
