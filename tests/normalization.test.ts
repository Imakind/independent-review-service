import { describe, expect, it } from "vitest";
import { normalizeIdentifier } from "../src/domain/normalization.js";

describe("normalizeIdentifier", () => {
  it("normalizes a website domain", () => {
    const result = normalizeIdentifier("https://www.Example.com/?utm_source=tg");

    expect(result.objectType).toBe("website");
    expect(result.identifierType).toBe("domain");
    expect(result.platformKey).toBe("website");
    expect(result.normalizedValue).toBe("example.com");
  });

  it("normalizes a website profile path", () => {
    const result = normalizeIdentifier("https://example.com/seller/Ivan123?utm_source=tg&ref=abc");

    expect(result.objectType).toBe("website_profile");
    expect(result.identifierType).toBe("url_path");
    expect(result.normalizedValue).toBe("example.com/seller/ivan123");
    expect(result.parentNormalizedValue).toBe("example.com");
  });

  it("normalizes a Telegram link as an app profile", () => {
    const result = normalizeIdentifier("https://t.me/Seller123");

    expect(result.objectType).toBe("app_profile");
    expect(result.platformKey).toBe("telegram");
    expect(result.identifierType).toBe("username");
    expect(result.normalizedValue).toBe("seller123");
  });

  it("marks a bare username as ambiguous", () => {
    const result = normalizeIdentifier("@Seller123");

    expect(result.platformKey).toBe("unknown");
    expect(result.identifierType).toBe("username");
    expect(result.normalizedValue).toBe("seller123");
    expect(result.isAmbiguous).toBe(true);
  });

  it("normalizes a WhatsApp link to a phone identifier", () => {
    const result = normalizeIdentifier("https://wa.me/77001234567");

    expect(result.platformKey).toBe("whatsapp");
    expect(result.identifierType).toBe("phone");
    expect(result.normalizedValue).toBe("+77001234567");
  });
});
