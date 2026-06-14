import { Bot, session } from "grammy";
import { normalizeIdentifier } from "../domain/normalization.js";
import { InMemoryReviewRepository } from "../domain/repository.js";
import type { ReviewRepository } from "../domain/repository.js";
import { createReviewForTarget } from "../domain/reviews.js";
import { searchObject } from "../domain/search.js";
import {
  cancelKeyboard,
  mainMenuKeyboard,
  resultKeyboard,
  reviewCategoryKeyboard,
  reviewRatingKeyboard,
} from "./keyboards.js";
import { HELP_TEXT, RULES_TEXT, START_TEXT, formatSearchResult } from "./messages.js";
import { type BotContext, initialSession } from "./session.js";

export function createBot(token: string, repository: ReviewRepository = new InMemoryReviewRepository()): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  bot.use(session({ initial: initialSession }));

  bot.command("start", async (ctx) => {
    ctx.session.mode = "idle";
    await ctx.reply(START_TEXT, { reply_markup: mainMenuKeyboard() });
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(HELP_TEXT, { reply_markup: mainMenuKeyboard() });
  });

  bot.command("rules", async (ctx) => {
    await ctx.reply(RULES_TEXT, { reply_markup: mainMenuKeyboard() });
  });

  bot.command("check", async (ctx) => {
    await askForCheckInput(ctx);
  });

  bot.command("review", async (ctx) => {
    await askForReviewTarget(ctx);
  });

  bot.callbackQuery("check:start", async (ctx) => {
    await ctx.answerCallbackQuery();
    await askForCheckInput(ctx);
  });

  bot.callbackQuery("review:start", async (ctx) => {
    await ctx.answerCallbackQuery();
    await askForReviewTarget(ctx);
  });

  bot.callbackQuery(/^review:rating:(positive|neutral|negative)$/, async (ctx) => {
    const rating = ctx.match[1] as "positive" | "neutral" | "negative";
    ctx.session.reviewRating = rating;
    ctx.session.mode = "waiting_review_category";
    await ctx.answerCallbackQuery();
    await ctx.reply("Выберите категорию.", { reply_markup: reviewCategoryKeyboard() });
  });

  bot.callbackQuery(/^review:category:(fraud|non_delivery|quality|communication|other)$/, async (ctx) => {
    const category = ctx.match[1] as "fraud" | "non_delivery" | "quality" | "communication" | "other";
    ctx.session.reviewCategory = category;
    ctx.session.mode = "waiting_review_text";
    await ctx.answerCallbackQuery();
    await ctx.reply(
      [
        "Коротко опишите опыт.",
        "",
        "Формат: факт сделки, что произошло, есть ли доказательства.",
        "Не публикуйте лишние персональные данные.",
      ].join("\n"),
      { reply_markup: cancelKeyboard() },
    );
  });

  bot.callbackQuery("rules:show", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(RULES_TEXT, { reply_markup: mainMenuKeyboard() });
  });

  bot.callbackQuery("help:show", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(HELP_TEXT, { reply_markup: mainMenuKeyboard() });
  });

  bot.callbackQuery("flow:cancel", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.mode = "idle";
    delete ctx.session.reviewTarget;
    delete ctx.session.reviewRating;
    delete ctx.session.reviewCategory;
    await ctx.reply("Действие отменено.", { reply_markup: mainMenuKeyboard() });
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();

    if (ctx.session.mode === "waiting_check_input") {
      const query = normalizeIdentifier(text);
      const result = await searchObject(query, repository);
      ctx.session.mode = "idle";
      await ctx.reply(formatSearchResult(result), { reply_markup: resultKeyboard() });
      return;
    }

    if (ctx.session.mode === "waiting_review_target") {
      ctx.session.reviewTarget = text;
      ctx.session.mode = "waiting_review_rating";
      await ctx.reply("Выберите тип отзыва.", { reply_markup: reviewRatingKeyboard() });
      return;
    }

    if (ctx.session.mode === "waiting_review_rating") {
      await ctx.reply("Нажмите одну из кнопок: положительный, нейтральный или негативный.", {
        reply_markup: reviewRatingKeyboard(),
      });
      return;
    }

    if (ctx.session.mode === "waiting_review_category") {
      await ctx.reply("Нажмите одну из кнопок категории.", {
        reply_markup: reviewCategoryKeyboard(),
      });
      return;
    }

    if (ctx.session.mode === "waiting_review_text") {
      const target = ctx.session.reviewTarget ?? "не указан";
      await createReviewForTarget(repository, {
        target,
        authorUserId: String(ctx.from?.id ?? "unknown"),
        rating: ctx.session.reviewRating ?? "neutral",
        category: ctx.session.reviewCategory ?? "other",
        text,
        evidenceRefs: [],
      });

      ctx.session.mode = "idle";
      delete ctx.session.reviewTarget;
      delete ctx.session.reviewRating;
      delete ctx.session.reviewCategory;

      await ctx.reply(
        [
          "Отзыв сохранен.",
          "",
          `Объект: ${target}`,
          "Статус: pending",
          "",
          "После модерации он сможет появиться в карточке объекта.",
        ].join("\n"),
        { reply_markup: mainMenuKeyboard() },
      );
      return;
    }

    await ctx.reply("Выберите действие.", { reply_markup: mainMenuKeyboard() });
  });

  bot.catch((error) => {
    console.error("Bot error", error);
  });

  return bot;
}

async function askForCheckInput(ctx: BotContext): Promise<void> {
  ctx.session.mode = "waiting_check_input";
  await ctx.reply("Отправьте сайт, ссылку, username, t.me/instagram/wa.me-ссылку или телефон.", {
    reply_markup: cancelKeyboard(),
  });
}

async function askForReviewTarget(ctx: BotContext): Promise<void> {
  ctx.session.mode = "waiting_review_target";
  await ctx.reply("Отправьте объект отзыва: сайт, ссылку, username или телефон.", {
    reply_markup: cancelKeyboard(),
  });
}
