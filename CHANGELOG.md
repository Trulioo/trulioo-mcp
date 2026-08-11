# Changelog - trulioo-mcp

## v0.3.1

    trulioo-mcp v0.3.1
    
    Portable Agent Plugin (agent-plugins.org 1.0.0) for Trulioo identity
    verification - KYC, KYB, AML, document verification, age assurance, business
    monitoring - over the hosted Trulioo MCP server, with a KYA-signed attestation.
    
    KYA attestation:
      issuer         Trulioo (kya:trulioo:plugin-issuer)
      kid            trulioo-attestation-1
      mode           issuer-signed (kid resolves in the issuer JWKS)
      subject_digest sha256:89e6d7c10f841e37071f38e9285552e926c04445bdb585886bf4cda07d45c75e
      sealed files   15 (manifest + mcp + skills + commands + agent)
    
    Verify:  node attest-plugin.mjs --verify --resolve
    Install: /plugin marketplace add Trulioo/trulioo-mcp  ->  /plugin install trulioo-mcp@trulioo

