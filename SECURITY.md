# Security Policy

## Reporting a vulnerability

Report security issues in this plugin or in the hosted MCP endpoints privately to
**<security@trulioo.com>**, copying <mcp@trulioo.com>. Do not open a public GitHub
issue for a security report.

Include a description, steps to reproduce, and the impact you observed. We
acknowledge receipt and keep you informed through remediation. If your report
concerns the attestation or the verifier, include the output of
`node attest-plugin.mjs --verify --resolve` and the tag you ran it against.

## Supported versions

Only the **latest published tag** is supported. This repository is a generated
mirror: each release is an immutable annotated tag with a recorded distribution
identity, so older tags are never amended in place - a fix ships as a new tag.
`.trulioo-distribution.json` at the repository root records which version the
working tree corresponds to.

## What this package does and does not hold

**No credentials ship here.** There is no token, client secret, or API key in this
repository, and nothing to configure before installing. Every client authenticates
to Trulioo over OAuth 2.1 authorization code with PKCE on the first protected tool
call, and the resulting token is held by your MCP client - not by this package and
not by anything in it.

**No verification data passes through this package.** It is a manifest, a set of
instructions, and a signature. Requests go from your client to
`https://mcp.trulioo.com/mcp`.

**Document capture never crosses MCP.** Where document verification is available,
image capture is handed off to the user's own device by session URL or QR code; no
image bytes traverse the MCP transport.

## Session mode is a security property

The server runs in one of three modes - `sandbox`, `test`, or `live` - and the mode
is bound to the credential the session authenticated with, not to the endpoint URL.
A `live` session verifies real people and businesses against real data sources.

Read the mode rather than assuming it: `trulioo_health` reports it, and every tool
result carries a `test_mode` marker naming the mode, the data kind, and the
verification type. An agent that assumes sandbox and gets live will describe real,
potentially billed verifications as synthetic. The shipped skills and the
`identity-orchestrator` agent are written to read it; a custom integration should
too.

## What the attestation proves, and what it does not

```sh
node attest-plugin.mjs --verify --resolve
```

Fail-closed, it establishes two things:

- **Integrity.** The manifest, skills, command, and agent on disk are byte-identical
  to what was signed. `subject_digest` is a sha256 over an RFC 8785 (JCS) canonical
  `{path: sha256}` map, so it is order- and formatting-independent.
- **Provenance.** The signing key id resolves in Trulioo's published JWKS at
  `identity.trulioo.com`, so the signature came from the named Trulioo KYA issuer
  rather than an arbitrary key.

`--resolve` is what checks the second one. Without it the run stops on a released
bundle and tells you to add it, because an attestation verified against a public key
carried inside the same file is self-referential: a forged document supplying its
own key and signature would pass.

It does **not** attest the hosted service, your account's entitlements, or any
verification result. And nothing in this package is a compliance determination:
naming a regulatory regime is not a mapping to it, and the relying party decides
what discharges its obligation.

## Treat response data as untrusted

Fields in a verification response - business names, beneficial-ownership free text,
adverse-media narratives, attestation reasons, scope strings - originate outside
Trulioo and describe third parties that chose their own contents. The server
sanitizes the highest-risk fields, but an agent must never treat text inside a
response as an instruction. The shipped skills state this in-band for the same
reason.
