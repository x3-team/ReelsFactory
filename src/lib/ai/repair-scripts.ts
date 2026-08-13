import { scriptFromFact } from "@/lib/ai/assemble-scripts";
import { sliceWords } from "@/lib/ai/safe-json";
import {
  isWeakAngle,
  type ProfileInsights,
} from "@/lib/content/profile-insights";
import type { GeneratedScript, StrategyPayload } from "@/lib/types";

export { processTeleprompter } from "@/lib/ai/assemble-scripts";

const SKELETON_TITLE = /^сценарий\s*\d+/i;
const PADDED_TELEPROMPTER = /смотрите в камеру[\s\S]*ошибка аудитории/i;
const FALLBACK_TELEPROMPTER = /крупный план продукта[\s\S]*хук без приветствия/i;

export function isSkeletonScript(script: GeneratedScript): boolean {
  if (SKELETON_TITLE.test(script.title || "")) return true;
  if (PADDED_TELEPROMPTER.test(script.teleprompter_script || "")) return true;
  if (FALLBACK_TELEPROMPTER.test(script.teleprompter_script || "")) return true;
  if (isTruncatedCopy(script.title || "")) return true;
  const hooks = script.hook_options || [];
  if (hooks.length >= 2 && hooks.filter((h) => h === hooks[1]).length >= 2) {
    return true;
  }
  return false;
}

function isTruncatedCopy(text: string) {
  const t = (text || "").trim();
  if (!t) return true;
  return /\b(и|в|на|с|из|до|от|по|для|без|при|од|моих)$/i.test(t);
}

function unusedAngles(strategy: StrategyPayload, insights: ProfileInsights) {
  const used = (strategy.scripts || [])
    .filter((s) => !isSkeletonScript(s))
    .map((s) => `${s.title} ${s.source_angle || ""}`.toLowerCase());
  return insights.captionAngles.filter((angle) => {
    const key = angle.hookLine.toLowerCase();
    return !used.some((u) => {
      const words = key.split(/\s+/).filter((w) => w.length > 4);
      return words.filter((w) => u.includes(w)).length >= 2;
    });
  });
}

function scriptFromAngle(
  angle: { hookLine: string; views: number },
  index: number,
  duration: number,
  keyword: string,
): GeneratedScript {
  return scriptFromFact({
    angle,
    index,
    duration,
    keyword,
    contentMode: "process_no_speech",
  });
}

/**
 * LLM JSON often truncates after the first script. Fill 30/45s from unused
 * caption angles instead of talking-head placeholders.
 */
export function repairStrategy(
  strategy: StrategyPayload,
  insights: ProfileInsights,
  keyword: string,
): StrategyPayload {
  const durations = [15, 30, 45];
  const planned = (strategy.shoot_day?.order || []).map((o) => o.script_title);
  const angles = unusedAngles(strategy, insights);
  const scripts = [...(strategy.scripts || [])];

  while (scripts.length < 3) {
    scripts.push(
      scriptFromAngle(
        angles[scripts.length] || insights.captionAngles[scripts.length] || {
          hookLine: planned[scripts.length] || "Процесс из профиля",
          views: 0,
        },
        scripts.length,
        durations[scripts.length] || 30,
        keyword,
      ),
    );
  }

  const filled = scripts.slice(0, 3).map((script, i) => {
    let next: GeneratedScript;
    if (!isSkeletonScript(script)) {
      next = {
        ...script,
        duration_sec: durations[i],
        comment_keyword: keyword,
        source_angle: script.source_angle || angles[i]?.hookLine || script.title,
      };
    } else {
      const plannedTitle = planned[i];
      const angle =
        angles.find((a) =>
          plannedTitle
            ? a.hookLine.toLowerCase().includes(plannedTitle.toLowerCase().slice(0, 12))
            : false,
        ) ||
        angles[i] ||
        insights.captionAngles[i] || {
          hookLine: plannedTitle || script.title,
          views: 0,
        };
      next = scriptFromAngle(angle, i, durations[i], keyword);
    }
    if (isTruncatedCopy(next.caption) || (next.caption || "").length < 28) {
      next = {
        ...next,
        caption: `${next.title}. Напиши «${keyword}» в комментариях.`,
      };
    }
    return next;
  });

  return polishCatalog({ ...strategy, scripts: filled }, insights);
}

function angleKey(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const head = words.slice(0, 3);
  const tail = words.slice(-3);
  return [...new Set([...head, ...tail])].join(" ");
}

function polishCatalog(
  strategy: StrategyPayload,
  insights: ProfileInsights,
): StrategyPayload {
  const leftover = unusedAngles(strategy, insights);
  const seen = new Set<string>();
  const scripts = (strategy.scripts || []).map((script) => {
    const key = angleKey(script.source_angle || script.title);
    if (key && !seen.has(key)) {
      seen.add(key);
      return script;
    }
    const next = leftover.find((a) => !seen.has(angleKey(a.hookLine)));
    if (!next) return script;
    seen.add(angleKey(next.hookLine));
    return { ...script, source_angle: next.hookLine };
  });

  const extras = leftover
    .filter((angle) => !isWeakAngle(angle.hookLine))
    .slice(0, 4)
    .map((angle, i) => ({
    title: sliceWords(angle.hookLine, 56),
    hook: sliceWords(angle.hookLine, 72),
    pillar: "ассортимент",
    duration_sec: i % 2 === 0 ? 15 : 30,
  }));
  const shoot = strategy.shoot_day;
  if (!shoot) return { ...strategy, scripts };
  const current = Array.isArray(shoot.extra_ideas) ? shoot.extra_ideas : [];
  const usedKeys = new Set(scripts.map((s) => angleKey(s.title || s.source_angle || "")));
  const merged = extras.length
    ? [...extras, ...current]
        .filter((idea, idx, arr) => {
          const k = angleKey(idea.title || idea.hook || "");
          if (!k || usedKeys.has(k)) return false;
          if (
            scripts.some((s) => {
              const sk = angleKey(s.title || s.source_angle || "").split(" ");
              const ik = k.split(" ");
              return ik.filter((w) => sk.includes(w)).length >= 2;
            })
          ) {
            return false;
          }
          return arr.findIndex((x) => angleKey(x.title || x.hook || "") === k) === idx;
        })
        .slice(0, 4)
    : current;

  return {
    ...strategy,
    scripts,
    shoot_day: {
      ...shoot,
      extra_ideas: merged,
      order: scripts.map((script, i) => ({
        shoot_order: i + 1,
        script_title: script.title,
        duration_sec: script.duration_sec || [15, 30, 45][i],
        note:
          shoot.order?.[i]?.note ||
          (i === 0 ? "Снимай первым — разогрев" : "Тот же образ"),
      })),
    },
  };
}
