import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function signAccessToken(userId: string) {
    return jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(userId: string) {
    return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

export function verifyAccessToken(token: string) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string };
}

export function verifyRefreshToken(token: string) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
}
