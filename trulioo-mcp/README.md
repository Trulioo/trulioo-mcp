# Trulioo MCP - portable, KYA-signed Agent Plugin

Identity verification for AI agents. This package connects Claude Code, ChatGPT,
Codex, and Claude Desktop to the hosted **Trulioo MCP server** at
`https://mcp.trulioo.com/mcp` using the existing employee OAuth flow. No OAuth
token or client secret is stored in the package - every employee authenticates
to Trulioo as themselves on first use.

**One portable bundle (Agent Plugins 1.0.0).** The package follows the
[agent-plugins.org](https://agent-plugins.org) open standard: a canonical
`plugin.json` + `mcp.json` + `skills/`, with each client's config under a
reverse-DNS `extensions` namespace (`com.anthropic.claude-code`,
`com.openai.chatgpt`, `com.anthropic.claude-desktop`). The per-client manifests
are generated projections of the one canonical manifest.

**KYA-signed provenance.** The bundle carries a `com.trulioo.kya` attestation: an
Ed25519 signature over a content digest of the manifest, skills, commands, and
agent. The released bundle is signed by the **Trulioo KYA issuer** (the same
authority that signs agent identities), so its `kid` resolves in the issuer's
published JWKS. Anyone can verify who published the plugin and that it hasn't been
altered - `attest-plugin.mjs` ships at the root of the PUBLISHED package, next to
these files. (In the monorepo it lives one level up, at
`core/prism/mcp-server/plugin/attest-plugin.mjs`, so run `node ../attest-plugin.mjs`
from here; `publish-plugin-mirror.sh` copies it into the package on publish.)

```
node attest-plugin.mjs --verify            # integrity: bytes match what was signed
node attest-plugin.mjs --verify --resolve  # + provenance: kid resolves in the Trulioo JWKS
```

See `com.trulioo.kya/README.md` for the attestation model.

## For the IT administrator

Full step-by-step rollout (Claude Code + ChatGPT, with a verification checklist
and rollback): **[IT-SETUP.md](IT-SETUP.md)**. The essentials, in order:

### Prerequisite: publish the package to the private GitHub repo

Both the Claude and ChatGPT install paths pull the package from the private
`github.com/Trulioo/trulioo-mcp` repository. That repo must exist and contain
this package before any install command works - until it does,
`/plugin marketplace add Trulioo/trulioo-mcp` fails for everyone.

Publish the package to `github.com/Trulioo/trulioo-mcp` (see the file list in
[CHATGPT.md](CHATGPT.md) under "Before the administrator starts"), then pin a
release tag for the pilot instead of installing from `main`.

> The live marketplace served at
> `https://mcp.trulioo.com/plugin/.claude-plugin/marketplace.json` is also
> regenerated from this package on deploy and points at the same GitHub repo.
> Publish to GitHub first, or the public marketplace-add path breaks too.

### Roll out Claude Code

Point employees at these two commands (VPN + GitHub org access required):

```
/plugin marketplace add Trulioo/trulioo-mcp
/plugin install trulioo-mcp@trulioo
```

On the first protected tool call, Claude opens the Trulioo OAuth flow and the
employee signs in with their own account.

### Roll out ChatGPT

ChatGPT uses the same Trulioo MCP endpoint and OAuth flow through one
administrator-registered MCP connection shared with the workspace. Follow
[CHATGPT.md](CHATGPT.md) end to end - it covers enabling Developer mode,
registering the connection, binding `.app.json`, and the pilot -> all-employees
sharing sequence.

## What you get

- **MCP server `trulioo`** - the Trulioo tool surface advertised to your
  connection: KYC, KYB (sanctions and PEP screening rides along on either, via
  `include_aml=true`), and Know Your Agent. Other domains are entitlement-gated
  or behind a server flag; `tools/list` is the authority on what you have.
- **Skills** (`trulioo-onboarding`, `-kyc`, `-kyb`, `-kya`) - encode field
  structures per country, result interpretation, and safe defaults.
- **Slash commands** - guided multi-step workflows:
  `/trulioo-mcp:kyc-onboarding`, `:kyb-due-diligence`.
- **Agent `identity-orchestrator`** - picks the right tools and chains them into
  a compliant onboarding decision.

Note: **Claude Desktop** consumes the remote MCP server (add-by-URL connector);
the skills, commands, and agent are Claude Code features and don't apply there.

## Verifying the attestation

`attestation.json` (under `com.trulioo.kya/`) is a detached Ed25519 proof over a
content digest of the manifest + skills + commands + agent. Verify integrity with
just the file, or verify provenance against the live issuer JWKS:

```
node attest-plugin.mjs --verify            # integrity: bytes match what was signed
node attest-plugin.mjs --verify --resolve  # provenance: kid resolves in the Trulioo JWKS
```

## Maintenance

This package is a **generated mirror** - it is produced from the Trulioo MCP
server's sources of truth and published by CI; do not hand-edit it here. Skill
bodies, the command set, and the client-manifest projections are regenerated and
verified against the server on every release (`sync-plugin.mjs --check` gates
drift), and the KYA attestation is re-signed. Report issues to
[mcp@trulioo.com](mailto:mcp@trulioo.com).
