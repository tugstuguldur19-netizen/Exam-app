import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http";

// Route params are plain strings for every route in this API (no wildcards).
export interface AuthedRequest extends Request<Record<string, string>> {
  userId?: string;
}

export function issueToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: "30d" });
}

// Besides verifying the token, confirms the user still exists — a token can
// outlive its account (deleted user, reset database), and every downstream
// query would otherwise fail with an opaque foreign-key error.
export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Нэвтэрнэ үү.", "SESSION_EXPIRED");
  }
  let userId: string;
  try {
    const payload = jwt.verify(header.slice("Bearer ".length), env.jwtSecret) as { sub: string };
    userId = payload.sub;
  } catch {
    throw new HttpError(401, "Нэвтрэх хугацаа дууссан. Дахин нэвтэрнэ үү.", "SESSION_EXPIRED");
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new HttpError(401, "Бүртгэл олдсонгүй. Дахин нэвтэрнэ үү.", "SESSION_EXPIRED");
  req.userId = userId;
  next();
}
