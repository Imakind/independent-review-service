import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { isModerationAction, isReportReason, isReviewStatus, statusFromModerationAction } from "../domain/moderation.js";
import { normalizeIdentifier } from "../domain/normalization.js";
import type { ReviewRepository } from "../domain/repository.js";
import { createReviewForTarget, isReviewCategory, isReviewRating, summarizeReviews } from "../domain/reviews.js";
import { searchObject } from "../domain/search.js";

type ApiHandler = (request: IncomingMessage, response: ServerResponse, url: URL) => Promise<void>;

export function createApiServer(repository: ReviewRepository): Server {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    try {
      const route = findRoute(request.method ?? "GET", url);
      if (!route) {
        sendJson(response, 404, { error: "not_found" });
        return;
      }

      await route(request, response, url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      sendJson(response, 500, { error: "internal_error", message });
    }
  });

  function findRoute(method: string, url: URL): ApiHandler | null {
    if (method === "GET" && url.pathname === "/health") {
      return getHealth;
    }

    if (method === "POST" && url.pathname === "/search") {
      return postSearch;
    }

    if (method === "GET" && /^\/objects\/[^/]+$/.test(url.pathname)) {
      return getObject;
    }

    if (method === "POST" && url.pathname === "/reviews") {
      return postReview;
    }

    if (method === "POST" && url.pathname === "/reports") {
      return postReport;
    }

    if (method === "GET" && url.pathname === "/admin/reviews") {
      return getAdminReviews;
    }

    if (method === "POST" && /^\/admin\/reviews\/[^/]+\/moderate$/.test(url.pathname)) {
      return postAdminModerateReview;
    }

    return null;
  }

  async function getHealth(_request: IncomingMessage, response: ServerResponse): Promise<void> {
    sendJson(response, 200, {
      status: "ok",
      service: "independent-review-service",
    });
  }

  async function postSearch(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const body = await readJson<{ query?: unknown }>(request);
    if (typeof body.query !== "string" || !body.query.trim()) {
      sendJson(response, 400, { error: "query_required" });
      return;
    }

    const normalized = normalizeIdentifier(body.query);
    const result = await searchObject(normalized, repository);
    sendJson(response, 200, result);
  }

  async function getObject(_request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    const objectId = decodeURIComponent(url.pathname.split("/")[2] ?? "");
    const object = await repository.findObjectById(objectId);

    if (!object) {
      sendJson(response, 404, { error: "object_not_found" });
      return;
    }

    const reviews = await repository.findReviewsByObjectId(object.id);
    sendJson(response, 200, {
      object,
      summary: summarizeReviews(reviews),
      reviews,
    });
  }

  async function postReview(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const body = await readJson<{
      target?: unknown;
      authorUserId?: unknown;
      rating?: unknown;
      category?: unknown;
      text?: unknown;
      evidenceRefs?: unknown;
    }>(request);

    if (typeof body.target !== "string" || !body.target.trim()) {
      sendJson(response, 400, { error: "target_required" });
      return;
    }

    if (!isReviewRating(body.rating)) {
      sendJson(response, 400, { error: "rating_invalid" });
      return;
    }

    if (!isReviewCategory(body.category)) {
      sendJson(response, 400, { error: "category_invalid" });
      return;
    }

    if (typeof body.text !== "string" || body.text.trim().length < 10) {
      sendJson(response, 400, { error: "text_too_short" });
      return;
    }

    const evidenceRefs =
      Array.isArray(body.evidenceRefs) && body.evidenceRefs.every((item) => typeof item === "string")
        ? body.evidenceRefs
        : [];

    const result = await createReviewForTarget(repository, {
      target: body.target,
      authorUserId: typeof body.authorUserId === "string" && body.authorUserId ? body.authorUserId : "api",
      rating: body.rating,
      category: body.category,
      text: body.text.trim(),
      evidenceRefs,
    });

    sendJson(response, 201, result);
  }

  async function postReport(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const body = await readJson<{
      reviewId?: unknown;
      reporterUserId?: unknown;
      reason?: unknown;
      comment?: unknown;
    }>(request);

    if (typeof body.reviewId !== "string" || !body.reviewId.trim()) {
      sendJson(response, 400, { error: "review_id_required" });
      return;
    }

    const review = await repository.findReviewById(body.reviewId);
    if (!review) {
      sendJson(response, 404, { error: "review_not_found" });
      return;
    }

    if (!isReportReason(body.reason)) {
      sendJson(response, 400, { error: "reason_invalid" });
      return;
    }

    const report = await repository.createReport({
      reviewId: body.reviewId,
      reporterUserId:
        typeof body.reporterUserId === "string" && body.reporterUserId ? body.reporterUserId : "api",
      reason: body.reason,
      comment: typeof body.comment === "string" && body.comment.trim() ? body.comment.trim() : null,
    });

    sendJson(response, 201, { report });
  }

  async function getAdminReviews(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    if (!isAdminRequest(request)) {
      sendJson(response, 401, { error: "admin_token_required" });
      return;
    }

    const status = url.searchParams.get("status") ?? "pending";
    if (!isReviewStatus(status)) {
      sendJson(response, 400, { error: "status_invalid" });
      return;
    }

    const reviews = await repository.findReviewsByStatus(status);
    sendJson(response, 200, { reviews });
  }

  async function postAdminModerateReview(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    if (!isAdminRequest(request)) {
      sendJson(response, 401, { error: "admin_token_required" });
      return;
    }

    const reviewId = decodeURIComponent(url.pathname.split("/")[3] ?? "");
    const body = await readJson<{
      action?: unknown;
      actorUserId?: unknown;
      comment?: unknown;
    }>(request);

    if (!isModerationAction(body.action)) {
      sendJson(response, 400, { error: "action_invalid" });
      return;
    }

    const review = await repository.updateReviewStatus({
      reviewId,
      status: statusFromModerationAction(body.action),
      actorUserId: typeof body.actorUserId === "string" && body.actorUserId ? body.actorUserId : "admin",
      action: body.action,
      comment: typeof body.comment === "string" && body.comment.trim() ? body.comment.trim() : null,
    });

    if (!review) {
      sendJson(response, 404, { error: "review_not_found" });
      return;
    }

    sendJson(response, 200, { review });
  }
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function isAdminRequest(request: IncomingMessage): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return true;
  }

  return request.headers["x-admin-token"] === token;
}
