# Contributing

Thanks for reading this first - it will save you a wasted pull request.

## This repository is a generated mirror

Everything here is published output - including this file. `trulioo-mcp/`,
`attest-plugin.mjs`, `README.md`, `server.json`, `AGENTS.md`, `CONTRIBUTING.md`,
`SECURITY.md`, and the marketplace
catalogs are produced from Trulioo's MCP server repository and pushed by CI on each
release.

**Pull requests against those paths cannot be merged.** The next release overwrites
them, and in the meantime an edit invalidates the KYA attestation that seals the
payload - so a well-intentioned typo fix turns a verifiable bundle into one that
fails `--verify`.

## What to do instead

**Found a bug, a wrong instruction, or a stale claim?** Open an issue. The most
useful report names the file and quotes the line, because that maps directly onto
the generated source behind it. If a skill told an agent something that produced a
wrong answer, include what the agent concluded - that is the part we cannot
reconstruct.

**Want a capability, country, or workflow the plugin does not cover?** Open an
issue describing the decision you are trying to make, not the tool you think you
need. The tool surface is driven by what the server advertises, and the useful
change is often a skill that reads an existing result correctly rather than a new
endpoint.

**Found a security issue?** Do not open an issue. Read [SECURITY.md](SECURITY.md).

**Need credentials, a package, or an entitlement?** That is an account matter:
<mcp@trulioo.com>.

## Verifying a release yourself

You do not need to trust this repository's contents to check them:

```sh
node attest-plugin.mjs --verify --resolve
node --test
```

Both run from the repository root. `node --test` takes no path on purpose: it finds
`trulioo-mcp/tests/*.test.mjs` by itself, and passing the directory instead
(`node --test trulioo-mcp/tests/`) is rejected by Node 26.

Node 18 or newer; no dependencies to install. The first command fails closed unless
the bytes match what was signed and the signing key resolves in Trulioo's published
JWKS. If it prints `ATTESTATION INVALID` on a released tag, that is worth an issue -
or a security report, if you think you know why.

## Reporting a documentation defect well

The plugin's skills are instructions a model follows without a person reading them
first, so a wrong sentence is a wrong answer at scale. When you report one, the
three things we need are:

1. The file and the sentence.
2. What an agent did because of it.
3. What the correct behavior would have been.

That is enough to fix the generated source and to add a test so it cannot come
back.
