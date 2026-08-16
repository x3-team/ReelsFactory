import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { isMockMode } from "@/lib/config";

const KEY = "MOCK_EXTERNAL_APIS";
let previous: string | undefined;

function stash() {
  previous = process.env[KEY];
}

function restore() {
  if (previous === undefined) delete process.env[KEY];
  else process.env[KEY] = previous;
}

afterEach(restore);

test("MOCK_EXTERNAL_APIS defaults to true unless explicitly false", () => {
  stash();
  delete process.env[KEY];
  assert.equal(isMockMode(), true);
  process.env[KEY] = "true";
  assert.equal(isMockMode(), true);
  process.env[KEY] = "false";
  assert.equal(isMockMode(), false);
});
