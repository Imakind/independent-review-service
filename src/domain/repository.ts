import type { ObjectIdentifier, Review, ReviewObject } from "./types.js";

export interface ReviewRepository {
  findObjectById(objectId: string): Promise<ReviewObject | null>;
  findObjectByIdentifier(platformKey: string, normalizedValue: string): Promise<ReviewObject | null>;
  findObjectByPlatformKey(platformKey: string): Promise<ReviewObject | null>;
  findObjectsByLooseValue(normalizedValue: string): Promise<ReviewObject[]>;
  findIdentifiersByValue(normalizedValue: string): Promise<ObjectIdentifier[]>;
  findReviewsByObjectId(objectId: string): Promise<Review[]>;
  ensureObjectWithIdentifier(input: {
    type: ReviewObject["type"];
    parentObjectId: string | null;
    platformKey: string;
    title: string;
    identifierType: ObjectIdentifier["identifierType"];
    normalizedValue: string;
    displayValue: string;
  }): Promise<ReviewObject>;
  createReview(input: {
    objectId: string;
    authorUserId: string;
    rating: Review["rating"];
    category: Review["category"];
    text: string;
    evidenceRefs: string[];
    status: Review["status"];
  }): Promise<Review>;
}

const now = new Date("2026-06-14T00:00:00.000Z");

const objects: ReviewObject[] = [
  {
    id: "obj_telegram",
    type: "app",
    parentObjectId: null,
    platformKey: "telegram",
    title: "Telegram",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "obj_example",
    type: "website",
    parentObjectId: null,
    platformKey: "website",
    title: "example.com",
    createdAt: now,
    updatedAt: now,
  },
];

const identifiers: ObjectIdentifier[] = [
  {
    id: "id_telegram",
    objectId: "obj_telegram",
    identifierType: "service_name",
    platformKey: "telegram",
    normalizedValue: "telegram",
    displayValue: "Telegram",
    createdAt: now,
  },
  {
    id: "id_example",
    objectId: "obj_example",
    identifierType: "domain",
    platformKey: "website",
    normalizedValue: "example.com",
    displayValue: "example.com",
    createdAt: now,
  },
];

const reviews: Review[] = [];

export class InMemoryReviewRepository implements ReviewRepository {
  async findObjectById(objectId: string): Promise<ReviewObject | null> {
    return findObject(objectId);
  }

  async findObjectByIdentifier(platformKey: string, normalizedValue: string): Promise<ReviewObject | null> {
    const identifier = identifiers.find(
      (item) => item.platformKey === platformKey && item.normalizedValue === normalizedValue,
    );
    return identifier ? findObject(identifier.objectId) : null;
  }

  async findObjectByPlatformKey(platformKey: string): Promise<ReviewObject | null> {
    return objects.find((object) => object.platformKey === platformKey && object.parentObjectId === null) ?? null;
  }

  async findObjectsByLooseValue(normalizedValue: string): Promise<ReviewObject[]> {
    const matchedIds = identifiers
      .filter((identifier) => identifier.normalizedValue.includes(normalizedValue))
      .map((identifier) => identifier.objectId);

    return objects.filter((object) => matchedIds.includes(object.id));
  }

  async findIdentifiersByValue(normalizedValue: string): Promise<ObjectIdentifier[]> {
    return identifiers.filter((identifier) => identifier.normalizedValue === normalizedValue);
  }

  async findReviewsByObjectId(objectId: string): Promise<Review[]> {
    return reviews.filter((review) => review.objectId === objectId && review.status === "published");
  }

  async ensureObjectWithIdentifier(input: {
    type: ReviewObject["type"];
    parentObjectId: string | null;
    platformKey: string;
    title: string;
    identifierType: ObjectIdentifier["identifierType"];
    normalizedValue: string;
    displayValue: string;
  }): Promise<ReviewObject> {
    const existing = await this.findObjectByIdentifier(input.platformKey, input.normalizedValue);
    if (existing) {
      return existing;
    }

    const object: ReviewObject = {
      id: `obj_${objects.length + 1}`,
      type: input.type,
      parentObjectId: input.parentObjectId,
      platformKey: input.platformKey,
      title: input.title,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    objects.push(object);
    identifiers.push({
      id: `id_${identifiers.length + 1}`,
      objectId: object.id,
      identifierType: input.identifierType,
      platformKey: input.platformKey,
      normalizedValue: input.normalizedValue,
      displayValue: input.displayValue,
      createdAt: new Date(),
    });

    return object;
  }

  async createReview(input: {
    objectId: string;
    authorUserId: string;
    rating: Review["rating"];
    category: Review["category"];
    text: string;
    evidenceRefs: string[];
    status: Review["status"];
  }): Promise<Review> {
    const review: Review = {
      id: `review_${reviews.length + 1}`,
      objectId: input.objectId,
      authorUserId: input.authorUserId,
      rating: input.rating,
      category: input.category,
      text: input.text,
      evidenceRefs: input.evidenceRefs,
      status: input.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    reviews.push(review);
    return review;
  }
}

function findObject(objectId: string): ReviewObject | null {
  return objects.find((object) => object.id === objectId) ?? null;
}
