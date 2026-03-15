import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { env } from "../config/env";

export function errorHandler(
    err: Error & { statusCode?: number },
    req: Request,
    res: Response,
    _next: NextFunction
) {
    const status = err.statusCode || 500;

    logger.error({
        message: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        status,
    });

    res.status(status).json({
        success: false,
        message: env.isProduction ? "Internal Server Error" : err.message,
    });
}
