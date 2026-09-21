// Tests over the bytes this plugin actually ships.
//
// These run in two places with the same result: from the published mirror (where the
// payload's parent is the repository root) and from the monorepo that generates it
// (where the parent is `plugin/`). Anything resolved outside the payload is therefore
// looked up by trying both layouts - do not hard-code one.
//
// Invoke as bare `node --test` from the payload's parent. A directory argument
// (`node --test trulioo-mcp/tests/`) is not portable: Node 26 rejects it.
//
// Node stdlib only. A consumer must be able to check the bundle without
// installing anything.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const PAYLOAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTER = path.resolve(PAYLOAD, "..");

// The skill set this plugin installs. A deployment's served catalog is allowed to
// be larger - shipping is a curated subset, and the subset is declared here and in
// the generator. KYC is deliberately absent: it is still served over HTTP, it just
// does not install.
const SHIPPED_SKILLS = [
  "trulioo-agent-assurance",
  "trulioo-agent-readiness",
  "trulioo-kya",
  "trulioo-kyb",
  "trulioo-onboarding",
];

const read = (...parts) => readFile(path.join(PAYLOAD, ...parts), "utf8");
const readJson = async (...parts) => JSON.parse(await read(...parts));

/** First of `candidates` (relative to the payload's parent) that exists. */
function outer(...candidates) {
  for (const name of candidates) {
    const full = path.join(OUTER, name);
    if (existsSync(full)) return full;
  }
  assert.fail(`none of ${candidates.join(", ")} found beside the payload at ${OUTER}`);
}

async function shippedFiles() {
  const out = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === "tests" || entry.name === "LICENSE") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(full);
    }
  };
  await walk(PAYLOAD);
  return out;
}

