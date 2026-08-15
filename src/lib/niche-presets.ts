/** Niche presets for RU/CIS creators — skip abstract ToV when possible */

export const NICHE_PRESETS = [
  {
    id: "beauty",
    label: "Красота / салон",
    pain: "запись, до/после, мифы ухода",
    defaultOffer: "бесплатная консультация или чеклист ухода",
  },
  {
    id: "realty",
    label: "Недвижимость",
    pain: "ошибки при покупке, районы, ипотека",
    defaultOffer: "подбор объектов / разбор заявки",
  },
  {
    id: "clinic",
    label: "Клиника / здоровье",
    pain: "симптомы, подготовка к приёму, мифы",
    defaultOffer: "запись на приём / чеклист симптомов",
  },
  {
    id: "coach",
    label: "Коуч / эксперт",
    pain: "ошибки учеников, фреймворки, кейсы",
    defaultOffer: "бесплатный разбор / мини-гайд",
  },
  {
    id: "shop",
    label: "Магазин / e-com",
    pain: "выбор товара, распаковка, сравнение",
    defaultOffer: "промокод / подборка",
  },
  {
    id: "edtech",
    label: "Обучение / инфобиз",
    pain: "мифы профессии, домашка, результаты учеников",
    defaultOffer: "бесплатный урок / чеклист",
  },
  {
    id: "food",
    label: "Еда / HoReCa",
    pain: "рецепты, ошибки на кухне, закулисье",
    defaultOffer: "меню / бронь / рецепт",
  },
  {
    id: "smm",
    label: "SMM / агентство",
    pain: "хуки, удержание, контент-система",
    defaultOffer: "аудит аккаунта / чеклист",
  },
  {
    id: "custom",
    label: "Своя ниша",
    pain: "под ваш оффер и аудиторию",
    defaultOffer: "лидмагнит из оффера",
  },
] as const;

export type NichePresetId = (typeof NICHE_PRESETS)[number]["id"];

export function getNichePreset(id?: string | null) {
  return NICHE_PRESETS.find((p) => p.id === id) || null;
}
