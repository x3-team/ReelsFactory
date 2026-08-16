export type ViralAngle = "error" | "process" | "myth_or_contrast";

export type ViralSkeleton = {
  id: string;
  angle: ViralAngle;
  durationSec: number;
  triggerType: "shock_mistake" | "behind_the_scenes_step" | "myth_busting" | "counter_intuitive";
  titleTemplate: string;
  hookTemplates: string[];
  visualCue: {
    start0_3s: string;
    midAction: string;
    finalCta: string;
  };
  teleprompterStructure: {
    hookRange: string;
    problemRange: string;
    demoRange: string;
    ctaRange: string;
  };
};

/**
 * База виральных скелетов (проверенные структуры миллионников для 15с / 30с / 45с)
 */
export const VIRAL_SKELETONS: Record<ViralAngle, ViralSkeleton> = {
  error: {
    id: "skel_15s_error",
    angle: "error",
    durationSec: 15,
    triggerType: "shock_mistake",
    titleTemplate: "{{product_or_niche}}: ошибка, из-за которой всё плывёт",
    hookTemplates: [
      "Стоп. {{fact_or_action}} не потому что {{common_excuse}}.",
      "Если {{problem_or_failure}} — проверь вот эту одну деталь.",
      "Одна главная ошибка в {{product_or_niche}}, о которой молчат.",
    ],
    visualCue: {
      start0_3s: "[Крупный план / Стоп-кадр] Покажи ключевой предмет или жест «Стоп» прямо перед объективом",
      midAction: "[Динамичный фокус] Демонстрация проблемы крупно в руках за 3 секунды",
      finalCta: "[Текст на экране] Плашка с ключевым словом для комментария/сохранения",
    },
    teleprompterStructure: {
      hookRange: "0–3с",
      problemRange: "3–8с",
      demoRange: "8–12с",
      ctaRange: "12–15с",
    },
  },
  process: {
    id: "skel_30s_process",
    angle: "process",
    durationSec: 30,
    triggerType: "behind_the_scenes_step",
    titleTemplate: "Как сделать {{product_or_niche}} без косяков: 1 приём",
    hookTemplates: [
      "Косяки в {{product_or_niche}} появляются не в конце, а в самом начале.",
      "Смотри, на каком моменте я останавливаю {{key_action}}.",
      "Три шага в {{product_or_niche}} без магии и воды.",
    ],
    visualCue: {
      start0_3s: "[Средний план] Автор начинает действие с интригующей фразы в камеру",
      midAction: "[Смена ракурса / Макро] Процесс выполнения шага от первого лица (POV)",
      finalCta: "[Взгляд в камеру] Финальный результат крупным планом + призыв к действию",
    },
    teleprompterStructure: {
      hookRange: "0–3с",
      problemRange: "3–16с",
      demoRange: "16–24с",
      ctaRange: "24–30с",
    },
  },
  myth_or_contrast: {
    id: "skel_45s_myth",
    angle: "myth_or_contrast",
    durationSec: 45,
    triggerType: "myth_busting",
    titleTemplate: "Миф про {{product_or_niche}}: почему все делают не так",
    hookTemplates: [
      "Вам внушили, что {{product_or_niche}} — это сложно и долго. Это миф.",
      "Сравните: как делают 90% людей и как получить результат сразу.",
      "Перестаньте верить в этот миф про {{product_or_niche}}.",
    ],
    visualCue: {
      start0_3s: "[Сплит-скрин или резкая смена кадра] Сравнение «Было / Стало» или «Ожидание / Реальность»",
      midAction: "[Плавный монтаж] Наглядное доказательство правильного метода шаг за шагом",
      finalCta: "[Прямой контакт] Призыв сохранить или написать кодовое слово",
    },
    teleprompterStructure: {
      hookRange: "0–3с",
      problemRange: "3–22с",
      demoRange: "22–38с",
      ctaRange: "38–45с",
    },
  },
};

export function getViralSkeleton(angle: ViralAngle): ViralSkeleton {
  return VIRAL_SKELETONS[angle] || VIRAL_SKELETONS.error;
}
