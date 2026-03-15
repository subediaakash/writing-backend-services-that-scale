import type { Response, CookieOptions } from "express";

const isProduction = process.env.NODE_ENV === "production";

const commonOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
};

export function setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string
) {
    res.cookie("access_token", accessToken, {
        ...commonOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refresh_token", refreshToken, {
        ...commonOptions,
        path: "/api/auth/refresh",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
}

export function clearAuthCookies(res: Response) {
    res.clearCookie("access_token", commonOptions);
    res.clearCookie("refresh_token", { ...commonOptions, path: "/api/auth/refresh" });
}
