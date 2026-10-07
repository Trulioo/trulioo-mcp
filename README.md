# Trulioo - portable, KYA-signed Agent Plugin

Give an AI agent two things it cannot get from a language model: **whether a
business is real**, and **whether another agent is who it claims to be**.

This repository is the public, installable distribution of **Trulioo** - a portable
[Agent Plugins](https://agent-plugins.org) 1.0.0 bundle that connects Claude Code,
ChatGPT, OpenAI Codex, and Claude Desktop to Trulioo's hosted MCP server. It ships
the tool surface plus the skills, the guided command, and the orchestration agent
that tell a model how to read the results correctly.

- **KYB** - business search, verification, beneficial ownership, reporting, and
  change monitoring across global registry data.
- **KYA** - resolve and verify agent credentials and scoped spend mandates, and
  issue, roll, or revoke identities for agents you operate.

Your session may advertise more than that - person verification, sanctions and PEP
screening, document verification, age assurance. Those are off by default or ride an
account entitlement, so `tools/list` is the authority on what you actually have, not
this page.

## Install

**Claude Code** - the full plugin (MCP server + skills + command + agent):

```
/plugin marketplace add Trulioo/trulioo-mcp
/plugin install trulioo-mcp@trulioo
```

**OpenAI Codex:**

```
codex plugin marketplace add Trulioo/trulioo-mcp --ref v0.7.4
```

Then open Codex's plugin browser, select **Trulioo** from the added marketplace,
and install and enable it. Adding the marketplace only registers the source.

**ChatGPT / Claude Desktop** - add the hosted MCP server as a remote connector by
URL: `https://mcp.trulioo.com/mcp`.

For a local ChatGPT plugin test, register the endpoint in ChatGPT developer mode,
copy its `plugin_asdk_app...` technical ID, then create a workspace-local binding:

```sh
cp trulioo-mcp/.app.json.example trulioo-mcp/.app.json
# Replace the placeholder with the workspace's plugin_asdk_app... technical ID.
node check-chatgpt-app-binding.mjs trulioo-mcp/.app.json
```

Never commit the realized `.app.json`. The distributed file remains empty because
the connection ID belongs to the installing ChatGPT workspace, not the publisher.

Every client connects to the same hosted endpoint. Complete Trulioo's OAuth 2.1
flow (authorization code + PKCE) and choose **Sandbox** to try synthetic results
without Trulioo API credentials. Live verification requires your own credentials
or an authorized staff sign-in. No token or client secret is stored in this package.

For direct anonymous MCP testing, use `https://mcp.trulioo.com/mock/mcp` with
authentication set to None. Its feature set is limited; check `trulioo_health`
and `trulioo_capabilities`. The website root is a setup page, not an MCP URL.

For a quick CLI sandbox with no sign-in:

```sh
claude mcp add --transport http trulioo-sandbox https://mcp.trulioo.com/mock/mcp
codex mcp add trulioo-sandbox --url https://mcp.trulioo.com/mock/mcp
```

For the canonical connection:

```sh
claude mcp add --transport http trulioo https://mcp.trulioo.com/mcp
# In Claude, run /mcp and authenticate Trulioo.
codex mcp add trulioo --url https://mcp.trulioo.com/mcp
codex mcp login trulioo
```

Choose Sandbox in the browser. A direct tester with only an Auth Header field
cannot complete OAuth; use `/mock/mcp` with the header empty, or supply a valid
MCP access token for `/mcp`.

## Client support

| Client | MCP tools | Packaged skills, command, agent | MCP Apps UI |
|---|---|---|---|
| Claude Code | Yes | Yes | Not claimed by this projection |
| Claude Desktop | Yes | No | Yes, when the client and server negotiate MCP Apps |
| ChatGPT | Yes | No Claude-specific assets | Yes, through the registered `.app.json` connection |
| Claude API MCP connector | Tools only | No | No |

Claude Desktop ignores the packaged skills, command, and agent; those are Claude
Code features. The Claude API MCP connector is tools only and does not consume MCP
resources or render MCP Apps UI.

## First run

Ask the agent to read its own contract before anything else:

> Call `trulioo_health`, then `trulioo_capabilities`, and tell me what this session
> can do.

`trulioo_health` reports the session's **mode** - `sandbox`, `test`, or `live`. The
mode is bound to the credential you authenticated with, not to the URL, so read it
rather than assuming it: a `live` session verifies real businesses against real
data. Every tool result also carries a `test_mode` marker so an agent can tell a
synthetic result from a real one inline.

Then try the bundled command:

```
/trulioo-mcp:kyb-due-diligence Acme Corporation US
```

## Verify who published this

The bundle carries a `com.trulioo.kya` attestation: an Ed25519 signature over a
content digest of the manifest, skills, command, and agent. Released bundles are
signed by the **Trulioo KYA issuer** - the same authority that signs agent
identities - so the signing key id resolves in the issuer's published JWKS.

```sh
git clone https://github.com/Trulioo/trulioo-mcp && cd trulioo-mcp
node attest-plugin.mjs --verify --resolve
```

Node 18+, no install step, standard library only. It fails closed unless both hold:
the bytes on disk match what was signed, and the signing key resolves in Trulioo's
JWKS.

`--resolve` is the half that checks provenance, over the network. Omit it on a
released bundle and the run stops and tells you to add it - deliberately, because an
attestation verified against a key carried inside its own file proves integrity and
says nothing about who published it.

See [`trulioo-mcp/com.trulioo.kya/README.md`](trulioo-mcp/com.trulioo.kya/README.md)
for the wire format (RFC 8785 JCS canonicalization, RFC 7515 §7.2 JWS, RFC 7638
key ids).

## What the skills are for

A tool schema says what arguments to send. It does not say that business search
returns `RecordStatus: "nomatch"` while real candidates sit in the response, or
that an ownership graph arrives with `ubo_evidence: false` because it is a
supplier's assertion rather than a register filing. Those are the mistakes that
produce a confidently wrong answer, and the skills exist to head them off.

| Skill | Covers |
|---|---|
| `trulioo-onboarding` | Read the session's contract first: health, capabilities, packages, country context |
| `trulioo-kyb` | Business search, verification, beneficial ownership, reporting, monitoring |
| `trulioo-kya` | Resolve and verify agent credentials and spend mandates; issue and roll your own |
| `trulioo-agent-assurance` | Request and interpret multi-collector software assurance for an agent |
| `trulioo-agent-readiness` | Measure what an agent publishes, starting from an account-owned Digital Agent Profile; the server derives its bound host |

Plus one slash command, `/trulioo-mcp:kyb-due-diligence`, and the
`identity-orchestrator` agent, which picks the tools the session advertises and
never turns a single signal into a decision.

## Repository layout

```
attest-plugin.mjs                  # portable KYA attestation verifier (node, stdlib only)
AGENTS.md                          # orientation for coding agents working in this repo
CONTRIBUTING.md  SECURITY.md       # how to report a problem; how to report a vulnerability
server.json                        # MCP Registry manifest for the hosted server
.claude-plugin/marketplace.json    # Claude Code marketplace catalog
.agents/plugins/marketplace.json   # ChatGPT / Codex marketplace catalog
.github/                           # issue forms + PR template (intake, not CI)
trulioo-mcp/                       # the installable plugin payload
  plugin.json                      #   canonical Agent Plugins 1.0.0 manifest
  mcp.json                         #   points at https://mcp.trulioo.com/mcp (OAuth)
  .claude-plugin/plugin.json       #   Claude Code projection
  .codex-plugin/plugin.json        #   ChatGPT / Codex projection
  .mcp.json                        #   Claude Code MCP server projection
  .app.json                        #   Empty, portable ChatGPT workspace binding
  .app.json.example                #   ChatGPT connection binding template
  com.trulioo.kya/                 #   the attestation (attestation.json + README)
  skills/ commands/ agents/        #   what gets injected into the client
  tests/                           #   test suite over the shipped bytes (node --test)
  LICENSE                          #   Apache 2.0
```

## Contributing

This repository is a **generated mirror**: everything listed above except `.github/`
is produced from Trulioo's MCP server sources of truth and replaced by CI on every
release, so a pull request against those paths is reverted by the next one. Open an
issue instead - the [bug report form](.github/ISSUE_TEMPLATE/bug-report.yml) asks for
the file and the sentence, which maps straight onto the generated source and gets a
test so it cannot come back. See [CONTRIBUTING.md](CONTRIBUTING.md) for the detail, and
read [SECURITY.md](SECURITY.md) first for anything security-sensitive.

Questions, credential requests, and bug reports: <mcp@trulioo.com>.

## License

[Apache License 2.0](LICENSE). Access to Trulioo services is governed separately by
the applicable Trulioo agreement and authentication.
