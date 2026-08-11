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
  signing is the deployed KYA issuer (Halo, KMS Ed25519, identity.trulioo.com).

## Verify

From the source repo (the signer/verifier script lives at the plugin root):

```
# from core/prism/mcp-server/plugin/
node attest-plugin.mjs --verify
```

If you downloaded the hosted copy from <https://lumina.trulioo.com/plugin/>, the
script is not part of the payload - verify against the self-contained
`bundle.json` (each file's bytes + sha256 are embedded) or re-run the four checks
from the source repo above.

Checks, fail-closed: (1) the `kid` is the RFC 7638 thumbprint of the embedded
key; (2) the Ed25519 signature verifies; (3) the signed payload matches the
presented claims; (4) the `subject_digest` recomputed from the plugin on disk
matches what was signed - i.e. the plugin is byte-identical to what was attested.

## Wire format

Mirrors the KYA attestation stack in `core/prism/mcp-server/src/tools/kya.rs`:
RFC 8785 (JCS) canonicalization, RFC 7638 JWK thumbprint as `kid`, Ed25519
signatures. The `subject_digest` is a sha256 over the JCS form of a
`{file: sha256}` map, so it is order- and formatting-independent.

Public attestation page: <https://lumina.trulioo.com/plugin/>
