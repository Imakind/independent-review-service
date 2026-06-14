import { InlineKeyboard } from "grammy";

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Проверить", "check:start")
    .text("Оставить отзыв", "review:start")
    .row()
    .text("Правила", "rules:show")
    .text("Помощь", "help:show");
}

export function resultKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Оставить отзыв", "review:start")
    .text("Новый поиск", "check:start")
    .row()
    .text("Правила", "rules:show");
}

export function cancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("Отмена", "flow:cancel");
}

export function reviewRatingKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Положительный", "review:rating:positive")
    .row()
    .text("Нейтральный", "review:rating:neutral")
    .row()
    .text("Негативный", "review:rating:negative")
    .row()
    .text("Отмена", "flow:cancel");
}
