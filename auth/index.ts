import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { env } from "./src/config/env";
import { logger } from "./src/config/logger";
import { requestLogger } from "./src/middleware/logger.middleware";
import { errorHandler } from "./src/middleware/error.middleware";
import authRoutes from "./src/modules/auth/auth.routes";

export const app = express();

// Security
app.use(helmet());
app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
}));

// Parsers
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Health check
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "up", service: "auth-service" });
});

// Routes
app.use("/api/auth", authRoutes);

// Error handler (must be after routes)
app.use(errorHandler);

const PORT = env.PORT;

if (process.env.NODE_ENV !== "test") {
    const server = app.listen(PORT, () => {
        logger.info(`Auth service running on port ${PORT}`);
    });

    const shutdown = () => {
        logger.info("Shutdown signal received. Closing server...");
        server.close(() => {
            logger.info("Server closed.");
            process.exit(0);
        });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}
