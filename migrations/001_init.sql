CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (
    type IN (
      'website',
      'app',
      'website_profile',
      'app_profile',
      'phone',
      'service',
      'person_alias'
    )
  ),
  parent_object_id uuid REFERENCES objects(id) ON DELETE SET NULL,
  platform_key text NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS object_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  identifier_type text NOT NULL CHECK (
    identifier_type IN (
      'domain',
      'url',
      'url_path',
      'username',
      'phone',
      'deep_link',
      'internal_id',
      'service_name'
    )
  ),
  platform_key text NOT NULL,
  normalized_value text NOT NULL,
  display_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_key, identifier_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_object_identifiers_lookup
  ON object_identifiers (platform_key, normalized_value);

CREATE INDEX IF NOT EXISTS idx_object_identifiers_loose
  ON object_identifiers (normalized_value);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  author_user_id text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('positive', 'neutral', 'negative')),
  category text NOT NULL,
  text text NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (status IN ('pending', 'published', 'rejected', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_object_status
  ON reviews (object_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reporter_user_id text NOT NULL,
  reason text NOT NULL,
  comment text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_review_status
  ON reports (review_id, status);

CREATE TABLE IF NOT EXISTS moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE SET NULL,
  actor_user_id text NOT NULL,
  action text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
