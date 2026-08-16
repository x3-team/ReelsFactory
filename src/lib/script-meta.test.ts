import assert from "node:assert/strict";
import { test } from "node:test";

import { scriptDuration } from "@/lib/script-meta";

test("scriptDuration reads 15/30/45 from format, else index", () => {
  assert.equal(scriptDuration({ format: "Reels 15с · ошибка", title: "А" }, 2), 15);
  assert.equal(scriptDuration({ format: "Reels 30с · процесс", title: "Б" }, 0), 30);
  assert.equal(scriptDuration({ format: "Reels 45с · миф", title: "В" }, 0), 45);
  assert.equal(scriptDuration({ format: "Reels", title: "Без длины" }, 1), 30);
});
