export type ObjectType =
  | "website"
  | "app"
  | "website_profile"
  | "app_profile"
  | "phone"
  | "service"
  | "person_alias";

export type IdentifierType =
  | "domain"
  | "url"
  | "url_path"
  | "username"
  | "phone"
  | "deep_link"
  | "internal_id"
  | "service_name";

export type MatchType =
  | "exact_match"
  | "domain_match"
  | "platform_match"
  | "similar_match"
  | "ambiguous_match"
  | "no_match";

export type ReviewRating = "positive" | "neutral" | "negative";

export type ReviewStatus = "pending" | "published" | "rejected" | "hidden";

export type ReviewCategory = "fraud" | "non_delivery" | "quality" | "communication" | "other";

export interface ReviewObject {
  id: string;
  type: ObjectType;
  parentObjectId: string | null;
  platformKey: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ObjectIdentifier {
  id: string;
  objectId: string;
  identifierType: IdentifierType;
  platformKey: string;
  normalizedValue: string;
  displayValue: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  objectId: string;
  authorUserId: string;
  rating: ReviewRating;
  category: ReviewCategory;
  text: string;
  evidenceRefs: string[];
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface NormalizedIdentifier {
  rawInput: string;
  objectType: ObjectType;
  identifierType: IdentifierType;
  platformKey: string;
  normalizedValue: string;
  displayValue: string;
  parentNormalizedValue: string | null;
  isAmbiguous: boolean;
}

export interface SearchResult {
  matchType: MatchType;
  query: NormalizedIdentifier;
  object: ReviewObject | null;
  parentObject: ReviewObject | null;
  similarObjects: ReviewObject[];
  reviews: Review[];
}

export interface ReviewSummary {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}
