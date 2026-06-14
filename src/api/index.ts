import "dotenv/config";
import { createApiServer } from "./http.js";
import { createPool } from "../db/pool.js";
import { PostgresReviewRepository } from "../db/postgresRepository.js";
import { InMemoryReviewRepository } from "../domain/repository.js";

const port = Number(process.env.API_PORT ?? 3000);
const pool = process.env.DATABASE_URL ? createPool() : null;
const repository = pool ? new PostgresReviewRepository(pool) : new InMemoryReviewRepository();
const server = createApiServer(repository);

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
