# База данных

## Назначение

PostgreSQL хранит:

- объекты проверки;
- идентификаторы объектов;
- отзывы;
- жалобы;
- события модерации.

## Подключение

Переменная окружения:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/independent_review_service
```

Если `DATABASE_URL` не задан, приложение использует in-memory репозиторий. Это удобно для локального запуска без базы, но данные не сохраняются после остановки процесса.

## Локальный запуск PostgreSQL

Если установлен Docker:

```bash
docker compose up -d postgres
```

Затем применить миграции:

```bash
npm run db:migrate
```

## Postgres MCP

В конфигурацию Codex добавлен MCP-сервер:

```text
postgresql://postgres:postgres@localhost:5432/independent_review_service
```

Фактический просмотр таблиц через Postgres MCP возможен только после запуска PostgreSQL по этому адресу.

## Таблицы

### objects

Родительские и дочерние объекты:

- сайт;
- приложение;
- профиль внутри сайта;
- аккаунт внутри приложения;
- телефон;
- сервис;
- псевдоним.

### object_identifiers

Нормализованные идентификаторы объектов.

Ключевой индекс:

```sql
platform_key, normalized_value
```

Он нужен для основной формулы поиска:

```text
platform_key + identifier_type + normalized_value
```

### reviews

Отзывы пользователей.

Новые отзывы сохраняются со статусом `pending`.

### reports

Жалобы на отзывы.

### moderation_events

История модерационных действий.

## Admin API

Если задан `ADMIN_TOKEN`, admin-запросы должны передавать его в заголовке:

```text
x-admin-token: value
```

В dev-режиме без `ADMIN_TOKEN` admin-endpoints открыты локально.

## Проверочные SQL-запросы

Список таблиц:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Объекты и идентификаторы:

```sql
SELECT
  o.type,
  o.title,
  oi.platform_key,
  oi.identifier_type,
  oi.normalized_value
FROM objects o
JOIN object_identifiers oi ON oi.object_id = o.id
ORDER BY o.created_at;
```

Новые отзывы на модерации:

```sql
SELECT id, object_id, author_user_id, category, created_at
FROM reviews
WHERE status = 'pending'
ORDER BY created_at DESC;
```
