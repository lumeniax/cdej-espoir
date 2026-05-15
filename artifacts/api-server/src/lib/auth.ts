import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.REFRESH_SECRET;
  if (!secret) throw new Error("REFRESH_SECRET environment variable is required");
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export interface JwtPayload {
  userId: string;
  role: string;
}

export function createAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role } as JwtPayload, getJwtSecret(), {
    expiresIn: "15m",
    algorithm: "HS256",
  });
}

export function createRefreshToken(userId: string): string {
  return jwt.sign({ userId }, getRefreshSecret(), {
    expiresIn: "7d",
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
    if (!payload.userId || !payload.role) return null;
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, getRefreshSecret()) as jwt.JwtPayload;
    if (!payload.userId) return null;
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export async function getUserFromAccessToken(token: string) {
  const data = verifyAccessToken(token);
  if (!data) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, data.userId));
  return user || null;
}
