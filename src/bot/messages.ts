import type { SearchResult } from "../domain/types.js";

export const START_TEXT = [
  "Independent Review Service",
  "",
  "Проверка сайтов, приложений, аккаунтов и контактов по независимым отзывам.",
  "",
  "Выберите действие.",
].join("\n");

export const HELP_TEXT = [
  "Помощь",
  "",
  "/check — проверить объект.",
  "/review — оставить отзыв.",
  "/rules — правила публикации.",
  "",
  "Можно отправить сайт, ссылку, username, t.me-ссылку, Instagram-ссылку, wa.me-ссылку или телефон.",
].join("\n");

export const RULES_TEXT = [
  "Правила публикации",
  "",
  "- Пишите только о личном опыте.",
  "- Отделяйте факт сделки от оценки.",
  "- Не публикуйте лишние персональные данные.",
  "- Доказательства повышают доверие к отзыву.",
  "- Спам, клевета и доксинг будут скрываться.",
].join("\n");

export function formatSearchResult(result: SearchResult): string {
  const lines = [
    "Результат проверки",
    "",
    `Ввод: ${result.query.rawInput}`,
    `Нормальная форма: ${result.query.normalizedValue || "нет"}`,
    `Платформа: ${result.query.platformKey}`,
    `Тип совпадения: ${translateMatchType(result.matchType)}`,
  ];

  if (result.object) {
    lines.push("", `Объект: ${result.object.title}`, `Отзывы: ${result.reviews.length}`);
  }

  if (result.parentObject) {
    lines.push(
      "",
      "Точного объекта пока нет.",
      `Есть связанный родительский объект: ${result.parentObject.title}`,
      `Отзывы по нему: ${result.reviews.length}`,
    );
  }

  if (result.similarObjects.length > 0) {
    lines.push("", "Похожие объекты:");
    for (const object of result.similarObjects.slice(0, 5)) {
      lines.push(`- ${object.title}`);
    }
  }

  if (result.matchType === "ambiguous_match") {
    lines.push("", "Username без платформы неоднозначен. Уточните Telegram, Instagram, TikTok или другое приложение.");
  }

  if (result.matchType === "no_match") {
    lines.push("", "Данных пока нет. Это не означает, что объект безопасен.");
  }

  return lines.join("\n");
}

function translateMatchType(matchType: SearchResult["matchType"]): string {
  const labels: Record<SearchResult["matchType"], string> = {
    exact_match: "точное",
    domain_match: "по сайту",
    platform_match: "по приложению",
    similar_match: "похожее",
    ambiguous_match: "неоднозначное",
    no_match: "нет данных",
  };

  return labels[matchType];
}
