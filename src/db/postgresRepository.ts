import type pg from "pg";
import type { ObjectIdentifier, Review, ReviewObject } from "../domain/types.js";
import type { ReviewRepository } from "../domain/repository.js";

type ObjectRow = {
  id: string;
  type: ReviewObject["type"];
  parent_object_id: string | null;
  platform_key: string;
  title: string;
  created_at: Date;
  updated_at: Date;
};

type IdentifierRow = {
  id: string;
  object_id: string;
  identifier_type: ObjectIdentifier["identifierType"];
  platform_key: string;
  normalized_value: string;
  display_value: string;
  created_at: Date;
};

type ReviewRow = {
  id: string;
  object_id: string;
  author_user_id: string;
  rating: Review["rating"];
  category: Review["category"];
  text: string;
  evidence_refs: string[];
  status: Review["status"];
  created_at: Date;
  updated_at: Date;
};

export class PostgresReviewRepository implements ReviewRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findObjectById(objectId: string): Promise<ReviewObject | null> {
    const result = await this.pool.query<ObjectRow>(
      `
        SELECT *
        FROM objects
        WHERE id = $1
        LIMIT 1
      `,
      [objectId],
    );

    return result.rows[0] ? mapObject(result.rows[0]) : null;
  }

  async findObjectByIdentifier(platformKey: string, normalizedValue: string): Promise<ReviewObject | null> {
    const result = await this.pool.query<ObjectRow>(
      `
        SELECT o.*
        FROM objects o
        JOIN object_identifiers oi ON oi.object_id = o.id
        WHERE oi.platform_key = $1
          AND oi.normalized_value = $2
        ORDER BY oi.created_at ASC
        LIMIT 1
      `,
      [platformKey, normalizedValue],
    );

    return result.rows[0] ? mapObject(result.rows[0]) : null;
  }

  async findObjectByPlatformKey(platformKey: string): Promise<ReviewObject | null> {
    const result = await this.pool.query<ObjectRow>(
      `
        SELECT *
        FROM objects
        WHERE platform_key = $1
          AND parent_object_id IS NULL
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [platformKey],
    );

    return result.rows[0] ? mapObject(result.rows[0]) : null;
  }

  async findObjectsByLooseValue(normalizedValue: string): Promise<ReviewObject[]> {
    const result = await this.pool.query<ObjectRow>(
      `
        SELECT DISTINCT o.*
        FROM objects o
        JOIN object_identifiers oi ON oi.object_id = o.id
        WHERE oi.normalized_value ILIKE $1
        ORDER BY o.created_at ASC
        LIMIT 5
      `,
      [`%${normalizedValue}%`],
    );

    return result.rows.map(mapObject);
  }

  async findIdentifiersByValue(normalizedValue: string): Promise<ObjectIdentifier[]> {
    const result = await this.pool.query<IdentifierRow>(
      `
        SELECT *
        FROM object_identifiers
        WHERE normalized_value = $1
        ORDER BY created_at ASC
      `,
      [normalizedValue],
    );

    return result.rows.map(mapIdentifier);
  }

  async findReviewsByObjectId(objectId: string): Promise<Review[]> {
    const result = await this.pool.query<ReviewRow>(
      `
        SELECT *
        FROM reviews
        WHERE object_id = $1
          AND status = 'published'
        ORDER BY created_at DESC
        LIMIT 10
      `,
      [objectId],
    );

    return result.rows.map(mapReview);
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

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const objectResult = await client.query<ObjectRow>(
        `
          INSERT INTO objects (type, parent_object_id, platform_key, title)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
        [input.type, input.parentObjectId, input.platformKey, input.title],
      );

      const object = objectResult.rows[0];
      await client.query(
        `
          INSERT INTO object_identifiers (
            object_id,
            identifier_type,
            platform_key,
            normalized_value,
            display_value
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (platform_key, identifier_type, normalized_value) DO NOTHING
        `,
        [object.id, input.identifierType, input.platformKey, input.normalizedValue, input.displayValue],
      );

      await client.query("COMMIT");
      return mapObject(object);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createReview(input: {
    objectId: string;
    authorUserId: string;
    rating: Review["rating"];
    category: string;
    text: string;
    evidenceRefs: string[];
    status: Review["status"];
  }): Promise<Review> {
    const result = await this.pool.query<ReviewRow>(
      `
        INSERT INTO reviews (
          object_id,
          author_user_id,
          rating,
          category,
          text,
          evidence_refs,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        RETURNING *
      `,
      [
        input.objectId,
        input.authorUserId,
        input.rating,
        input.category,
        input.text,
        JSON.stringify(input.evidenceRefs),
        input.status,
      ],
    );

    return mapReview(result.rows[0]);
  }
}

function mapObject(row: ObjectRow): ReviewObject {
  return {
    id: row.id,
    type: row.type,
    parentObjectId: row.parent_object_id,
    platformKey: row.platform_key,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapIdentifier(row: IdentifierRow): ObjectIdentifier {
  return {
    id: row.id,
    objectId: row.object_id,
    identifierType: row.identifier_type,
    platformKey: row.platform_key,
    normalizedValue: row.normalized_value,
    displayValue: row.display_value,
    createdAt: row.created_at,
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    objectId: row.object_id,
    authorUserId: row.author_user_id,
    rating: row.rating,
    category: row.category,
    text: row.text,
    evidenceRefs: row.evidence_refs,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
