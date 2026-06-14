import type { Context, SessionFlavor } from "grammy";
import type { ReviewCategory, ReviewRating } from "../domain/types.js";

export type BotMode =
  | "idle"
  | "waiting_check_input"
  | "waiting_review_target"
  | "waiting_review_rating"
  | "waiting_review_category"
  | "waiting_review_text";

export interface BotSession {
  mode: BotMode;
  reviewTarget?: string;
  reviewRating?: ReviewRating;
  reviewCategory?: ReviewCategory;
}

export type BotContext = Context & SessionFlavor<BotSession>;

export function initialSession(): BotSession {
  return {
    mode: "idle",
  };
}
