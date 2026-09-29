#!/usr/bin/env node
// Validate a workspace-owned ChatGPT app binding without exposing the production
// plugin issuer credential to branch-modified signing code.
//
// Usage:
//   node check-chatgpt-app-binding.mjs trulioo-mcp/.app.json
import { readFileSync } from "node:fs";

const bindingPath = process.argv[2];
let valid = false;

if (bindingPath) {
  try {
    const binding = JSON.parse(readFileSync(bindingPath, "utf8"));
    const rootKeys = Object.keys(binding || {});
    const apps = binding?.apps;
    const appKeys = apps && typeof apps === "object" && !Array.isArray(apps)
      ? Object.keys(apps)
      : [];
    const trulioo = apps?.trulioo;
    const appFields = trulioo && typeof trulioo === "object" && !Array.isArray(trulioo)
      ? Object.keys(trulioo)
      : [];

    valid = rootKeys.length === 1
      && rootKeys[0] === "apps"
      && appKeys.length === 1
      && appKeys[0] === "trulioo"
      && appFields.length === 1
      && appFields[0] === "id"
      && /^plugin_asdk_app_[A-Za-z0-9_-]+$/.test(trulioo.id)
      && !trulioo.id.includes("REPLACE_WITH_CHATGPT_CONNECTION_ID");
  } catch {
    valid = false;
  }
}

if (!valid) {
  console.error(
    "ChatGPT connection binding invalid: expected one realized Trulioo plugin_asdk_app id",
  );
  process.exit(1);
}

console.log("ChatGPT connection binding shape valid");
