import assert from "node:assert/strict";
import { test } from "node:test";

import { shouldShowVoiceBanner, VOICE_MISSING_TIP } from "@/lib/ai/honesty-copy";
import {
  parseTelegramStart,
  startWelcomeText,
  weeklyNudgeText,
} from "@/lib/telegram/bot";

test("parseTelegramStart reads /start and referral payload", () => {
  assert.deepEqual(parseTelegramStart("/start"), { startParam: null });
  assert.deepEqual(parseTelegramStart("/start ref_42"), { startParam: "ref_42" });
  assert.deepEqual(parseTelegramStart("/start@ReelsFactoryBot ref_9"), {
    startParam: "ref_9",
  });
  assert.equal(parseTelegramStart("привет"), null);
});

test("welcome and weekly copy stay Russian and mention shooting", () => {
  assert.match(startWelcomeText({ firstName: "Виталий" }), /Виталий/);
  assert.match(startWelcomeText({ unshotCount: 2 }), /без съёмки: 2/);
  assert.match(weeklyNudgeText(1), /сценарий/);
  assert.match(weeklyNudgeText(3), /сценария/);
  assert.match(weeklyNudgeText(5), /сценариев/);
});

test("voice banner only when Whisper did not hear speech", () => {
  assert.equal(shouldShowVoiceBanner({ voiceHeard: false }), true);
  assert.equal(shouldShowVoiceBanner({ voiceHeard: true }), false);
  assert.equal(
    shouldShowVoiceBanner({
      voiceHeard: null,
      profileAuditTips: [VOICE_MISSING_TIP],
    }),
    true,
  );
  assert.equal(
    shouldShowVoiceBanner({ voiceHeard: null, profileAuditTips: ["Ниша ок"] }),
    false,
  );
});
