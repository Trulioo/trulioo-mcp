# `com.trulioo.kya` - KYA plugin attestation namespace

This is the reference implementation of the **KYA-attested Agent Plugin** trust
layer (ADR-P-029) - a `com.trulioo.kya` reverse-DNS extension namespace under the
[Agent Plugins](https://agent-plugins.org) specification.

The Agent Plugins spec standardizes the manifest ("the box") but deliberately
defines **no trust or provenance verification**. This namespace fills that gap:
it attests *who published this plugin* and *that it has not been altered*.

## What's here

- **`attestation.json`** - the committed, verifiable attestation. Contains the
  issuer identity, a `subject_digest` sealing the plugin's manifest + skills, the
  signer's public JWK, and a JWS-sealed Ed25519 signature (`alg: EdDSA`, JWS JSON
  Serialization with embedded payload). Everything a
  verifier needs; safe to publish.
- **`signing-key.local.pem`** - gitignored. The local dev signing key. Production
  signing is the deployed Trulioo KYA issuer (KMS Ed25519, identity.trulioo.com),
  whose `kid` resolves in the issuer's published JWKS.

## Verify

From the source repo (the signer/verifier script lives at the plugin root):

```
# from the plugin root (where attest-plugin.mjs lives in the PUBLISHED package;
# in the monorepo it is one level up - use `node ../../attest-plugin.mjs` from here)
node attest-plugin.mjs --verify            # integrity
node attest-plugin.mjs --verify --resolve  # + issuer provenance (kid in the JWKS)
```

`attest-plugin.mjs` ships at the repo root next to this package, so a clone can
run the verify commands directly.

Checks, fail-closed: (1) the Ed25519 signature verifies; (2) the signed payload
matches the presented claims; (3) the `subject_digest` recomputed from the plugin
on disk matches what was signed - i.e. the plugin is byte-identical to what was
attested; and, with `--resolve`, (4) the signing `kid` resolves in the Trulioo
issuer's published JWKS - i.e. it was signed by the named Trulioo KYA issuer, not
an arbitrary key.

## Wire format

Mirrors the Trulioo KYA attestation stack: RFC 8785 (JCS) canonicalization,
Ed25519 signatures, and issuer resolution via the published JWKS - the same
authority + resolution model that backs agent attestations
(`GET /kya/attestation/{fingerprint}` on `identity.trulioo.com`). The
`subject_digest` is a sha256 over the JCS form of a `{file: sha256}` map, so it is
order- and formatting-independent.

Provenance resolves through the issuer JWKS (`--verify --resolve`), not a
hosted-copy URL - the released bundle carries no static attestation host.
