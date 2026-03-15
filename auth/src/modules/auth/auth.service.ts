import { eq, and } from "drizzle-orm";
import { db } from "../../db/db";
import { users } from "../../db/schema/user.schema";
import { sessions } from "../../db/schema/session.schema";
import { hashPassword, verifyPassword } from "../../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { logger } from "../../config/logger";

interface SignupInput {
    name: string;
    email: string;
    password: string;
}

interface LoginInput {
    email: string;
    password: string;
}

interface SessionMeta {
    userAgent: string;
    ipAddress: string;
}

// ── Signup ──────────────────────────────────────────────────────────────

export async function signup(data: SignupInput, meta: SessionMeta) {
    const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

    if (existing.length > 0) {
        throw createError(409, "Email already registered");
    }

    const passwordHash = await hashPassword(data.password);

    const rows = await db
        .insert(users)
        .values({
            name: data.name,
            email: data.email,
            passwordHash,
        })
        .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            createdAt: users.createdAt,
        });

    const user = rows[0];
    if (!user) {
        throw createError(500, "Failed to create user");
    }

    const { accessToken, refreshToken } = generateTokenPair(user.id);

    await createSession(user.id, refreshToken, meta);

    return { user, accessToken, refreshToken };
}

// ── Login ───────────────────────────────────────────────────────────────

export async function login(data: LoginInput, meta: SessionMeta) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

    if (!user || !user.isActive) {
        throw createError(401, "Invalid email or password");
    }

    const valid = await verifyPassword(user.passwordHash, data.password);
    if (!valid) {
        throw createError(401, "Invalid email or password");
    }

    const { accessToken, refreshToken } = generateTokenPair(user.id);

    await createSession(user.id, refreshToken, meta);

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
    };
}

// ── Logout ──────────────────────────────────────────────────────────────

export async function logout(userId: string, refreshToken: string) {
    const result = await db
        .update(sessions)
        .set({
            isActive: false,
            revokedAt: new Date(),
        })
        .where(
            and(
                eq(sessions.userId, userId),
                eq(sessions.refreshToken, refreshToken),
                eq(sessions.isActive, true)
            )
        );

    logger.info({ userId }, "Session revoked");
    return result;
}

// ── Refresh Token Rotation ──────────────────────────────────────────────

export async function refresh(currentRefreshToken: string, meta: SessionMeta) {
    if (!currentRefreshToken) {
        throw createError(401, "Refresh token required");
    }

    // Verify the JWT refresh token
    let payload: { userId: string };
    try {
        payload = verifyRefreshToken(currentRefreshToken);
    } catch {
        throw createError(401, "Invalid or expired refresh token");
    }

    // Find the active session with this token
    const [session] = await db
        .select()
        .from(sessions)
        .where(
            and(
                eq(sessions.refreshToken, currentRefreshToken),
                eq(sessions.userId, payload.userId),
                eq(sessions.isActive, true)
            )
        )
        .limit(1);

    if (!session) {
        // Potential token reuse attack — revoke ALL sessions for this user
        logger.warn({ userId: payload.userId }, "Refresh token reuse detected, revoking all sessions");
        await db
            .update(sessions)
            .set({ isActive: false, revokedAt: new Date() })
            .where(eq(sessions.userId, payload.userId));

        throw createError(401, "Session invalid. Please log in again.");
    }

    // Rotate: revoke old token, issue new pair
    await db
        .update(sessions)
        .set({ isActive: false, revokedAt: new Date() })
        .where(eq(sessions.id, session.id));

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(payload.userId);

    await createSession(payload.userId, newRefreshToken, meta);

    return { accessToken, refreshToken: newRefreshToken };
}

// ── Get Current User ────────────────────────────────────────────────────

export async function getMe(userId: string) {
    const [user] = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            createdAt: users.createdAt,
        })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.isActive, true)))
        .limit(1);

    if (!user) {
        throw createError(404, "User not found");
    }

    return user;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function generateTokenPair(userId: string) {
    return {
        accessToken: signAccessToken(userId),
        refreshToken: signRefreshToken(userId),
    };
}

async function createSession(userId: string, refreshToken: string, meta: SessionMeta) {
    await db.insert(sessions).values({
        userId,
        refreshToken,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
    });
}

function createError(statusCode: number, message: string) {
    const error = new Error(message) as Error & { statusCode: number };
    error.statusCode = statusCode;
    return error;
}
