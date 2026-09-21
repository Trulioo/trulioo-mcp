# Trulioo - portable, KYA-signed Agent Plugin

Business verification and agent identity for AI agents. This package connects
Claude Code, ChatGPT, Codex, and Claude Desktop to Trulioo's hosted MCP server at
`https://mcp.trulioo.com/mcp`. No token or client secret is stored in the package:
each user authenticates to Trulioo on first use, over OAuth 2.1 authorization code
with PKCE.

## Install

### Claude Code

```
/plugin marketplace add Trulioo/trulioo-mcp
/plugin install trulioo-mcp@trulioo
```

### ChatGPT, Codex, and Claude Desktop

Add `https://mcp.trulioo.com/mcp` as a remote MCP connector. On the first
protected tool call the client opens the Trulioo OAuth flow in a browser.

Claude Desktop consumes the MCP server only. Skills, commands, and the agent below
are Claude Code features and do not apply there.

## What you get

**MCP server `trulioo`** - the Trulioo tool surface advertised to *your*
connection. Call `trulioo_capabilities` and use what it lists. `tools/list` is the
authority: some families are off by default or ride an account entitlement, so a
tool named in any document (including this one) is not a promise that your session
has it.

**Skills** - each one encodes the field structures, quirks, and result
interpretation for its domain, so an agent does not have to rediscover them:

| Skill | Covers |
|---|---|
| `trulioo-onboarding` | Read the session's contract before the first call: health, capabilities, packages, country context |
| `trulioo-kyb` | Business search, verification, beneficial ownership, reporting, monitoring |
| `trulioo-kya` | Resolve and verify agent credentials and spend mandates; issue and roll your own |
| `trulioo-agent-assurance` | Request and interpret multi-collector software assurance for an agent |
| `trulioo-agent-readiness` | Measure what a host publishes for agents, starting from a hostname |

**Slash command** - `/trulioo-mcp:kyb-due-diligence`, the guided business
due-diligence sequence end to end.

**Agent `identity-orchestrator`** - picks the tools the session actually advertises
and chains them, without turning any single signal into a decision.

The assurance skill discovers its contract at runtime. It carries no scanner
binary, vendor policy, credential, score translation, or hidden threshold; when the
operation it needs is not advertised it reports the route as unavailable rather
than improvising.

## One portable bundle (Agent Plugins 1.0.0)

The package follows the [agent-plugins.org](https://agent-plugins.org) open
standard: one canonical `plugin.json` + `mcp.json` + `skills/`, with each client's
config under its own reverse-DNS `extensions` namespace
(`com.anthropic.claude-code`, `com.openai.chatgpt`,
`com.anthropic.claude-desktop`). The per-client manifests -
`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.mcp.json` - are
generated projections of that one manifest, so a capability is edited once.

## Verify who published this

The bundle carries a `com.trulioo.kya` attestation: an Ed25519 signature over a
content digest of the manifest, skills, command, and agent. The released bundle is
signed by the Trulioo KYA issuer - the same authority that signs agent identities -
so its key id resolves in the issuer's published JWKS.

`attest-plugin.mjs` sits one level above this file, at the repository root. Run:

```sh
node ../attest-plugin.mjs --verify --resolve
```

It needs Node 18 or newer and no install step. Two things have to hold for it to
print `ATTESTATION OK`, and it fails closed on either: the bytes on disk match what
was signed, and the signing key resolves in Trulioo's published JWKS.

`--resolve` is what checks the second one, over the network. Leave it off and a
released plugin stops with a message telling you to add it - deliberately, because
an attestation verified against a key carried inside its own file proves integrity
and nothing at all about provenance.

See `com.trulioo.kya/README.md` for the wire format.

## This directory is generated

Do not send changes here. The package is produced from Trulioo's MCP server
sources of truth and published by CI: skill bodies, the command set, and the
client-manifest projections are regenerated and checked against the server on
every release, and the attestation is re-signed. A hand-edit is reverted by the
next publish - and would break the attestation in the meantime.

Report issues to [mcp@trulioo.com](mailto:mcp@trulioo.com).

## License

Apache License 2.0; see `LICENSE`. Access to Trulioo services is governed
separately by the applicable Trulioo agreement and authentication.
