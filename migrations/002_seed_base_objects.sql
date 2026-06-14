INSERT INTO objects (id, type, parent_object_id, platform_key, title)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'app', null, 'telegram', 'Telegram'),
  ('00000000-0000-0000-0000-000000000002', 'website', null, 'website', 'example.com')
ON CONFLICT (id) DO UPDATE
SET
  type = EXCLUDED.type,
  parent_object_id = EXCLUDED.parent_object_id,
  platform_key = EXCLUDED.platform_key,
  title = EXCLUDED.title,
  updated_at = now();

INSERT INTO object_identifiers (
  id,
  object_id,
  identifier_type,
  platform_key,
  normalized_value,
  display_value
)
VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'service_name',
    'telegram',
    'telegram',
    'Telegram'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000002',
    'domain',
    'website',
    'example.com',
    'example.com'
  )
ON CONFLICT (platform_key, identifier_type, normalized_value) DO UPDATE
SET
  object_id = EXCLUDED.object_id,
  display_value = EXCLUDED.display_value;
