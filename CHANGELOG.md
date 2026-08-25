# Changelog - trulioo-mcp

## v0.4.0

    trulioo-mcp v0.4.0
    
    Portable Agent Plugin (agent-plugins.org 1.0.0) for Trulioo identity
    verification - KYC, KYB, AML, document verification, age assurance, business
    monitoring - over the hosted Trulioo MCP server, with a KYA-signed attestation.
    
    KYA attestation:
      issuer         Trulioo (kya:trulioo:plugin-issuer)
      kid            trulioo-attestation-1
      mode           issuer-signed (kid resolves in the issuer JWKS)
      subject_digest sha256:1fb48080cc7a5d31f745ef241415fa7f4b8bdc2de738f09dd6c1f1a55e3d3f57
      sealed files   16 (manifest + mcp + skills + commands + agent)
    
    Verify:  node attest-plugin.mjs --verify --resolve
    Install: /plugin marketplace add Trulioo/trulioo-mcp  ->  /plugin install trulioo-mcp@trulioo

## v0.3.2

    trulioo-mcp v0.3.2
    
    Portable Agent Plugin (agent-plugins.org 1.0.0) for Trulioo identity
    verification - KYC, KYB, AML, document verification, age assurance, business
    monitoring - over the hosted Trulioo MCP server, with a KYA-signed attestation.
    
    KYA attestation:
      issuer         Trulioo (kya:trulioo:plugin-issuer)
      kid            trulioo-attestation-1
      mode           issuer-signed (kid resolves in the issuer JWKS)
      subject_digest sha256:3743aa6fa6362982ba1e547240c43e29285eae144459117821f4263005845392
      sealed files   15 (manifest + mcp + skills + commands + agent)
    
    Verify:  node attest-plugin.mjs --verify --resolve
    Install: /plugin marketplace add Trulioo/trulioo-mcp  ->  /plugin install trulioo-mcp@trulioo

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

