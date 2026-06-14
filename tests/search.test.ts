import { describe, expect, it } from "vitest";
import { normalizeIdentifier } from "../src/domain/normalization.js";
import { InMemoryReviewRepository } from "../src/domain/repository.js";
import { searchObject } from "../src/domain/search.js";

describe("searchObject", () => {
  const repository = new InMemoryReviewRepository();

  it("returns exact match for known domain", async () => {
    const result = await searchObject(normalizeIdentifier("example.com"), repository);

    expect(result.matchType).toBe("exact_match");
    expect(result.object?.title).toBe("example.com");
  });

  it("returns domain match for unknown page on known domain", async () => {
    const result = await searchObject(normalizeIdentifier("https://example.com/seller/ivan123"), repository);

    expect(result.matchType).toBe("domain_match");
    expect(result.parentObject?.title).toBe("example.com");
  });

  it("returns platform match for unknown profile on known app", async () => {
    const result = await searchObject(normalizeIdentifier("https://t.me/seller123"), repository);

    expect(result.matchType).toBe("platform_match");
    expect(result.parentObject?.title).toBe("Telegram");
  });

  it("does not treat bare username as exact match", async () => {
    const result = await searchObject(normalizeIdentifier("@seller123"), repository);

    expect(result.matchType).toBe("ambiguous_match");
    expect(result.object).toBeNull();
  });
});
