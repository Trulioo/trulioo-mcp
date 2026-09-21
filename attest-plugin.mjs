#!/usr/bin/env node
// KYA-attested Agent Plugin - reference implementation of the `com.trulioo.kya`
// extension namespace. Signs the trulioo-mcp plugin with a JWS-sealed Ed25519
// attestation so any consumer can verify:
//
//   1. PROVENANCE - the plugin was published by a named Trulioo KYA issuer.
//   2. INTEGRITY  - the plugin's manifest + skills have not been altered since
//                   signing (a content digest over the canonical bytes).
//
// This is the Agent Plugins spec's deliberately-unspecified trust layer: the
// spec standardizes the manifest ("the box"); KYA attests who packed the box and
// that it is sealed. The attestation is additive and spec-conformant - it lives
// under the reverse-DNS namespace `com.trulioo.kya/` and in a pointer under
// plugin.json `extensions["com.trulioo.kya"]`. Clients that don't implement it
// ignore it; clients that do can gate on it.
//
// Wire format mirrors the KYA attestations the Trulioo issuer mints for agents:
//   - subject digest: sha256 over an RFC 8785 (JCS) canonical listing of every
//     attested file's sha256 - a name-independent, order-independent content seal.
//   - signature: JWS JSON Serialization (RFC 7515 §7.2), alg EdDSA (Ed25519), with
//     the base64url payload (attestation claims) EMBEDDED - not RFC 7797 detached.
//   - issuer key id (kid): RFC 7638 JWK thumbprint of the public key.
//
// Public-key model: only the PUBLIC key + attestation are committed and are all a
// verifier needs. Signing requires the separately-held private key (a maintainer/
// KMS action) and is never committed.
//
// Usage:
//   node attest-plugin.mjs --verify --resolve   # verify provenance + integrity
//   node attest-plugin.mjs --verify             # integrity only, no network
//   node attest-plugin.mjs --sign               # maintainers: (re)sign a version
//
// `--resolve` fetches the issuer's published JWKS and checks the signing key id
// against it. A released plugin is issuer-signed, so `--resolve` is the check that
// answers "did Trulioo publish this?"; a bare `--verify` on an issuer-signed
// attestation stops early and tells you to add it.
//
// Private key resolution for --sign, in order:
//   1. $TRULIOO_KYA_PLUGIN_KEY - a PEM PKCS#8 Ed25519 private key.
//   2. trulioo-mcp/com.trulioo.kya/signing-key.local.pem - a gitignored local key;
//      generated on first --sign if absent (dev convenience).
// The PRODUCTION signer is Trulioo's KYA issuer at identity.trulioo.com, holding
// its Ed25519 key in a KMS; this script is the portable reference + local signer.
import { createHash, generateKeyPairSync, sign as edSign, verify as edVerify,
         createPublicKey, createPrivateKey } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLUGIN = join(HERE, "trulioo-mcp");
const KYA_DIR = join(PLUGIN, "com.trulioo.kya");
const ATTESTATION = join(KYA_DIR, "attestation.json");
const KEY_PEM = join(KYA_DIR, "signing-key.local.pem");

// The KYA issuer identity embedded in the signed claims. NO hosted-copy pointer:
// provenance follows the KYA resolution standard - `--verify --resolve` checks the
// signing `kid` against the issuer's published JWKS at `issuer_uri` (the same
// authority + JWKS that back agent attestations, GET /kya/attestation/{fp}). A
// static `attestation_url` would be a redundant pointer AND was the last place an
// internal host/codename leaked into the sealed bundle.
const ISSUER = {
  name: "Trulioo",
  issuer_id: "kya:trulioo:plugin-issuer",
  issuer_uri: "https://identity.trulioo.com",
};

