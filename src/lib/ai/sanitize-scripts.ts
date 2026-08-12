import { sliceChars } from "@/lib/ai/safe-json";
import { priceRe } from "@/lib/content/profile-insights";
import type { GeneratedScript, PlatformPack, StrategyPayload } from "@/lib/types";
import { normalizeKeyword } from "@/lib/comment-keyword";

const DIGIT_SUFFIX = /\d+$/;

export function humanizeKeyword(raw: string | null | undefined, fallback = "ГАЙД") {
  const base = normalizeKeyword(raw, fallback).replace(DIGIT_SUFFIX, "");
  return base || fallback;
}

function replaceKeyword(text: string, from: string[], to: string) {
  let next = text;
  for (const word of from) {
    if (!word || word === to) continue;
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    next = next.replace(re, to);
  }
  return next;
}

export function stripPrices(text: string) {
  return text
    .replace(priceRe(), "в шапке профиля")
    .replace(/цена\s+в шапке профиля/gi, "условия в шапке профиля")
    .replace(/стоит\s+в шапке профиля/gi, "условия в шапке профиля")
    .replace(/ {2,}/g, " ")
    .trim();
}

function rewritePacks(packs: PlatformPack | undefined, from: string[], to: string, keepPrice: boolean) {
  if (!packs) return packs;
  const run = (value: string) => {
    const swapped = replaceKeyword(value, from, to);
    return keepPrice ? swapped : stripPrices(swapped);
  };
  return {
    reels: {
      ...packs.reels,
      caption: run(packs.reels.caption),
      cta: run(packs.reels.cta),
    },
    vk_clips: {
      caption: run(packs.vk_clips.caption),
      cta: run(packs.vk_clips.cta),
    },
    shorts: {
      title: run(packs.shorts.title),
      description: run(packs.shorts.description),
      cta: run(packs.shorts.cta),
    },
    telegram_post: {
      text: run(packs.telegram_post.text),
      cta: run(packs.telegram_post.cta),
    },
  };
}

function collectOldKeywords(strategy: StrategyPayload) {
  const words = new Set<string>();
  const push = (raw?: string | null) => {
    const v = humanizeKeyword(raw, "");
    if (v) words.add(v);
    const full = normalizeKeyword(raw, "");
    if (full) words.add(full);
  };
  push(strategy.funnel_kit?.comment_keyword);
  for (const script of strategy.scripts || []) {
    push(script.comment_keyword);
    push(script.funnel?.comment_keyword);
  }
  return Array.from(words);
}

function applyKeywordToScript(
  script: GeneratedScript,
  keyword: string,
  from: string[],
  keepPriceInCaption: boolean,
): GeneratedScript {
  const swap = (value: string) => replaceKeyword(value, from, keyword);
  const teleprompter = stripPrices(swap(script.teleprompter_script || ""));
  const caption = keepPriceInCaption
    ? swap(script.caption || "")
    : stripPrices(swap(script.caption || ""));
  const cta = stripPrices(swap(script.cta || ""));
  return {
    ...script,
    comment_keyword: keyword,
    teleprompter_script: teleprompter,
    caption,
    cta,
    platform_packs: rewritePacks(script.platform_packs, from, keyword, keepPriceInCaption),
    funnel: script.funnel
      ? {
          ...script.funnel,
          comment_keyword: keyword,
          bot_reply: swap(script.funnel.bot_reply),
          telegram_cta: swap(script.funnel.telegram_cta),
        }
      : script.funnel,
  };
}

/**
 * One comment-keyword for the whole analysis; never speak prices in the teleprompter.
 * Price may stay in at most one caption (the 45s / last script).
 */
export function sanitizeStrategy(
  strategy: StrategyPayload,
  sharedKeyword: string,
): StrategyPayload {
  const keyword = humanizeKeyword(sharedKeyword, "ГАЙД");
  const from = collectOldKeywords(strategy);
  const scripts = (strategy.scripts || []).map((script, index, arr) =>
    applyKeywordToScript(script, keyword, from, index === arr.length - 1),
  );

  const tips = (strategy.profile_audit_tips || []).map((tip) =>
    replaceKeyword(tip, from, keyword),
  );

  return {
    ...strategy,
    profile_audit_tips: tips,
    scripts,
    funnel_kit: strategy.funnel_kit
      ? {
          ...strategy.funnel_kit,
          comment_keyword: keyword,
          bot_reply: replaceKeyword(strategy.funnel_kit.bot_reply, from, keyword),
          telegram_cta: replaceKeyword(strategy.funnel_kit.telegram_cta, from, keyword),
        }
      : strategy.funnel_kit,
  };
}

export function dropGenericTelegramTips(
  tips: string[],
  opts: { hasWebsiteCta: boolean; hasTelegramCta: boolean; bioExcerpt: string },
) {
  let next = tips.filter((tip) => {
    if (opts.hasWebsiteCta && /(telegram|телеграм)/i.test(tip)) {
      return /(уже есть|уже стоит|сайт в шапке|не дублируй)/i.test(tip);
    }
    if (/стрелк|эмодзи.*ссылк|ссылк.*эмодзи/i.test(tip) && /⬇️|↓/.test(opts.bioExcerpt)) {
      return false;
    }
    return true;
  });

  if (opts.hasWebsiteCta && opts.bioExcerpt) {
    const grounded = `В био уже есть призыв к покупке/ссылка («${sliceChars(opts.bioExcerpt, 80)}…») — не дублируй Telegram, веди в ту же шапку.`;
    if (!next.some((t) => /шапк/i.test(t) && /био/i.test(t))) {
      next = [grounded, ...next].slice(0, 6);
    }
  }
  return next.slice(0, 6);
}
