# Trulioo MCP - ChatGPT administrator runbook

This package adds ChatGPT support without changing the Trulioo MCP service,
OAuth configuration, or Claude plugin behavior. The workspace shares the
plugin definition, not a Trulioo account or access token. Each employee
authenticates to Trulioo as themselves.

Use these names consistently:

- Marketplace and publisher: `Trulioo`
- Plugin and MCP connection: `Trulioo MCP`
- MCP server URL: `https://mcp.trulioo.com/mcp`

## Authentication model

- The administrator registers one Trulioo MCP connection and shares its plugin
  definition with the Trulioo workspace.
- Installation does not contain an OAuth token, client secret, or shared
  employee identity.
- On the first protected tool call, ChatGPT starts Trulioo's authorization-code
  and PKCE flow for that employee.
- ChatGPT stores and sends that employee's access token on later Trulioo calls.
- Trulioo continues to validate the token's issuer, audience, expiration, and
  scopes for every request.

## Before the administrator starts

Publish the plugin package to the private
`github.com/Trulioo/trulioo-mcp` repository used for distribution.

The GitHub package must contain:

```
.agents/plugins/marketplace.json
trulioo-mcp/.app.json
trulioo-mcp/.codex-plugin/plugin.json
```

The marketplace entry must use `./trulioo-mcp` as its `source.path`.

GitHub access is required only for administrators and maintainers installing
or updating the package. Employees install the shared plugin from ChatGPT and
do not need GitHub access.

## Administrator setup

### 1. Enable workspace features

1. In the Trulioo ChatGPT workspace policy, allow Developer mode for the
   administrator or pilot group.
2. Allow private plugin sharing inside the workspace.
3. Allow the pilot group to use the Trulioo MCP connector in the workspace
   app and connector controls.
4. The test administrator opens **Settings > Security and login** and enables
   **Developer mode**.

If the Developer mode switch is disabled, the workspace policy is still
blocking private MCP connection creation.

### 2. Register the Trulioo MCP connection

1. Open <https://chatgpt.com/plugins> and select the plus button.
2. Create an MCP connection with:

   - Name: `Trulioo MCP`
   - Description: `Trulioo identity and business verification`
   - MCP server URL: `https://mcp.trulioo.com/mcp`

3. Create the connection and review the Trulioo tools discovered by ChatGPT.
4. Copy the connection's technical ID from its ChatGPT URL. The ID starts with
   `plugin_asdk_app`.

### 3. Bind the package to the connection

1. Replace `.app.json` with the contents of `.app.json.example`, then replace
   the placeholder with that technical ID.
2. Commit `.app.json` to the private GitHub package repository. The connection
   ID is package metadata, not an OAuth token or client secret.
3. Tag or pin the package version used for the pilot.

### 4. Install the package from GitHub

On the test administrator's machine, authenticate Git for the private Trulioo
GitHub organization, then add the marketplace:

```
codex plugin marketplace add Trulioo/trulioo-mcp --ref main
```

Use a release tag instead of `main` after the pilot is stable.

1. Restart the ChatGPT desktop app.
2. Open **Plugins** and select the `Trulioo` marketplace source.
3. Install `Trulioo MCP`.
4. Start a new conversation and enable `Trulioo MCP`.
5. Invoke one protected tool.
6. Complete the Trulioo OAuth flow using the administrator's employee account.
7. Confirm the tool succeeds.

The generated `.app.json` contains a workspace-specific connection identifier,
not an OAuth secret. Commit it when the connection is intended to be the
shared Trulioo connection for this package.

### 5. Share with employees

1. In the ChatGPT desktop app, open **Plugins > Created by you**.
2. Open `Trulioo MCP` and select **Share**.
3. Share it with a pilot group first.
4. In the ChatGPT admin workspace settings, make the plugin and its Trulioo
   MCP connector available to the pilot group.
5. Each pilot installs the plugin and completes their own OAuth flow on first
   use.
6. After the pilot passes, share the same plugin with the Trulioo
   all-employees group.
7. Make the plugin and connector available to the all-employees group in the
   workspace controls.
8. Employees find it under **Plugins > Shared with you**, install it, and
   authenticate individually.

## Employee experience

1. Open **Plugins > Shared with you**.
2. Install `Trulioo MCP`.
3. Start a chat with the plugin enabled.
4. On the first protected tool call, complete the Trulioo OAuth flow.
5. ChatGPT stores that employee's token and sends it on later Trulioo calls.

The plugin definition and MCP connection are shared. Employee identities,
consent, access tokens, and Trulioo authorization remain per user.

## Package layout

```
trulioo-mcp/
  .app.json
  .claude-plugin/plugin.json
  .codex-plugin/plugin.json
  .mcp.json
```

- `.claude-plugin/plugin.json` and `.mcp.json` define the Claude package.
- `.codex-plugin/plugin.json` defines the ChatGPT plugin.
- `.app.json` maps the ChatGPT package to the administrator-registered Trulioo
  MCP connection.

The ChatGPT manifest packages only the MCP connection. It does not load the
existing `skills/`, `commands/`, or `agents/` directories, so Claude-specific
workflows remain isolated.

## Verification

- Installation prompts the employee to complete the existing Trulioo OAuth
  flow.
- Authentication returns the employee to ChatGPT without manual token entry.
- ChatGPT discovers tools from `https://mcp.trulioo.com/mcp`.
- A direct KYC, KYB, or AML request selects the expected Trulioo tool.
- Two pilot users produce distinct authenticated identities and access tokens.
- A user outside the shared Trulioo workspace cannot install the plugin.
