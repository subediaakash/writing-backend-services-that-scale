import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
    schema: "./src/db/schema/schemas.ts",
    out: "./drizzle/migrations",
    dialect: "postgresql",           // or "mysql" / "sqlite"
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    verbose: true,
});