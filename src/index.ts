import "dotenv/config";
import { createBot } from "./bot/bot.js";
import { createPool } from "./db/pool.js";
import { PostgresReviewRepository } from "./db/postgresRepository.js";
import { InMemoryReviewRepository } from "./domain/repository.js";

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("BOT_TOKEN is required. Copy .env.example to .env and set a Telegram bot token.");
  process.exit(1);
}

const pool = process.env.DATABASE_URL ? createPool() : null;
const repository = pool ? new PostgresReviewRepository(pool) : new InMemoryReviewRepository();
const bot = createBot(token, repository);

bot.start({
  onStart: (info) => {
    console.log(`Bot started as @${info.username}`);
  },
});