// Production signing target: the KYA issuer's artifact-attestation endpoint. When
// set, --sign mints the attestation THROUGH the issuer as the Trulioo account
// (dogfood) instead of with the local dev key, so the resulting `kid` resolves in
// the issuer's published JWKS. Maintainers only - a consumer never needs these.
//   KYA_ARTIFACT_ATTEST_URL   - the artifact-attestation endpoint
//   KYA_ISSUER_DEV_ID         - the signing account's developer credential id
//   KYA_ISSUER_DEV_SECRET     - its secret, presented as x-developer-secret
//   KYA_ISSUER_TENANT_HEADER  - optional tenant override for a non-production issuer
// The issuer's own auth and tenant gate is the authority; this script only presents
// the credential.
const ARTIFACT_ATTEST_URL = process.env.KYA_ARTIFACT_ATTEST_URL || null;
// Where a verifier fetches the issuer's public keys to resolve a production kid.
const JWKS_URL = process.env.KYA_JWKS_URL
  || "https://identity.trulioo.com/.well-known/jwks.json";
const ARTIFACT_TYP = "kya-artifact-attestation+jws";

// Installable client projections. They are derived, but they are also the bytes
// clients execute or import. A deterministic transform is useful development
// evidence; an issuer seal over the output bytes is the release guarantee.
const INSTALLABLE_PROJECTIONS = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".mcp.json",
  ".app.json.example",
];
// `.app.json` contains a workspace-owned ChatGPT connection id. The publisher
// cannot pre-sign customer-local binding bytes without either freezing the wrong
// id or teaching customers to break the publisher seal. Seal the distributable
// template above; installation assurance will bind the realized `.app.json`
// separately to the workspace and template digest.
const LOCAL_BINDING_PROJECTIONS = [".app.json"];

// Files whose bytes are sealed by a NEW attestation: canonical manifests, every
// hand-authored instruction, and every installable client projection. Existing
// issuer attestations created before projection sealing remain verifiable, but
// `--require-projections-sealed` refuses them until the next issuer-backed sign.
function attestedFiles(includeProjections = true) {
  const files = ["plugin.json", "mcp.json"];
  const rel = (p) => relative(PLUGIN, p).split("\\").join("/"); // POSIX keys cross-platform
  // skills/<name>/SKILL.md
  const skillsRoot = join(PLUGIN, "skills");
  if (existsSync(skillsRoot)) {
    for (const name of readdirSync(skillsRoot).sort()) {
      const skillMd = join(skillsRoot, name, "SKILL.md");
      if (existsSync(skillMd) && statSync(skillMd).isFile()) files.push(rel(skillMd));
    }
  }
  // commands/*.md and agents/*.md - flat dirs of hand-authored .md bodies.
  for (const dir of ["commands", "agents"]) {
    const root = join(PLUGIN, dir);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root).sort()) {
      if (!name.endsWith(".md")) continue;
      const md = join(root, name);
      if (statSync(md).isFile()) files.push(rel(md));
    }
  }
  if (includeProjections) {
    for (const projection of INSTALLABLE_PROJECTIONS) {
      const path = join(PLUGIN, projection);
      if (!existsSync(path) || !statSync(path).isFile()) {
        fail(`installable projection is missing: ${projection} (run sync-plugin.mjs)`);
      }
      files.push(projection);
    }
  }
  return files;
}

const sha256hex = (buf) => createHash("sha256").update(buf).digest("hex");
const b64url = (buf) => Buffer.from(buf).toString("base64url");

