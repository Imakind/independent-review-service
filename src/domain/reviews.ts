import { normalizeIdentifier } from "./normalization.js";
import type { ReviewRepository } from "./repository.js";
import type { Review, ReviewCategory, ReviewObject, ReviewRating, ReviewSummary } from "./types.js";

export const REVIEW_CATEGORIES: Record<ReviewCategory, string> = {
  fraud: "Мошенничество",
  non_delivery: "Неисполнение сделки",
  quality: "Качество товара/услуги",
  communication: "Коммуникация",
  other: "Другое",
};

export async function createReviewForTarget(
  repository: ReviewRepository,
  input: {
    target: string;
    authorUserId: string;
    rating: ReviewRating;
    category: ReviewCategory;
    text: string;
    evidenceRefs?: string[];
  },
): Promise<{ object: ReviewObject; review: Review }> {
  const query = normalizeIdentifier(input.target);
  const parentObject = query.parentNormalizedValue
    ? (await repository.findObjectByIdentifier("website", query.parentNormalizedValue)) ??
      (await repository.findObjectByPlatformKey(query.parentNormalizedValue))
    : null;

  const object = await repository.ensureObjectWithIdentifier({
    type: query.objectType,
    parentObjectId: parentObject?.id ?? null,
    platformKey: query.platformKey,
    title: query.displayValue || query.normalizedValue || input.target,
    identifierType: query.identifierType,
    normalizedValue: query.normalizedValue,
    displayValue: query.displayValue || input.target,
  });

  const review = await repository.createReview({
    objectId: object.id,
    authorUserId: input.authorUserId,
    rating: input.rating,
    category: input.category,
    text: input.text,
    evidenceRefs: input.evidenceRefs ?? [],
    status: "pending",
  });

  return { object, review };
}

export function summarizeReviews(reviews: Review[]): ReviewSummary {
  return reviews.reduce<ReviewSummary>(
    (summary, review) => {
      summary.total += 1;
      summary[review.rating] += 1;
      return summary;
    },
    {
      total: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
    },
  );
}

export function isReviewCategory(value: unknown): value is ReviewCategory {
  return typeof value === "string" && Object.hasOwn(REVIEW_CATEGORIES, value);
}

export function isReviewRating(value: unknown): value is ReviewRating {
  return value === "positive" || value === "neutral" || value === "negative";
}