test("Given the shipped skill set when it is enumerated then it is exactly the declared subset", async () => {
  const entries = await readdir(path.join(PAYLOAD, "skills"), { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  assert.deepEqual(dirs, [...SHIPPED_SKILLS].sort());

  for (const name of dirs) {
    // A skill is one SKILL.md. No runners, no scanner binaries, no fixtures that
    // a client would inject as context without anyone reading them.
    const files = await readdir(path.join(PAYLOAD, "skills", name));
    assert.deepEqual(files.sort(), ["SKILL.md"], `skills/${name} ships more than SKILL.md`);

    const body = await read("skills", name, "SKILL.md");
    assert.match(
      body,
      new RegExp(`^---\\nname: ${name}\\n`, "m"),
      `skills/${name}/SKILL.md frontmatter name must equal its directory`,
    );
    assert.match(body, /^description: \S/m, `skills/${name}/SKILL.md needs a description`);
  }
});

test("Given the canonical manifest when projections are compared then every version and pointer agrees", async () => {
  const plugin = await readJson("plugin.json");
  const mcp = await readJson("mcp.json");
  const server = JSON.parse(await readFile(outer("server.json"), "utf8"));
  const marketplace = JSON.parse(
    await readFile(path.join(outer(".claude-plugin"), "marketplace.json"), "utf8"),
  );

  const entry = marketplace.plugins.find((p) => p.name === plugin.name);
  assert.ok(entry, `${plugin.name} missing from the marketplace catalog`);

  // The MCP Registry schema's own constraints, hand-held so this stays offline and
  // dependency-free: required keys, the reverse-DNS name pattern, the transport enum,
  // and a dated $schema (the registry publishes no `latest` alias).
  for (const key of ["name", "description", "version"]) {
    assert.ok(server[key], `server.json is missing the required key ${key}`);
  }
  assert.match(server.name, /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
  assert.match(
    server.$schema,
    /^https:\/\/static\.modelcontextprotocol\.io\/schemas\/\d{4}-\d{2}-\d{2}\/server\.schema\.json$/,
  );
  assert.equal(server.remotes.length, 1);
  assert.equal(server.remotes[0].type, "streamable-http");
  assert.doesNotMatch(server.version, /[\^~><*x]/, "a version range is rejected by the registry");
  assert.ok(server.repository.url && server.repository.source);

  assert.equal(server.version, plugin.version);
  assert.equal(marketplace.version, plugin.version);
  assert.equal(entry.version, plugin.version);
  assert.equal(entry.source.ref, `v${plugin.version}`);
  assert.equal(server.description, plugin.description);
  assert.equal(server.repository.url, plugin.repository);
  assert.equal(server.websiteUrl, plugin.homepage);

  // The registry manifest, the MCP server definition, and the Desktop install hint
  // must all name one endpoint. A client that picks the wrong projection would
  // otherwise authenticate against a different server than the skills describe.
  const urls = new Set([
    server.remotes[0].url,
    ...Object.values(mcp.mcpServers).map((s) => s.url),
    plugin.extensions["com.anthropic.claude-desktop"].install.url,
  ]);
  assert.equal(urls.size, 1, `disagreeing endpoint URLs: ${[...urls].join(", ")}`);
});

test("Given the client extensions when they list files then each one exists and nothing is unlisted", async () => {
  const plugin = await readJson("plugin.json");
  const cc = plugin.extensions["com.anthropic.claude-code"];

  assert.equal(cc.skills, "./skills/");

  for (const [key, dir] of [["commands", "commands"], ["agents", "agents"]]) {
    const listed = cc[key].map((rel) => {
      assert.match(rel, /^\.\//, `${key} entry ${rel} must be a relative ./ path`);
      return rel.replace(/^\.\//, "");
    });
    for (const rel of listed) {
      assert.ok(existsSync(path.join(PAYLOAD, rel)), `${rel} is listed but not shipped`);
    }
    const onDisk = (await readdir(path.join(PAYLOAD, dir)))
      .filter((f) => f.endsWith(".md"))
      .map((f) => `${dir}/${f}`);
    assert.deepEqual(
      onDisk.sort(),
      listed.sort(),
      `${dir}/ on disk does not match what plugin.json lists`,
    );
  }

  for (const rel of [cc.mcpServers, plugin.extensions["com.openai.chatgpt"].apps]) {
    assert.ok(existsSync(path.join(PAYLOAD, rel)), `${rel} is referenced but not shipped`);
  }
});

test("Given a documented verify command when it is resolved then the script it names is reachable and checks provenance", async () => {
  const plugin = await readJson("plugin.json");
  const docs = [
    ["plugin.json", plugin.extensions["com.trulioo.kya"].verify],
    ["README.md", await read("README.md")],
    ["com.trulioo.kya/README.md", await read("com.trulioo.kya", "README.md")],
    ["AGENTS.md", await readFile(outer("AGENTS.md", "mirror-AGENTS.md"), "utf8")],
    ["SECURITY.md", await readFile(outer("SECURITY.md", "mirror-SECURITY.md"), "utf8")],
    ["mirror README", await readFile(outer("README.md", "mirror-README.md"), "utf8")],
  ];

  // A reader runs the command from wherever the surrounding text says to. So resolve
  // it from there: a fenced block may declare its own working directory with a
  // leading `# from ...` comment, and otherwise the working directory is the one
  // holding the document.
  const NODE_CALL = /\bnode\s+((?:[\w./-]*\/)?attest-plugin\.mjs)([^\n`]*)/g;
  let found = 0;

  for (const [where, text] of docs) {
    const docDir = where.includes("/") ? path.join(PAYLOAD, path.dirname(where))
      : where === "plugin.json" || where === "README.md" ? PAYLOAD
      : OUTER;

    // plugin.json's `verify` is a bare string, not markdown - a client reads it with
    // the payload as the working directory, like every other path in that manifest.
    const blocks = where === "plugin.json"
      ? [text]
      : [...text.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]);

    for (const block of blocks) {
      // One fence often shows the same command from two working directories, each
      // introduced by its own comment - so the base is the nearest one ABOVE the line.
      let declared = docDir;
      for (const line of block.split("\n")) {
        const from = line.match(/^\s*#\s*from\s+(.+?)\s*$/i);
        if (from) declared = /repository root/i.test(from[1]) ? OUTER : docDir;
        for (const [, invocation, flags] of line.matchAll(NODE_CALL)) {
          found += 1;
          assert.ok(
            existsSync(path.resolve(declared, invocation)),
            `${where}: \`node ${invocation}\` does not resolve from ${declared}`,
          );
          // --verify without --resolve fails closed on a released bundle: it would
          // check the signature against a key carried inside the same file.
          if (flags.includes("--verify")) {
            assert.match(flags, /--resolve\b/, `${where}: \`--verify\` without \`--resolve\``);
          }
        }
        // `node --test <dir>/` is not portable - Node 26 rejects a directory argument
        // with "Cannot find module". The form that works on every supported major is
        // CWD auto-discovery: bare `node --test`, run from the payload's parent.
        // A path-shaped argument only: prose like "node --test suite" is not a command.
        // Quotes stripped first, so a quoted glob ("**/*.test.mjs") reads as a file.
        const testRun = line.match(/\bnode\s+--test\s+([^\s`]*\/[^\s`]*)/);
        const testArg = testRun?.[1].replace(/^["']|["']$/g, "");
        assert.ok(
          !testArg || /\.[mc]?js$/.test(testArg),
          `${where}: \`node --test ${testArg}\` passes a directory; Node 26 rejects that. `
            + "Use bare `node --test` from the directory above the payload.",
        );
      }
    }
  }
  assert.ok(found >= 6, `expected a verify command in every surface, found ${found}`);
});

test("Given the shipped instructions when they describe session mode then none of them assumes one", async () => {
  // The default endpoint is the live hosted server; the mode is bound to the
  // credential the session authenticated with. Documentation that promises a
  // no-token sandbox makes an agent describe real, billed verifications as
  // synthetic - the highest-consequence defect this surface can carry.
  for (const file of await shippedFiles()) {
    if (!file.endsWith(".md")) continue;
    const body = await readFile(file, "utf8");
    const rel = path.relative(PAYLOAD, file);
    for (const claim of [
      /default endpoint is a no-token sandbox/i,
      /no-token sandbox that returns synthetic/i,
      /this is a sandbox\/mock demo/i,
      /\bsandbox by default\b/i,
      /always\s+runs?\s+in\s+sandbox/i,
      /(?<!never )assume[sd]?\s+(?:it\s+is\s+)?sandbox/i,
    ]) {
      assert.doesNotMatch(body, claim, `${rel} asserts a mode instead of reading it`);
    }
  }

  for (const [rel, body] of [
    ["agents/identity-orchestrator.md", await read("agents", "identity-orchestrator.md")],
    ["commands/kyb-due-diligence.md", await read("commands", "kyb-due-diligence.md")],
    ["skills/trulioo-onboarding/SKILL.md", await read("skills", "trulioo-onboarding", "SKILL.md")],
  ]) {
    assert.match(body, /test_mode/, `${rel} must tell the reader where the mode is reported`);
    assert.match(body, /trulioo_health/, `${rel} must name the tool that reports the mode`);
  }
});

// A scan for leaked internal vocabulary deliberately does NOT live here. Written as
// literals it would be the vocabulary, published in the package it is meant to keep it
// out of. It runs at the publishing boundary instead, over the same bytes.

test("Given the shipped bytes when scanned then they carry no credential material", async () => {
  // Kept in the payload because these patterns describe a SHAPE, not a secret: a reader
  // learns nothing from them, and a consumer can re-run this check on what they installed.
  const denied = [
    [/tsk_(?:sk|pk)_(?:live|test)_/, "Trulioo credential prefix"],
    [/AKIA[0-9A-Z]{8}/, "AWS access key id"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key material"],
    [/\bey[A-Za-z0-9_-]{12,}\.ey[A-Za-z0-9_-]{12,}\./, "a JWT"],
  ];

  for (const file of await shippedFiles()) {
    const rel = path.relative(PAYLOAD, file);
    // The attestation is exempt: its `jws` IS a signature and is meant to be here, and
    // the rest of it is hex digests over files this loop reads directly anyway.
    if (rel === "com.trulioo.kya/attestation.json") continue;
    const body = await readFile(file, "utf8");
    for (const [pattern, why] of denied) {
      const hit = body.match(pattern);
      assert.equal(hit, null, `${rel} carries ${why}: ${JSON.stringify(hit?.[0])}`);
    }
  }
});

test("Given the assurance skill when it selects an execution route then it cannot scan or decide policy", async () => {
  const skill = await read("skills", "trulioo-agent-assurance", "SKILL.md");

  assert.match(skill, /trulioo_capabilities/);
  for (const shape of [/remote/i, /local/i, /spark/i, /poll/i, /signals/i, /coverage/i,
    /provenance/i, /disagreement/i, /unavailable/i]) {
    assert.match(skill, shape);
  }

  for (const forbidden of [
    /TRULIOO_CLIENT_ID/,
    /TRULIOO_CLIENT_SECRET/,
    /AWS_ACCESS_KEY_ID/,
    /\bdocker\s+run\b/i,
    /\bnpx\s+/i,
    /\bpip\s+install\b/i,
    /\bcargo\s+install\b/i,
    /\bcurl\s+/i,
    /\bscore\s*(?:>=|<=|>|<|==)/i,
    /\b\d+(?:\.\d+)?\s*(?:points?|percent|%)/i,
    /kya_submit_assurance_evidence/,
  ]) {
    assert.doesNotMatch(skill, forbidden);
  }

  assert.match(skill, /never execute scanners/i);
  assert.match(skill, /never implement or infer KYA policy/i);
  assert.match(skill, /never expose or translate a vendor score/i);
  assert.match(skill, /do not guess tool names/i);
  assert.match(skill, /Call the Trulioo MCP server only/i);
  assert.match(skill, /Do not call collector vendors or the KYA issuer service directly/i);
  assert.match(skill, /Never retain or reveal raw reports/i);
  assert.match(skill, /exact subject and digest continuity/i);
});

test("Given every shipped skill when it names a tool then it also says the session is the authority", async () => {
  // A skill that lists tool names without this caveat teaches an agent to call
  // something the session may not advertise: families are off by default and some
  // ride an account entitlement.
  for (const name of SHIPPED_SKILLS) {
    const body = await read("skills", name, "SKILL.md");
    if (!/\b(?:kyb|kya|trulioo)_[a-z_]+\b/.test(body)) continue;
    assert.match(
      body,
      /trulioo_capabilities|tools\/list/,
      `skills/${name}/SKILL.md names tools without pointing at the session's own contract`,
    );
  }
});

test("Given the KYA attestation when it is read then what it seals is exactly what ships", async () => {
  // `--verify` proves the sealed bytes are unaltered. It cannot prove the sealed
  // SET is the shipped set: a file dropped from the payload and a file added to it
  // are both invisible to a digest over the other files. This is that check.
  //
  // A mismatch here means the attestation predates the payload and the issuer has
  // not re-signed yet - it is not a byte-integrity failure.
  const attestation = await readJson("com.trulioo.kya", "attestation.json");
  const files = attestation.claims?.files ?? {};
  const sealed = Object.keys(files).sort();

  const shipped = (await shippedFiles())
    .map((f) => path.relative(PAYLOAD, f))
    .filter((rel) => /^(?:skills|commands|agents)\//.test(rel))
    .sort();

  assert.deepEqual(
    sealed.filter((rel) => /^(?:skills|commands|agents)\//.test(rel)),
    shipped,
    "sealed instruction surface differs from the shipped one - the issuer must re-sign",
  );

  for (const rel of sealed) {
    assert.ok(existsSync(path.join(PAYLOAD, rel)), `${rel} is sealed but not shipped`);
    assert.match(files[rel], /^sha256:[0-9a-f]{64}$/, `${rel} digest is not a sha256`);
  }
});
