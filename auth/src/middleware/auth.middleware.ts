import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../utils/jwt";
import { logger } from "../config/logger";

export interface UserPayload {
    userId: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies?.access_token;

        if (!token) {
            logger.warn({ path: req.path, ip: req.ip }, "Auth failed: no token");
            res.status(401).json({
                success: false,
                message: "Authentication required. Please log in.",
            });
            return;
        }

        const decoded = verifyAccessToken(token);

        req.user = { userId: decoded.userId };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logger.info({ path: req.path }, "Auth failed: token expired");
            res.status(401).json({
                success: false,
                message: "Token expired. Please refresh your session.",
                code: "TOKEN_EXPIRED",
            });
            return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
            logger.warn({ error: error.message, path: req.path }, "Auth failed: invalid token");
            res.status(401).json({
                success: false,
                message: "Invalid token. Please log in again.",
            });
            return;
        }

        logger.error({ error, path: req.path }, "Auth middleware: internal error");
        res.status(500).json({
            success: false,
            message: "Internal server error during authentication.",
        });
    }
};
