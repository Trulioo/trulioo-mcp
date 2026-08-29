# Trulioo MCP - IT administrator setup guide

Step-by-step rollout of the Trulioo MCP plugin to employees on **Claude Code**
and **ChatGPT**. Both clients talk to the same hosted server
(`https://mcp.trulioo.com/mcp`) and the same employee OAuth flow. Nobody shares
a token: every employee signs in to Trulioo as themselves on first use.

Do the phases in order. Phase 0 is a one-time prerequisite that unblocks both
clients. Phase 1 (Claude Code) and Phase 2 (ChatGPT) are independent after that
- run whichever your workspace needs.

---

## What you are distributing

- **One MCP server**, `https://mcp.trulioo.com/mcp`, protected by OAuth 2.1
  (authorization code + PKCE). It exposes the full Trulioo tool surface: KYC,
  KYB, AML screening, document verification (DocV), age assurance, and business
  monitoring.
- **One package** in the repo `github.com/Trulioo/trulioo-mcp`, published by the
  rel- tag pipeline (issuer-signed, `v<version>` tagged). The package holds no
  secret - it points clients at the server and (for Claude) bundles skills,
  workflow commands, and the `identity-orchestrator` agent.

You are NOT distributing credentials. Installation contains no OAuth token and
no client secret.

> Repo visibility: this runbook covers the **internal employee rollout**, where the
> repo is PRIVATE and employees install with GitHub org read access (+ VPN). For
> **public/external** installs (`/plugin marketplace add Trulioo/trulioo-mcp` from
> any machine, no org access), the mirror must be made PUBLIC - a URL-based
> marketplace only fetches `marketplace.json`, so the payload has to live in a repo
> the installing client can clone (DISTRIBUTION.md).

---

## Phase 0 - Prerequisite (one time, unblocks everything)

Both the Claude and ChatGPT install paths pull the package from
`github.com/Trulioo/trulioo-mcp`. Until the package is published there at the
version you want, `/plugin marketplace add Trulioo/trulioo-mcp` fails for
everyone.

1. Confirm the private repo `github.com/Trulioo/trulioo-mcp` exists and contains
   the `0.4.1` package. The published root must contain:

   ```
   .claude-plugin/marketplace.json     # Claude Code catalog
   .agents/plugins/marketplace.json    # ChatGPT (Codex) catalog
   trulioo-mcp/                         # the payload
     .claude-plugin/plugin.json
     .codex-plugin/plugin.json
     .mcp.json                          # url = https://mcp.trulioo.com/mcp
     .app.json                          # empty until you bind ChatGPT (Phase 2)
     .app.json.example
     CHATGPT.md
     skills/ commands/ agents/
   ```

2. Verify the marketplace `source` points at GitHub (not the internal GitLab
   monorepo) and the version is `0.4.1`:

   ```
   source: git-subdir
   url:    https://github.com/Trulioo/trulioo-mcp.git
   path:   trulioo-mcp
   ref:    v0.4.1
   ```

3. Pin a release tag (`v0.4.1`) for the pilot so installs are reproducible.
   Install from the tag, not from `main`, during a controlled rollout.

4. Grant the pilot group **read access** to the private GitHub org/repo. Claude
   Code installs by cloning the repo, so employees need GitHub org access (and
   corporate VPN) to install. ChatGPT employees do **not** need GitHub access -
   only the administrator does.

> Do not merge/deploy the monorepo change that repoints the public marketplace
> at GitHub before this repo is published, or the `mcp.trulioo.com` marketplace
> add path breaks too.

---

## Phase 1 - Claude Code rollout

### 1.1 Verify the endpoint (administrator)

Run this **on the corporate VPN**. Bare `/mcp` is not in the WAF's public carve-out
(only `/demo`, `/mock/mcp`, `/sandbox/mcp`, and the docs paths are), so off-VPN you
get a WAF `401` with no `www-authenticate` - which is the exact ambiguity the header
check below exists to resolve.

```
curl -s -D - -o /dev/null -X POST https://mcp.trulioo.com/mcp \
  -H 'content-type: application/json' -d '{}' | grep -i '^HTTP/\|^www-authenticate'
```

Expect exactly this (verified 2026-08-16):

```
HTTP/2 401
www-authenticate: Bearer resource_metadata="https://mcp.trulioo.com/.well-known/oauth-protected-resource/mcp"
```

That is the RFC 9728 OAuth challenge - the server is up and protected. Print the
header rather than just the status code: a bare `401` is **not** sufficient
evidence of OAuth, because the corp-VPN WAF in front of this distribution also
blocks with a custom `401` response (`platform/infra/prism-docs-site/waf.tf`,
rule `corp-vpn-only-except-public-trial-paths`). The two are only
distinguishable by the presence of `www-authenticate`. Confirm the challenge
resolves - this is the URL the client will fetch next:

```
curl -s https://mcp.trulioo.com/.well-known/oauth-protected-resource/mcp
# {"authorization_servers":["https://mcp.trulioo.com"],"bearer_methods_supported":["header"],
#  "resource":"https://mcp.trulioo.com/mcp","scopes_supported":["verify","read"]}
```

