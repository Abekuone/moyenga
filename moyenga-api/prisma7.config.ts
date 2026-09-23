import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://nassirou:nassirou@localhost:5432/moyenga_db?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seeds/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
