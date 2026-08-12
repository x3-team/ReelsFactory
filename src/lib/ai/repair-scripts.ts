import type { ProfileInsights } from "@/lib/content/profile-insights";
import type { GeneratedScript, StrategyPayload } from "@/lib/types";

const SKELETON_TITLE = /^сценарий\s*\d+/i;
const PADDED_TELEPROMPTER = /смотрите в камеру[\s\S]*ошибка аудитории/i;

export function isSkeletonScript(script: GeneratedScript): boolean {
  if (SKELETON_TITLE.test(script.title || "")) return true;
  if (PADDED_TELEPROMPTER.test(script.teleprompter_script || "")) return true;
  return false;
}

export function processTeleprompter(
  hook: string,
  duration: number,
  keyword: string,
): string {
  const mid = Math.max(8, Math.round(duration * 0.55));
  const preCta = Math.max(12, duration - 4);
  return [
    `0–3с: Крупный план. Текст на экране: «${hook.slice(0, 70)}»`,
    `3–${mid}с: Показываем процесс / ошибку крупно, без речи в камеру.`,
    `${mid}–${preCta}с: Результат — текстура, разлом или готовый десерт.`,
    `${preCta}–${duration}с: Надпись: «Напиши ${keyword} в комментарии».`,
  ].join("\n");
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
  const hook = angle.hookLine.slice(0, 72);
  const variants = [
    hook,
    `Как это выглядит крупным планом`,
    `Один разлом — и сразу видно, получилось ли`,
  ];
  if (index === 1) {
    variants[1] = `Повтори этот кадр — текстура скажет всё`;
    variants[2] = `Смотри, чем домашний десерт отличается от магазинного`;
  }
  if (index === 2) {
    variants[1] = `Секрет в одном движении, не в дорогих формах`;
    variants[2] = `Сохрани, если собираешься снимать процесс`;
  }
  return {
    title: hook.replace(/[!.?…🔥💔💚]+$/g, "").slice(0, 56) || `Ролик ${duration}с`,
    format: "процесс",
    duration_sec: duration,
    shoot_order: index + 1,
    comment_keyword: keyword,
    hook_options: variants.map((h) => h.slice(0, 90)),
    teleprompter_script: processTeleprompter(hook, duration, keyword),
    caption: `${hook} Напиши «${keyword}» в комментариях — пришлю материал.`,
    cta: `Напиши ${keyword} в комментариях`,
    source_angle: hook,
    shot_list: [
      `Крупный план: ${hook.slice(0, 50)}`,
      "Руки и текстура без лица в кадре",
      "Результат в разломе или в готовом виде",
      `Текст на экране: напиши «${keyword}»`,
    ],
    props_checklist: ["штатив", "готовая деталь для крупного плана"],
  };
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
    if (!isSkeletonScript(script)) {
      return {
        ...script,
        duration_sec: durations[i],
        comment_keyword: keyword,
        source_angle: script.source_angle || angles[i]?.hookLine || script.title,
      };
    }
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
    return scriptFromAngle(angle, i, durations[i], keyword);
  });

  return { ...strategy, scripts: filled };
}