> Known wart, not a blocker: the **bare** `/.well-known/oauth-protected-resource`
> (no `/mcp` suffix) returns the docs-site HTML shell with `200`, not metadata and
> not the truthful `404` JSON its edge function is supposed to emit. Spec clients
> follow the resource-specific URL from `www-authenticate` and are unaffected;
> a client that probes only the bare path will choke on HTML.
>
> The cause is IaC drift, and it matters beyond the wart. The checked-in edge
> function (`platform/infra/prism-docs-site/cloudfront.tf`) both emits that `404`
> JSON **and** rewrites `/mcp` -> `/sandbox/mcp` (the open, no-token sandbox). Live,
> neither is true: the bare well-known serves HTML and `/mcp` answers a real OAuth
> challenge. So the DEPLOYED function is not the one in that file - the distribution
> was CLI-managed. **Do not blind-apply `prism-docs-site` against zenith**: it would
> re-point the documented `/mcp` at the credential-free sandbox and remove the OAuth
> protection this whole runbook depends on. Reconcile the file to deployed reality
> first.

### 1.2 Install on a pilot machine

On a machine with corporate VPN and GitHub org access:

```
/plugin marketplace add Trulioo/trulioo-mcp
/plugin install trulioo-mcp@trulioo
```

To pin the pilot to the release tag instead of `main`, add the marketplace from
the tagged ref per your Claude Code version's marketplace syntax.

### 1.3 First-run authentication

1. Start a chat with the `trulioo-mcp` plugin enabled.
2. Invoke one protected tool (e.g. ask to "verify a person's identity with
   Trulioo").
3. Claude opens the Trulioo OAuth flow. Sign in with your employee account.
4. Confirm the tool returns a result. Claude stores your token and reuses it on
   later Trulioo calls.

### 1.4 Roll out to employees

Publish these two commands plus the prerequisites (VPN on, GitHub org access):

```
/plugin marketplace add Trulioo/trulioo-mcp
/plugin install trulioo-mcp@trulioo
```

Each employee completes their own OAuth flow on first protected call. Identities
and tokens are per user.

---

## Phase 2 - ChatGPT rollout

The full detail lives in [CHATGPT.md](CHATGPT.md). This is the sequence:

### 2.1 Enable workspace features

1. In the ChatGPT workspace policy, allow **Developer mode** for the
   administrator or pilot group.
2. Allow private plugin sharing inside the workspace.
3. Allow the pilot group to use the Trulioo MCP connector.
4. The administrator opens **Settings > Security and login** and enables
   **Developer mode**. If the switch is greyed out, workspace policy is still
   blocking private MCP connections - fix step 1 first.

### 2.2 Register the Trulioo MCP connection

1. Open <https://chatgpt.com/plugins> and select the plus button.
2. Create an MCP connection:
   - Name: `Trulioo MCP`
   - Description: `Trulioo identity and business verification`
   - MCP server URL: `https://mcp.trulioo.com/mcp`
3. Create it and review the discovered Trulioo tools.
4. Copy the connection's technical ID from its ChatGPT URL. It starts with
   `plugin_asdk_app`.

### 2.3 Bind the package to the connection

1. In the GitHub package, copy `.app.json.example` to `.app.json` and replace
   the placeholder with the technical ID from 2.2.
2. Commit `.app.json` to the private GitHub repo. The connection ID is package
   metadata, **not** an OAuth token or secret.
3. Tag/pin the package version used for the pilot.

### 2.4 Install and authenticate (administrator)

```
codex plugin marketplace add Trulioo/trulioo-mcp --ref v0.4.1
```

1. Restart the ChatGPT desktop app.
2. Open **Plugins**, select the `Trulioo` marketplace source, install
   `Trulioo MCP`.
3. Start a new chat with the plugin enabled and invoke one protected tool.
4. Complete the Trulioo OAuth flow with your employee account and confirm the
   tool succeeds.

### 2.5 Share with employees

1. **Plugins > Created by you**, open `Trulioo MCP`, select **Share**.
2. Share with the **pilot group** first; make the plugin and connector available
   to that group in workspace controls.
3. Each pilot installs from **Plugins > Shared with you** and completes their own
   OAuth flow.
4. After the pilot passes, share the same plugin with the **all-employees**
   group and make the connector available to them.
5. Employees install from **Shared with you** and authenticate individually.

---

## Verification checklist

Run these before declaring the rollout done.

- [ ] On corp VPN, `POST https://mcp.trulioo.com/mcp` returns `401` **and** a
      `www-authenticate: Bearer resource_metadata=...` header (endpoint up and
      protected). The status alone is not sufficient - the WAF also answers `401`.
- [ ] The `resource_metadata` URL from that header returns the JSON in step 1.1.
- [ ] `github.com/Trulioo/trulioo-mcp` is published at `0.4.1` with the layout
      above; marketplace `source` is the GitHub repo, not GitLab.
- [ ] Claude Code: `/plugin install trulioo-mcp@trulioo` succeeds on a machine
      with VPN + GitHub access; first protected call opens Trulioo OAuth and
      returns a result.
- [ ] ChatGPT: a pilot user and the administrator produce **distinct**
      authenticated identities and tokens (no shared token).
- [ ] A user outside the shared Trulioo workspace **cannot** install the ChatGPT
      plugin.
- [ ] No OAuth token or client secret appears anywhere in the published package
      (`.app.json` holds only the connection ID, or is empty).

---

## Rollback

- **Claude Code:** `/plugin uninstall trulioo-mcp@trulioo` and remove the
  marketplace. Or pin the marketplace `ref` back to the previous tag.
- **ChatGPT:** unshare the plugin from the affected group in workspace controls;
  optionally delete the MCP connection. Employee tokens are per user and expire
  on their own; revoke at the Trulioo OAuth layer if needed.
- The server endpoint is unchanged by any rollback - it stays protected either
  way.

## Support

Endpoint, OAuth, or package issues: <mcp@trulioo.com>. The package is a generated
mirror of the Trulioo MCP server sources of truth; do not hand-edit the published
repo - it is overwritten on the next publish.
