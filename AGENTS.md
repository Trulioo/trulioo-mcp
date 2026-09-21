# AGENTS.md

Orientation for coding agents working in this repository. Read this before editing
anything.

## This repository is generated

`trulioo-mcp/` and the files beside it are **published output**, not sources. They
are produced from Trulioo's MCP server repository by CI and pushed here on each
release. An edit you make to them is reverted by the next publish, and in the
meantime it breaks the cryptographic attestation over the payload.

So: **do not open a pull request that changes `trulioo-mcp/`,
`attest-plugin.mjs`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `server.json`,
the issue and pull-request templates, the marketplace catalogs, or this file.** If
you were asked to fix something in them, the correct output is an issue describing
the defect, or a message to <mcp@trulioo.com>. Say that plainly rather than making
the edit anyway.

`CHANGELOG.md` and `.github/workflows/` are the exceptions: they are owned here and
a pull request against them is welcome.

## What each thing is

| Path | What it is |
|---|---|
| `trulioo-mcp/plugin.json` | The canonical [Agent Plugins](https://agent-plugins.org) 1.0.0 manifest. Every other manifest is a projection of it. |
| `trulioo-mcp/mcp.json` | The MCP server definition: streamable-http to `https://mcp.trulioo.com/mcp`, OAuth 2.1. |
| `trulioo-mcp/.claude-plugin/`, `.codex-plugin/`, `.mcp.json`, `.app.json.example` | Generated per-client projections. Never hand-edited; a change belongs in `plugin.json`. |
| `trulioo-mcp/skills/*/SKILL.md` | Injected into the client as context. These are the domain knowledge. |
| `trulioo-mcp/commands/*.md` | Slash commands. Each one wraps a workflow prompt the server actually serves. |
| `trulioo-mcp/agents/*.md` | Subagent definitions, read before the first tool call. |
| `trulioo-mcp/com.trulioo.kya/attestation.json` | The signature over all of the above. |
| `trulioo-mcp/tests/` | `node --test` suite asserting properties of the shipped bytes. |
| `attest-plugin.mjs` | The portable verifier. Node stdlib only, no dependencies. |
| `server.json` | MCP Registry manifest for the hosted server. |

## Verify before you trust

```sh
node attest-plugin.mjs --verify --resolve
```

Needs Node 18+. It fails closed unless the bytes on disk match what was signed
**and** the signing key resolves in Trulioo's published JWKS. `--resolve` is the
half that checks provenance; without it the run stops and says so, because an
attestation checked against a key carried in its own file proves nothing about who
published it.

```sh
node --test
```

No path argument: Node discovers `trulioo-mcp/tests/*.test.mjs` from the repository
root on its own, and a directory argument (`node --test trulioo-mcp/tests/`) is
rejected by Node 26. The suite asserts properties of the shipped bytes - which skills
install, that every documented command resolves, that the attestation seals exactly
the instruction surface on disk.

## If you are using this plugin rather than reading it

Three rules that prevent most wrong answers:

1. **Ask what the session has.** Call `trulioo_capabilities` and use what it
   lists. Tools named in any document here - including this one - are not a
   promise that your session has them. Some families are off by default; others
   ride an account entitlement.
2. **Read the mode; never assume it.** `trulioo_health` reports `sandbox`, `test`,
   or `live`, and every tool result carries a `test_mode` marker. The mode is bound
   to the credential you authenticated with, not to the URL. A `live` session
   verifies real subjects against real data.
3. **No single signal is a decision.** A verification status, an AML potential hit,
   a mandate that fails validation - report the evidence and route it to human
   review. Never turn one into a final adverse outcome, and never present an
   unsourced ownership graph (`ubo_evidence: false`) as a register filing.

The bundled skills carry the rest: field structures per country, the response
quirks that produce confidently wrong answers, and how to read each result.
