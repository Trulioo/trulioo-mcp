# Trulioo MCP - portable, KYA-signed Agent Plugin

Identity verification for AI agents. This repository is the public, installable
distribution of the **Trulioo MCP** plugin - a portable
[Agent Plugins](https://agent-plugins.org) 1.0.0 bundle that connects Claude
Code, ChatGPT, OpenAI Codex, and Claude Desktop to Trulioo's hosted MCP server
(KYC, KYB, AML screening, document verification, age assurance, and business
monitoring) and bundles product skills, guided workflow commands, and an
identity-orchestration agent.

One canonical `plugin.json` + `mcp.json` + `skills/`; each client's config lives
under a reverse-DNS `extensions` namespace, so a single bundle installs
everywhere the standard is read.

## Install

**Claude Code** - install the plugin (skills + guided commands + agent):

```
/plugin marketplace add Trulioo/trulioo-mcp
/plugin install trulioo-mcp@trulioo
```

**OpenAI Codex:**

```
codex plugin marketplace add Trulioo/trulioo-mcp --ref v0.4.1
```

**ChatGPT / Claude Desktop** - add the hosted MCP server as a remote connector by
URL: `https://mcp.trulioo.com/mcp` (OAuth 2.1). Desktop uses the MCP tools; the
skills, commands, and agent are Claude Code features. See
[`trulioo-mcp/CHATGPT.md`](trulioo-mcp/CHATGPT.md) for the ChatGPT admin runbook.

All clients connect to the hosted Trulioo MCP server at
`https://mcp.trulioo.com/mcp`. On the first protected tool call you complete the
Trulioo OAuth flow and sign in as yourself; no OAuth token or client secret is
stored in the plugin.

## KYA-signed provenance

The bundle carries a `com.trulioo.kya` attestation: an Ed25519 signature over a
content digest of the manifest, skills, commands, and agent. The released bundle
is signed by the **Trulioo KYA issuer** (the same authority that signs agent
identities), so its `kid` resolves in the issuer's published JWKS. Anyone can
verify who published the plugin and that it hasn't been altered - `attest-plugin.mjs`
ships at the repo root:

```
node attest-plugin.mjs --verify            # integrity: bytes match what was signed
node attest-plugin.mjs --verify --resolve  # + provenance: kid resolves in the Trulioo JWKS
```

See [`trulioo-mcp/com.trulioo.kya/README.md`](trulioo-mcp/com.trulioo.kya/README.md)
for the attestation model.

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
attest-plugin.mjs                 # portable KYA attestation verifier (node, stdlib only)
.claude-plugin/marketplace.json   # Claude Code marketplace catalog
.agents/plugins/marketplace.json  # ChatGPT (Codex) marketplace catalog
trulioo-mcp/                       # the installable plugin payload
  plugin.json                      # canonical Agent Plugins 1.0.0 manifest
  mcp.json                         # points at https://mcp.trulioo.com/mcp (OAuth)
  .claude-plugin/plugin.json       # Claude Code projection
  .codex-plugin/plugin.json        # ChatGPT/Codex projection
  .app.json / .app.json.example    # ChatGPT MCP connection binding
  com.trulioo.kya/                 # the KYA attestation (attestation.json + README)
  skills/ commands/ agents/
  CHATGPT.md                       # ChatGPT administrator runbook
```

## About this repository

This is a **generated, published mirror**. The plugin's skills and commands are
produced from the Trulioo MCP server's tool definitions and released here by an
automated pipeline, and the KYA attestation is re-signed on each release. Do not
hand-edit the payload. For issues, questions, or credential requests, contact
<mcp@trulioo.com>.

## License

See [LICENSE](LICENSE). (c) Trulioo. All rights reserved.
