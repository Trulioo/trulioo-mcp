# Trulioo MCP - Claude Code and ChatGPT plugins

Identity verification for AI agents. This package connects Claude Code and
ChatGPT to the hosted **Trulioo MCP server** at
`https://mcp.trulioo.com/mcp` using the existing employee OAuth flow. No OAuth
token or client secret is stored in the package - every employee authenticates
to Trulioo as themselves on first use.

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

## Maintenance

This plugin is generated from the server's single sources of truth and kept in
lockstep by CI. Do not hand-edit `skills/*/SKILL.md`; regenerate with:

```
node core/prism/mcp-server/plugin/sync-plugin.mjs
```

The skill bodies come from `docs/site/.well-known/skills/`; the command set is
verified against the workflow prompts in `src/prompts.rs`. CI runs
`sync-plugin.mjs --check` and fails on drift.
