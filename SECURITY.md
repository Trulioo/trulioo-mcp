# Security Policy

## Reporting a vulnerability

If you discover a security issue in the Trulioo MCP Claude Code plugin or the
hosted MCP endpoints, please report it privately to **security@trulioo.com**
(and copy <mcp@trulioo.com>). Do not open a public GitHub issue for security
reports.

Please include: a description of the issue, steps to reproduce, and the impact
you observed. We will acknowledge receipt and keep you informed of remediation.

## Scope

- This plugin ships **no credentials**. The default endpoint is a no-token
  sandbox that returns synthetic data.
- Live verifications require your own Trulioo credentials over an OAuth 2.1
  bearer flow; the plugin never bundles or transmits secrets on your behalf.
- Report vulnerabilities in the hosted service (`mcp.trulioo.com`) to the same
  contact above.
