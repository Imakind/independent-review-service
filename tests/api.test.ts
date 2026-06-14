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
});
