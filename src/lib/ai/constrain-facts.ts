import { sliceWords } from "@/lib/ai/safe-json";
import {
  buildFactCard,
  isBrokenNiche,
  isWeakAngle,
  nicheFromInsights,
  type FactCard,
  type ProfileInsights,
} from "@/lib/content/profile-insights";
import type { GeneratedScript, StrategyPayload } from "@/lib/types";

const INVENTED_PHRASES = [
  { re: /крем на (основе )?йогурта|на основе йогурта|йогуртов\w* крем/gi, key: "йогурт" },
  { re: /нарезки бисквита|бисквит[а-яё]*/gi, key: "бисквит" },
  { re: /без глютена/gi, key: "глютен" },
];

const INVENTED = [
  { re: /йогурт[а-яё]*/gi, key: "йогурт" },
  { re: /бисквит[а-яё]*/gi, key: "бисквит" },
  { re: /маскарпоне/gi, key: "маскарпоне" },
  { re: /крем-?чиз|сливочный сыр/gi, key: "крем-чиз" },
  { re: /глютен[а-яё]*/gi, key: "глютен" },
  { re: /кокос[а-яё]*/gi, key: "кокос" },
  { re: /желатин[а-яё]*/gi, key: "желатин" },
  { re: /пектин[а-яё]*/gi, key: "пектин" },
  { re: /яблочн[а-яё]*(?:\s+пюре)?/gi, key: "яблочн" },
  { re: /альбумин[а-яё]*/gi, key: "альбумин" },
  { re: /темперинг|темперирован[а-яё]*/gi, key: "темперир" },
  { re: /лимонн[а-яё]*\s+кислот[а-яё]*/gi, key: "лимонн" },
  { re: /сахарозаменител[а-яё]*/gi, key: "сахарозаменит" },
];

const TEMPERATURE = /\d+\s*°\s*[cс]|\d+\s*градус\w*/gi;

function allowedHas(facts: FactCard, key: string) {
  return facts.blob.includes(key.toLowerCase());
}

