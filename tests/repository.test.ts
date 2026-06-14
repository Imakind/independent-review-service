import { describe, expect, it } from "vitest";
import { InMemoryReviewRepository } from "../src/domain/repository.js";

describe("InMemoryReviewRepository", () => {
  it("creates an object with identifier and stores a pending review", async () => {
    const repository = new InMemoryReviewRepository();
    const object = await repository.ensureObjectWithIdentifier({
      type: "app_profile",
      parentObjectId: null,
      platformKey: "telegram",
      title: "@seller123",
      identifierType: "username",
      normalizedValue: "seller123",
      displayValue: "@seller123",
    });

    const review = await repository.createReview({
      objectId: object.id,
      authorUserId: "42",
      rating: "negative",
      category: "fraud",
      text: "Оплата была, товар не отправили.",
      evidenceRefs: [],
      status: "pending",
    });

    expect(review.status).toBe("pending");
    expect(review.rating).toBe("negative");
    expect(await repository.findObjectByIdentifier("telegram", "seller123")).toEqual(object);
  });
});
