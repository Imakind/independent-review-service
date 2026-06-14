import type { ModerationAction, ReportReason, ReviewStatus } from "./types.js";

export const REPORT_REASONS: Record<ReportReason, string> = {
  spam: "Спам",
  defamation: "Клевета",
  personal_data: "Персональные данные",
  duplicate: "Дубликат",
  insufficient_evidence: "Недостаточно доказательств",
};

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && Object.hasOwn(REPORT_REASONS, value);
}

export function isModerationAction(value: unknown): value is ModerationAction {
  return value === "publish" || value === "reject" || value === "hide";
}

export function statusFromModerationAction(action: ModerationAction): ReviewStatus {
  const statuses: Record<ModerationAction, ReviewStatus> = {
    publish: "published",
    reject: "rejected",
    hide: "hidden",
  };

  return statuses[action];
}

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === "pending" || value === "published" || value === "rejected" || value === "hidden";
}
