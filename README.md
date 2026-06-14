# Independent Review Service

## Статус

Проект находится на стадии MVP-разработки.

Текущий фокус:

- концепция поиска по сайтам, приложениям и аккаунтам;
- нормализация идентификаторов;
- легкий Telegram-интерфейс;
- базовая доменная логика до подключения постоянной базы данных.

## Суть проекта

Independent Review Service — сервис независимых отзывов о продавцах, аккаунтах, сервисах и контактах.

Пользователь может проверить внешний идентификатор и увидеть историю отзывов вне исходной платформы.

Примеры объектов:

- сайт или домен;
- сервис внутри сайта;
- приложение;
- аккаунт внутри приложения;
- Telegram / Instagram / WhatsApp-профиль;
- номер телефона;
- username;
- профиль продавца на маркетплейсе.

## Главный принцип поиска

Поиск строится не по свободному названию, а по нормализованному идентификатору:

```text
platform_key + identifier_type + normalized_value
```

Примеры:

```text
telegram + username + seller123
instagram + username + seller123
website + domain + example.com
website + url_path + example.com/seller/ivan123
whatsapp + phone + +77001234567
```

Одинаковые username в разных приложениях считаются разными объектами, пока нет подтвержденной связи.

## Архитектурная идея

Сайт или приложение — родительский объект.

Аккаунт, продавец, магазин, профиль или страница внутри платформы — дочерний объект.

Пример:

```text
Object: example.com
type: website
parent_object_id: null

Object: example.com/seller/ivan123
type: marketplace_profile
parent_object_id: example.com
```

## Telegram MVP

Пользовательский интерфейс должен быть коротким и понятным:

- команды не требуют знания структуры сервиса;
- основные действия доступны кнопками;
- бот явно показывает тип совпадения;
- неоднозначные результаты не выдаются как точные;
- после каждого результата доступны действия: оставить отзыв, уточнить поиск, открыть правила.

Команды:

- `/start` — главное меню;
- `/check` — проверка объекта;
- `/review` — создание отзыва;
- `/rules` — правила публикации;
- `/help` — справка.

## Документы

- [План разработки](docs/DEVELOPMENT_PLAN.md)
- [Концепция поиска](docs/SEARCH_CONCEPT.md)
- [База данных](docs/DATABASE.md)

## Backend API

- `GET /health` — состояние сервиса.
- `POST /search` — поиск по идентификатору.
- `GET /objects/:id` — карточка объекта со сводкой опубликованных отзывов.
- `POST /reviews` — создание отзыва со статусом `pending`.
- `POST /reports` — жалоба на отзыв.
- `GET /admin/reviews?status=pending` — список отзывов для модерации.
- `POST /admin/reviews/:id/moderate` — публикация, отклонение или скрытие отзыва.

## Локальный запуск

```bash
npm install
npm run test
npm run api:dev
npm run dev
```

Для постоянного хранения нужен PostgreSQL:

```bash
npm run db:migrate
```

Для запуска Telegram-бота нужен токен:

```bash
BOT_TOKEN=123456:token npm run dev
```

## Проверяемые источники

- Telegram Bot API: https://core.telegram.org/bots/api
- Telegram Bot Features: https://core.telegram.org/bots/features
- grammY documentation: https://grammy.dev/
- PostgreSQL documentation: https://www.postgresql.org/docs/
- Docker documentation: https://docs.docker.com/
