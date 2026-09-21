# `com.trulioo.kya` - KYA plugin attestation namespace

This is the reference implementation of the **KYA-attested Agent Plugin** trust
layer - a `com.trulioo.kya` reverse-DNS extension namespace under the
[Agent Plugins](https://agent-plugins.org) specification.

The Agent Plugins spec standardizes the manifest ("the box") but deliberately
defines **no trust or provenance verification**. This namespace fills that gap:
it attests *who published this plugin* and *that it has not been altered*.

## What's here

- **`attestation.json`** - the committed, verifiable attestation. Contains the
  issuer identity, a `subject_digest` sealing the plugin's manifest + skills, the
  issuer key id, and a JWS-sealed Ed25519 signature (`alg: EdDSA`, JWS JSON
  Serialization with embedded payload). The public key is not carried in the
  document: a verifier must resolve `kid` from `jwks_url`.
- **`signing-key.local.pem`** - gitignored. The local dev signing key. Production
  signing is the deployed Trulioo KYA issuer (KMS Ed25519, identity.trulioo.com),
  whose `kid` resolves in the issuer's published JWKS.

## Verify

`attest-plugin.mjs` is the verifier. It ships one level ABOVE this package, at the
repository root, so a clone can run it with no install step:

```sh
# from the repository root
node attest-plugin.mjs --verify --resolve

# from this directory
node ../../attest-plugin.mjs --verify --resolve
```

`--resolve` is not optional for a released plugin. It is what fetches the issuer's
published JWKS and checks the signing key against it; without it the run stops and
tells you to add it, because an attestation verified against a key carried in its
own file proves nothing about who published it.

Checks, fail-closed: (1) the Ed25519 signature verifies; (2) the signed payload
matches the presented claims; (3) the `subject_digest` recomputed from the plugin
on disk matches what was signed - i.e. the plugin is byte-identical to what was
attested; and (4) the signing `kid` resolves in the Trulioo issuer's published
JWKS - i.e. it was signed by the named Trulioo KYA issuer, not an arbitrary key.

## Wire format

Mirrors the Trulioo KYA attestation stack: RFC 8785 (JCS) canonicalization,
Ed25519 signatures, and issuer resolution via the published JWKS - the same
authority + resolution model that backs agent attestations
(`GET /kya/attestation/{fingerprint}` on `identity.trulioo.com`). The
`subject_digest` is a sha256 over the JCS form of a `{file: sha256}` map, so it is
order- and formatting-independent.

Provenance resolves through the issuer JWKS (`--verify --resolve`), not a
hosted-copy URL - the released bundle carries no static attestation host.