export function scrubInvented(text: string, facts: FactCard): string {
  if (!text) return text;
  let next = text;
  for (const item of INVENTED_PHRASES) {
    if (allowedHas(facts, item.key)) continue;
    next = next.replace(item.re, "").replace(/ {2,}/g, " ");
  }
  for (const item of INVENTED) {
    if (allowedHas(facts, item.key)) continue;
    next = next.replace(item.re, "").replace(/ {2,}/g, " ");
  }
  if (!/°|градус/.test(facts.blob)) {
    next = next.replace(TEMPERATURE, "").replace(/ {2,}/g, " ");
  }
  next = next.replace(/за\s+(\d+)\s+минут\w*/gi, (full, n: string) => {
    return new RegExp(`${n}\\s*минут`, "i").test(facts.blob) ? full : "";
  });
  next = next.replace(/(\d+)\s+минут\w*/gi, (full, n: string) => {
    return new RegExp(`${n}\\s*минут`, "i").test(facts.blob) ? full : "";
  });
  next = next.replace(/за\s+(\d+)\s+сек\w*/gi, (full, n: string) => {
    return new RegExp(`${n}\\s*сек`, "i").test(facts.blob) ? full : "";
  });
  if (/уменьшенн/.test(facts.blob) && !/без сахара/.test(facts.blob)) {
    next = next.replace(/без сахара/gi, "с меньшим сахаром");
  }
  next = next.replace(/худейте[^.!?]*/gi, "").replace(/следит[е]?\s+за фигурой/gi, "");
  if (!/\d+\s*г/.test(facts.blob)) {
    next = next.replace(/\d+\s*г(?:рамм[а-яё]*)?/gi, "");
  }
  return next
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/[—–-]\s*[—–-]/g, "—")
    .replace(/«\s+/g, "«")
    .replace(/\s+»/g, "»")
    .replace(/до,\s*/gi, "")
    .replace(/при,\s*/gi, "")
    .replace(/до\s+тогда/gi, "тогда")
    .replace(/при\s+\d+[-–]?\s*\.?/gi, "")
    .replace(/(^|[.!?]\s+|«)\s*из\s+/gi, "$1")
    .replace(/\(\s*[,;]?\s*\)/g, "")
    .replace(/\bс\s+и\s+/gi, "")
    .replace(/\s+и\s+и\s+/g, " и ")
    .replace(/,\s*,+/g, ",")
    .replace(/:\s*,/g, ":")
    .replace(/,\s*\./g, ".")
    .replace(/\s+:/g, ":")
    .replace(/:\s*$/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

function scriptBlob(script: GeneratedScript) {
  return [
    script.title,
    ...(script.hook_options || []),
    script.teleprompter_script,
    script.caption,
    script.cta,
    ...(script.shot_list || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function significantWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
}

function overlapScore(scriptText: string, angleText: string) {
  const words = significantWords(angleText);
  if (!words.length) return 0;
  let score = words.filter((w) => scriptText.includes(w)).length;
  const quoted = angleText.match(/[«"]([^»"]{3,40})[»"]/g) || [];
  for (const raw of quoted) {
    const q = raw.replace(/[«»"]/g, "").toLowerCase();
    if (q.length >= 4 && scriptText.includes(q)) score += 3;
  }
  return score;
}

function factsForScript(
  script: GeneratedScript,
  insights: ProfileInsights,
): FactCard {
  const blob = scriptBlob(script);
  const ranked = (insights.captionAngles || [])
    .map((angle) => ({
      angle,
      score: overlapScore(blob, `${angle.hookLine} ${angle.caption}`),
    }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const caption = best && best.score >= 2 ? best.angle.caption : "";
  if (caption && caption.length >= 24) return buildFactCard("", [caption]);
  return insights.factCard;
}

function scrubScript(script: GeneratedScript, facts: FactCard): GeneratedScript {
  const run = (value: string) => scrubInvented(value, facts);
  return {
    ...script,
    title: run(script.title),
    source_angle: script.source_angle ? run(script.source_angle) : script.source_angle,
    hook_options: (script.hook_options || []).map(run),
    teleprompter_script: run(script.teleprompter_script),
    caption: run(script.caption),
    cta: run(script.cta),
    shot_list: (script.shot_list || []).map((item) =>
      run(item.replace(/^\d+\.\s*/, "").replace(/^\d+\.\s*/, "")),
    ),
    props_checklist: (script.props_checklist || []).map(run),
  };
}

export function alignAngles(
  scripts: GeneratedScript[],
  insights: ProfileInsights,
): GeneratedScript[] {
  const angles = insights.captionAngles || [];
  if (!angles.length) return scripts;

  return scripts.map((script) => {
    const blob = scriptBlob(script);
    const title = (script.title || "").toLowerCase();
    const quotedHit = angles.find((angle) => {
      const names = `${angle.hookLine} ${angle.caption}`.match(
        /[«"]([^»"]{3,40})[»"]/g,
      ) || [];
      return names.some((raw) => {
        const q = raw.replace(/[«»"]/g, "").toLowerCase();
        return q.length >= 4 && (blob.includes(q) || title.includes(q));
      });
    });
    if (quotedHit) return { ...script, source_angle: quotedHit.hookLine };
    const currentScore = overlapScore(blob, script.source_angle || "");
    const ranked = angles
      .map((angle) => ({
        angle,
        score: overlapScore(blob, `${angle.hookLine} ${angle.caption}`),
      }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best || best.score < 2 || best.score <= currentScore) return script;
    return { ...script, source_angle: best.angle.hookLine };
  });
}

function cleanExtras(strategy: StrategyPayload): StrategyPayload {
  const shoot = strategy.shoot_day;
  if (!shoot?.extra_ideas) return strategy;
  return {
    ...strategy,
    shoot_day: {
      ...shoot,
      extra_ideas: shoot.extra_ideas
        .filter((idea) => !isWeakAngle(`${idea.title} ${idea.hook}`))
        .map((idea) => ({
          ...idea,
          title: sliceWords(idea.title || "", 56),
          hook: sliceWords(idea.hook || idea.title || "", 72),
        })),
    },
  };
}

/**
 * Drop ingredients/times the captions never mentioned, and retag each
 * script with the caption angle it actually matches.
 */
export function constrainFacts(
  strategy: StrategyPayload,
  insights: ProfileInsights,
): StrategyPayload {
  const aligned = alignAngles(strategy.scripts || [], insights);
  const scripts = aligned.map((script) =>
    scrubScript(script, factsForScript(script, insights)),
  );
  const genericAudience =
    !strategy.target_audience ||
    /авторы и эксперты|домашние кондитеры/i.test(strategy.target_audience);
  const niche = isBrokenNiche(strategy.niche)
    ? nicheFromInsights(insights)
    : strategy.niche;
  return cleanExtras({
    ...strategy,
    scripts,
    niche,
    target_audience: genericAudience
      ? "Подписчики автора в РФ/СНГ"
      : strategy.target_audience,
  });
}
