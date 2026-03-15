import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export const env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT || "3001", 10),
    DATABASE_URL: requireEnv("DATABASE_URL"),
    JWT_ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",

    get isProduction() {
        return this.NODE_ENV === "production";
    },
} as const;
