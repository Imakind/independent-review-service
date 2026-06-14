import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createApiServer } from "../src/api/http.js";
import { InMemoryReviewRepository } from "../src/domain/repository.js";

describe("API", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    server = createApiServer(new InMemoryReviewRepository());
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unexpected test server address.");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("returns health status", async () => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  it("searches by identifier", async () => {
    const response = await fetch(`${baseUrl}/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "example.com" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.matchType).toBe("exact_match");
    expect(body.object.title).toBe("example.com");
  });

  it("validates search input", async () => {
    const response = await fetch(`${baseUrl}/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "" }),
    });

    expect(response.status).toBe(400);
  });

  it("creates a pending review", async () => {
    const response = await fetch(`${baseUrl}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target: "https://t.me/seller123",
        authorUserId: "api-test",
        rating: "negative",
        category: "fraud",
        text: "Оплата была, товар не отправили.",
        evidenceRefs: ["https://example.com/evidence"],
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.object.platformKey).toBe("telegram");
    expect(body.review.status).toBe("pending");
    expect(body.review.category).toBe("fraud");
  });

  it("reports and moderates a review", async () => {
    const reviewResponse = await fetch(`${baseUrl}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target: "example.com/seller/ivan123",
        authorUserId: "api-test",
        rating: "negative",
        category: "non_delivery",
        text: "Оплата прошла, услуга не была оказана.",
      }),
    });
    const created = await reviewResponse.json();

    const reportResponse = await fetch(`${baseUrl}/reports`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reviewId: created.review.id,
        reporterUserId: "reporter",
        reason: "insufficient_evidence",
        comment: "Нет подтверждений.",
      }),
    });
    const reportBody = await reportResponse.json();

    expect(reportResponse.status).toBe(201);
    expect(reportBody.report.status).toBe("open");

    const pendingResponse = await fetch(`${baseUrl}/admin/reviews?status=pending`);
    const pendingBody = await pendingResponse.json();

    expect(pendingResponse.status).toBe(200);
    expect(pendingBody.reviews.some((review: { id: string }) => review.id === created.review.id)).toBe(true);

    const moderateResponse = await fetch(`${baseUrl}/admin/reviews/${created.review.id}/moderate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        actorUserId: "admin",
        comment: "Проверено для MVP.",
      }),
    });
    const moderated = await moderateResponse.json();

    expect(moderateResponse.status).toBe(200);
    expect(moderated.review.status).toBe("published");

    const objectResponse = await fetch(`${baseUrl}/objects/${created.object.id}`);
    const objectBody = await objectResponse.json();

    expect(objectBody.summary.total).toBe(1);
    expect(objectBody.summary.negative).toBe(1);
  });
});