// RFC 8785 (JCS): canonical JSON - object keys sorted lexicographically, no
// insignificant whitespace. Enough for our value shapes (strings/objects/arrays).
function jcs(value) {
  if (Array.isArray(value)) return "[" + value.map(jcs).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(
      (k) => JSON.stringify(k) + ":" + jcs(value[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

// The subject: a per-file content digest map, then a single digest over its JCS
// form. Order- and formatting-independent; any byte change flips subject_digest.
function computeSubject(paths = attestedFiles()) {
  const files = {};
  for (const rel of paths) {
    // Restrict sealed paths to printable ASCII so the JCS key ordering is identical
    // in JS (UTF-16 sort) and in the issuer's Rust implementation (UTF-8 byte
    // order); they only diverge for supplementary-plane (U+10000+) codepoints,
    // which ASCII excludes. The issuer enforces the same restriction.
    // eslint-disable-next-line no-control-regex
    if (!/^[\x20-\x7E]+$/.test(rel)) {
      fail(`sealed path '${rel}' must be printable ASCII (JCS cross-language determinism)`);
    }
    files[rel] = "sha256:" + sha256hex(readFileSync(join(PLUGIN, rel)));
  }
  const subject_digest = "sha256:" + sha256hex(Buffer.from(jcs(files), "utf8"));
  return { files, subject_digest };
}

// RFC 7638 JWK thumbprint for an Ed25519 public key (kid).
function ed25519Jwk(publicKey) {
  const raw = publicKey.export({ format: "jwk" }); // { kty:"OKP", crv:"Ed25519", x }
  return { kty: raw.kty, crv: raw.crv, x: raw.x };
}
function jwkThumbprint(jwk) {
  // RFC 7638: JCS over the required members only, in lexicographic order.
  const canonical = `{"crv":"${jwk.crv}","kty":"${jwk.kty}","x":"${jwk.x}"}`;
  return b64url(createHash("sha256").update(canonical).digest());
}

// JWS in JSON Serialization (RFC 7515 §7.2), single signature. Returns
// { protected, payload, signature } - the base64url payload is EMBEDDED alongside
// the header and signature (a self-contained JWS, NOT the RFC 7797 payload-absent
// "detached" form). Signed input is `${protectedB64}.${payloadB64}` per RFC 7515.
function signJws(protectedHeader, payloadObj, privateKey) {
  const p = b64url(JSON.stringify(protectedHeader));
  const pl = b64url(JSON.stringify(payloadObj));
  const signature = b64url(edSign(null, Buffer.from(`${p}.${pl}`, "utf8"), privateKey));
  return { protected: p, payload: pl, signature };
}

function loadOrCreatePrivateKey() {
  if (process.env.TRULIOO_KYA_PLUGIN_KEY) {
    return createPrivateKey(process.env.TRULIOO_KYA_PLUGIN_KEY);
  }
  if (existsSync(KEY_PEM)) return createPrivateKey(readFileSync(KEY_PEM, "utf8"));
  // Dev convenience: mint a local, gitignored key on first sign. 0o600 so the
  // private key is owner-only (default umask would leave it world-readable).
  const { privateKey } = generateKeyPairSync("ed25519");
  writeFileSync(KEY_PEM, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  console.log(`minted local signing key: ${relative(HERE, KEY_PEM)} (gitignored)`);
  return privateKey;
}

// PRODUCTION signer: mint the attestation through the deployed KYA issuer as the
// Trulioo account. The issuer signs an artifact attestation with its published KMS
// key, so the returned `kid` resolves in the JWKS - the attestation is genuinely
// issuer-backed, not self-asserted. Returns the issuer-shaped attestation.json.
async function signViaIssuer(subject, subject_digest, files, manifest) {
  const devId = process.env.KYA_ISSUER_DEV_ID;
  const devSecret = process.env.KYA_ISSUER_DEV_SECRET;
  const tenantHdr = process.env.KYA_ISSUER_TENANT_HEADER;
  if (!devId && !tenantHdr) {
    fail("production signing needs KYA_ISSUER_DEV_ID + KYA_ISSUER_DEV_SECRET (the "
      + "signing account's developer credential) or KYA_ISSUER_TENANT_HEADER");
  }
  const headers = { "content-type": "application/json" };
  // Developer-credential headers; the issuer resolves the tenant from them.
  if (devId) {
    headers["x-developer-id"] = devId;
    headers["x-developer-secret"] = devSecret || "";
  }
  if (tenantHdr) headers["x-trulioo-tenant"] = tenantHdr;
  // Optional gateway credential, separate from the app auth above. Set both or
  // neither: the header name is deployment-specific, and a value with no name
  // would otherwise be dropped without a word.
  const gatewayKey = process.env.KYA_EDGE_INTERNAL_KEY;
  const gatewayHeader = process.env.KYA_EDGE_INTERNAL_HEADER;
  if (gatewayKey && !gatewayHeader) {
    fail("KYA_EDGE_INTERNAL_KEY is set but KYA_EDGE_INTERNAL_HEADER is not.");
  }
  // The reverse half. Without it, a deployment that set the header NAME and lost the
  // value sends no gateway credential at all and gets a bodyless 401 from the edge,
  // which reads as a bad app credential and sends the operator to the wrong place.
  if (gatewayHeader && !gatewayKey) {
    fail("KYA_EDGE_INTERNAL_HEADER is set but KYA_EDGE_INTERNAL_KEY is not.");
  }
  if (gatewayKey && gatewayHeader) headers[gatewayHeader] = gatewayKey;

  const res = await fetch(ARTIFACT_ATTEST_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      subject,
      subject_kind: "plugin",
      files,                       // path -> sha256:<hex>; issuer recomputes the seal
      issuer_id: ISSUER.issuer_id,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    fail(`issuer rejected artifact attestation (${res.status}): ${body.slice(0, 400)}`);
  }
  const out = await res.json();  // { jws, kid, subject_digest, claims }
  if (out.subject_digest !== subject_digest) {
    fail(`issuer sealed a different digest (${out.subject_digest}) than computed locally (${subject_digest})`);
  }
  return {
    $comment: "KYA-attested Agent Plugin (issuer-signed). Verify: node attest-plugin.mjs --verify --resolve",
    spec: "com.trulioo.kya/artifact-attestation/1.0.0",
    mode: "issuer",              // resolvable-kid compact-JWS model
    kid: out.kid,
    jwks_url: JWKS_URL,
    issuer: ISSUER,
    plugin: { name: manifest.name, version: manifest.version },
    subject_digest,
    files,
    claims: out.claims,          // the signed ArtifactClaims (mirror)
    jws: out.jws,                // compact 3-part JWS, payload = claims
  };
}

// LOCAL DEV signer: detached JWS with an embedded, gitignored key (kid = RFC 7638
// thumbprint). Self-contained but NOT issuer-backed - a --resolve verify will
// reject it because the thumbprint kid is absent from the issuer JWKS. This is the
// dev fallback when no ARTIFACT_ATTEST_URL is configured.
function signLocal(subject_digest, files, manifest) {
  const privateKey = loadOrCreatePrivateKey();
  const jwk = ed25519Jwk(createPublicKey(privateKey));
  const kid = jwkThumbprint(jwk);
  const claims = {
    spec: "com.trulioo.kya/plugin-attestation/1.0.0",
    plugin: { name: manifest.name, version: manifest.version },
    issuer: ISSUER,
    subject_digest,
    files,
    // Static, reproducible metadata only - no wall-clock (kept deterministic so
    // an unchanged plugin re-signs to an identical digest; issuance time is
    // recorded by the KYA transparency log, not embedded here).
    statement: "This Agent Plugin was published by the named Trulioo KYA issuer; "
      + "the subject_digest seals its manifest, skills, commands, and agent.",
  };
  const header = { alg: "EdDSA", typ: "kya-plugin-attestation+jws", kid };
  const jws = signJws(header, claims, privateKey);
  return {
    $comment: "KYA-attested Agent Plugin (LOCAL DEV KEY - not issuer-backed). "
      + "Verify: node attest-plugin.mjs --verify",
    spec: claims.spec,
    mode: "local",
    kid,
    public_jwk: jwk,
    claims,
    jws,
  };
}

async function doSign() {
  mkdirSync(KYA_DIR, { recursive: true });
  const { files, subject_digest } = computeSubject();
  const manifest = JSON.parse(readFileSync(join(PLUGIN, "plugin.json"), "utf8"));
  const subject = `${manifest.name}@${manifest.version}`;

  const attestation = ARTIFACT_ATTEST_URL
    ? await signViaIssuer(subject, subject_digest, files, manifest)
    : signLocal(subject_digest, files, manifest);

  writeFileSync(ATTESTATION, JSON.stringify(attestation, null, 2) + "\n");
  console.log(`signed ${subject} [${attestation.mode}]`);
  console.log(`  kid            ${attestation.kid}`);
  console.log(`  subject_digest ${subject_digest}`);
  if (attestation.mode === "local") {
    console.log(`  WARNING        local dev key - not issuer-backed (a --resolve verify will fail)`);
  }
  console.log(`  attestation    ${relative(HERE, ATTESTATION)}`);
}

function fail(msg) { console.error(`ATTESTATION INVALID: ${msg}`); process.exit(1); }

// Verify a compact 3-part JWS with an EXPLICIT public JWK (issuer or embedded).
// Returns the decoded payload object. Enforces alg=EdDSA and the expected typ.
function verifyCompactJws(token, jwk, expectedTyp) {
  const parts = token.split(".");
  if (parts.length !== 3) fail("compact JWS must have 3 parts");
  const hdr = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  if (hdr.alg !== "EdDSA") fail(`unexpected alg ${hdr.alg}`);
  if (expectedTyp && hdr.typ !== expectedTyp) fail(`unexpected typ ${hdr.typ} (want ${expectedTyp})`);
  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const ok = edVerify(null, Buffer.from(`${parts[0]}.${parts[1]}`, "utf8"),
                      publicKey, Buffer.from(parts[2], "base64url"));
  if (!ok) fail("Ed25519 signature does not verify");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}

// Resolve a kid against the issuer's published JWKS (turns a self-asserted kid into
// a portal-anchored one - the difference between "signed by some key" and "signed
// by the Trulioo issuer"). Fail-closed on any fetch/lookup failure.
async function resolveIssuerJwk(kid) {
  let doc;
  try {
    const res = await fetch(JWKS_URL);
    if (!res.ok) fail(`JWKS fetch ${JWKS_URL} -> ${res.status}`);
    doc = await res.json();
  } catch (e) {
    fail(`could not fetch issuer JWKS ${JWKS_URL}: ${e.message}`);
  }
  const jwk = (doc.keys || []).find((k) => k.kid === kid);
  if (!jwk) fail(`kid ${kid} not found in issuer JWKS (${JWKS_URL}) - not issuer-backed`);
  if (jwk.alg && jwk.alg !== "EdDSA") fail(`issuer key ${kid} alg ${jwk.alg} != EdDSA`);
  return jwk;
}

async function doVerify(resolve, requireIssuer, requireProjectionsSealed) {
  if (!existsSync(ATTESTATION)) fail(`no attestation at ${relative(HERE, ATTESTATION)} (run --sign)`);
  const att = JSON.parse(readFileSync(ATTESTATION, "utf8"));
  const issuerMode = att.mode === "issuer";

  let signedClaims;
  let resolvedVia;
  if (issuerMode) {
    // PRODUCTION: provenance is ONLY meaningful if the signing key resolves in the
    // issuer's published JWKS. An issuer-mode attestation is therefore verified
    // EXCLUSIVELY against the resolved issuer key - never against a key carried in
    // the file. Trusting an embedded key here would let a forged attestation.json
    // (mode:"issuer" + its own public_jwk + self-signed jws) pass as issuer
    // provenance, so --resolve is mandatory and any self-provided key is ignored.
    if (!resolve && !requireIssuer) {
      fail("issuer-mode attestation requires --resolve (verifies the kid against the "
        + "issuer JWKS); an embedded key is never trusted for issuer provenance");
    }
    if (resolve) {
      const jwk = await resolveIssuerJwk(att.kid);
      resolvedVia = `issuer JWKS (${JWKS_URL})`;
      signedClaims = verifyCompactJws(att.jws, jwk, ARTIFACT_TYP);
      // The signed payload must match the presented claims mirror.
      if (jcs(signedClaims) !== jcs(att.claims)) fail("signed payload != presented claims");
    } else {
      // OFFLINE INTEGRITY ONLY (--require-issuer without --resolve): the MR-time gate
      // has no route to the issuer JWKS, and the rule above stands - an embedded key
      // is never trusted for issuer provenance - so the signature is NOT checked here
      // at all. The payload is decoded WITHOUT verification purely to compare it
      // against the presented claims mirror and the plugin on disk, which is an
      // integrity check, not a provenance one. Anything derived from it is untrusted
      // until the rel- tag runs --resolve. Labeled as such in the output below,
      // because an unverified decode silently reported as "VALID" is precisely how a
      // forged attestation would earn trust it never established.
      signedClaims = JSON.parse(
        Buffer.from(att.jws.split(".")[1], "base64url").toString("utf8"));
      if (jcs(signedClaims) !== jcs(att.claims)) fail("signed payload != presented claims");
      resolvedVia = "NOT VERIFIED (offline: mode + integrity only, no --resolve)";
    }
  } else {
    // LOCAL DEV: detached JWS, embedded key, kid = RFC 7638 thumbprint.
    const kid = jwkThumbprint(att.public_jwk);
    if (kid !== att.kid) fail(`kid mismatch: header ${att.kid} != thumbprint ${kid}`);
    if (att.jws.protected) {
      const hdr = JSON.parse(Buffer.from(att.jws.protected, "base64url").toString("utf8"));
      if (hdr.kid !== kid) fail(`jws header kid ${hdr.kid} != key thumbprint ${kid}`);
      if (hdr.alg !== "EdDSA") fail(`unexpected alg ${hdr.alg}`);
    }
    const publicKey = createPublicKey({ key: att.public_jwk, format: "jwk" });
    const signed = Buffer.from(`${att.jws.protected}.${att.jws.payload}`, "utf8");
    if (!edVerify(null, signed, publicKey, Buffer.from(att.jws.signature, "base64url"))) {
      fail("Ed25519 signature does not verify");
    }
    signedClaims = JSON.parse(Buffer.from(att.jws.payload, "base64url").toString("utf8"));
    if (jcs(signedClaims) !== jcs(att.claims)) fail("signed payload != presented claims");
    resolvedVia = "embedded key (local dev - NOT issuer-backed)";
    if (resolve) fail("--resolve requires an issuer-signed attestation; this is a local dev key");
    // OFFLINE mode gate, for a pre-merge job with no route to the issuer JWKS. This
    // asserts one JSON field and proves nothing cryptographically - a forged
    // mode:"issuer" document passes it. That is fine: it is not a provenance check,
    // it is a "do not MERGE a dev-key attestation" check, because publication happens
    // on merge while the real --resolve gate only runs at the release tag.
    if (requireIssuer) {
      fail("--require-issuer: attestation is mode:\"local\" (dev key). Sign this version "
        + "through the issuer before merging; merging it would publish a dev-key "
        + "attestation until the next release tag.");
    }
  }

  // INTEGRITY: recompute exactly the file set the signed payload names. This
  // preserves verification of pre-projection-seal attestations while still
  // checking every signed byte. Separately enforce that every current canonical
  // authored file remains covered, so compatibility cannot become a silent
  // escape hatch for a newly added skill, command, or agent.
  const signedPaths = Object.keys(signedClaims.files || {});
  const requiredCanonical = attestedFiles(false);
  const missingCanonical = requiredCanonical.filter((path) => !signedPaths.includes(path));
  if (missingCanonical.length) {
    fail(`canonical plugin files are not sealed: ${missingCanonical.join(", ")}`);
  }
  const missingProjections = INSTALLABLE_PROJECTIONS.filter(
    (path) => !signedPaths.includes(path),
  );
  if (requireProjectionsSealed && missingProjections.length) {
    fail(`installable projections are not issuer-sealed: ${missingProjections.join(", ")}; `
      + "re-sign through the issuer after running sync-plugin.mjs");
  }
  const { subject_digest, files } = computeSubject(signedPaths);
  if (subject_digest !== signedClaims.subject_digest) {
    const changed = Object.keys({ ...files, ...signedClaims.files })
      .filter((f) => files[f] !== signedClaims.files[f]);
    fail(`plugin changed since signing (subject_digest mismatch)\n  affected: ${changed.join(", ")}`);
  }

  // Issuer/plugin live at top-level in issuer-mode, under claims in local-mode.
  const plugin = signedClaims.plugin || att.plugin;
  const issuer = att.issuer || signedClaims.issuer || ISSUER;
  // Do not print "VALID" when no signature was checked. The word is the whole point
  // of running this, and applying it to an integrity-only pass would make the CI log
  // read as a provenance proof.
  console.log(issuerMode && !resolve ? "attestation INTEGRITY OK (signature unverified)"
                                     : "attestation VALID");
  console.log(`  plugin         ${plugin.name}@${plugin.version}`);
  console.log(`  issuer         ${issuer.name} (${issuer.issuer_id})`);
  console.log(`  kid            ${att.kid}`);
  console.log(`  trust          ${resolvedVia}`);
  console.log(`  subject_digest ${subject_digest}`);
  console.log(`  sealed files   ${Object.keys(files).length}`);
  console.log(`  projections    ${missingProjections.length
    ? `UNSEALED (${missingProjections.join(", ")})`
    : "issuer-sealed"}`);
  console.log(`  local binding  ${LOCAL_BINDING_PROJECTIONS.join(", ")} `
    + "(requires workspace installation evidence)");
  if (missingProjections.length && !requireProjectionsSealed) {
    console.log("  WARNING        installable projections are deterministic but not yet "
      + "covered by this issuer signature; use --require-projections-sealed as the "
      + "promotion gate after re-signing");
  }
  // A local-mode attestation verifies perfectly against its OWN embedded key, so a
  // bare --verify is green and says nothing about provenance. The same attestation is
  // copied to the hosted public paths, so a green local-mode verify means a dev-key
  // attestation is being served to anyone who fetches it. Say so here rather than
  // leaving it to be inferred from the `trust` line.
  if (!issuerMode) {
    console.log("");
    console.log("WARNING: dev-key attestation - NOT issuer provenance. If this is committed,");
    console.log("  the hosted copies serve a dev key too, and the release publisher will");
    console.log("  REFUSE to publish it. Sign this version through the issuer, then commit.");
  }
}

const args = process.argv.slice(2);
const mode = args[0];
const resolveFlag = args.includes("--resolve");
const requireIssuerFlag = args.includes("--require-issuer");
const requireProjectionsSealedFlag = args.includes("--require-projections-sealed");
// Await the entrypoint and funnel ANY throw (a non-JSON issuer response, a
// malformed body missing jws/kid, a network error) into the clean
// "ATTESTATION INVALID" path instead of an unhandledRejection stack trace.
async function main() {
  if (mode === "--sign") await doSign();
  else if (mode === "--verify" || mode === "--check") {
    await doVerify(resolveFlag, requireIssuerFlag, requireProjectionsSealedFlag);
  }
  else {
    console.error("usage: node attest-plugin.mjs --sign | --verify [--resolve] "
      + "[--require-issuer] [--require-projections-sealed]");
    process.exit(2);
  }
}
main().catch((e) => fail(e && e.message ? e.message : String(e)));
