import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("host registers the extension bundle required by storage queue triggers", () => {
  const host = JSON.parse(readFileSync(new URL("../host.json", import.meta.url), "utf8")) as {
    extensionBundle?: { id?: string; version?: string };
  };

  assert.deepEqual(host.extensionBundle, {
    id: "Microsoft.Azure.Functions.ExtensionBundle",
    version: "[4.0.0, 5.0.0)",
  });
});
