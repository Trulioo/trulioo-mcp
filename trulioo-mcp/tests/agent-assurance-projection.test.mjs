import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = path.join(pluginRoot, "skills", "trulioo-agent-assurance");
const skillPath = path.join(skillDir, "SKILL.md");

test("Given the Agent Plugin when assurance is requested then it projects only the Prism MCP workflow", async () => {
  const [skill, manifest] = await Promise.all([
    readFile(skillPath, "utf8"),
    readFile(path.join(pluginRoot, "plugin.json"), "utf8").then(JSON.parse),
  ]);

  assert.match(skill, /^---\nname: trulioo-agent-assurance\n/m);
  assert.match(skill, /trulioo_capabilities/);
  assert.match(skill, /Prism MCP/);
  assert.match(skill, /remote/i);
  assert.match(skill, /local/i);
  assert.match(skill, /spark/i);
  assert.match(skill, /poll/i);
  assert.match(skill, /signals/i);
  assert.match(skill, /coverage/i);
  assert.match(skill, /provenance/i);
  assert.match(skill, /disagreement/i);
  assert.match(skill, /unavailable/i);
  assert.equal(
    manifest.extensions["com.anthropic.claude-code"].skills,
    "./skills/",
  );
});

test("Given the assurance skill when it selects an execution route then it cannot scan or decide policy", async () => {
  const skill = await readFile(skillPath, "utf8");

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
  assert.match(skill, /Call Prism MCP only/i);
  assert.match(skill, /Do not call collector vendors or Halo endpoints directly/i);
  assert.match(skill, /Never retain or reveal raw reports/i);
  assert.match(skill, /exact subject and digest continuity/i);
});

test("Given the assurance projection when packaged then it contains no runner or scanner executable", async () => {
  const entries = await readdir(skillDir, { withFileTypes: true });
  assert.deepEqual(
    entries.map((entry) => entry.name).sort(),
    ["SKILL.md"],
  );
});
