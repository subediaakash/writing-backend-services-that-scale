import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";
import { setAuthCookies, clearAuthCookies } from "../../utils/cookie";

function getSessionMeta(req: Request) {
    return {
        userAgent: req.headers["user-agent"] || "unknown",
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
    };
}

export async function signup(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: "Name, email, and password are required" });
            return;
        }

        if (typeof email !== "string" || !email.includes("@")) {
            res.status(400).json({ success: false, message: "Invalid email format" });
            return;
        }

        if (typeof password !== "string" || password.length < 8) {
            res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
            return;
        }

        const result = await authService.signup(
            { name: name.trim(), email: email.trim().toLowerCase(), password },
            getSessionMeta(req)
        );

        setAuthCookies(res, result.accessToken, result.refreshToken);

        res.status(201).json({ success: true, user: result.user });
    } catch (error) {
        next(error);
    }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ success: false, message: "Email and password are required" });
            return;
        }

        const result = await authService.login(
            { email: email.trim().toLowerCase(), password },
            getSessionMeta(req)
        );

        setAuthCookies(res, result.accessToken, result.refreshToken);

        res.json({ success: true, user: result.user });
    } catch (error) {
        next(error);
    }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
    try {
        const refreshToken = req.cookies?.refresh_token;

        await authService.logout(req.user!.userId, refreshToken);

        clearAuthCookies(res);

        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const currentRefreshToken = req.cookies?.refresh_token;

        const result = await authService.refresh(currentRefreshToken, getSessionMeta(req));

        setAuthCookies(res, result.accessToken, result.refreshToken);

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

export async function me(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await authService.getMe(req.user!.userId);

        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
}
