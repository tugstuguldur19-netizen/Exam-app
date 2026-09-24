import { Router } from "express";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, zodMessage } from "../lib/http";
import { AuthedRequest, issueToken, requireAuth } from "../middleware/auth";
import { activeSubscriptions } from "../services/access";

export const authRouter = Router();

// Credential stuffing / signup-spam guard. Keyed by IP (express-rate-limit's
// default), so it won't stop a targeted attack on one account from a botnet,
// but it kills the common case of a single client hammering the endpoint.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.", code: "RATE_LIMITED" },
});

const email = z
  .string({ required_error: "И-мэйл хаягаа оруулна уу." })
  .trim()
  .toLowerCase()
  .email("И-мэйл хаяг буруу байна.");

const registerSchema = z.object({
  email,
  password: z
    .string({ required_error: "Нууц үгээ оруулна уу." })
    .min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт байна.")
    .max(200, "Нууц үг хэт урт байна."),
  name: z
    .string({ required_error: "Нэрээ оруулна уу." })
    .trim()
    .min(1, "Нэрээ оруулна уу.")
    .max(80, "Нэр хэт урт байна."),
});

const loginSchema = z.object({
  email,
  password: z.string({ required_error: "Нууц үгээ оруулна уу." }).min(1, "Нууц үгээ оруулна уу."),
});

const publicUser = (u: { id: string; email: string; name: string; createdAt: Date }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  createdAt: u.createdAt,
});

authRouter.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error), "VALIDATION");
  const { email, password, name } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, "Энэ и-мэйл хаягаар бүртгэл үүссэн байна.", "EMAIL_TAKEN");
  }
  const user = await prisma.user.create({
    data: { email, name, passwordHash: await bcrypt.hash(password, 10) },
  });
  res.status(201).json({ token: issueToken(user.id), user: publicUser(user) });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error), "VALIDATION");
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "И-мэйл эсвэл нууц үг буруу байна.", "INVALID_CREDENTIALS");
  }
  res.json({ token: issueToken(user.id), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
  const subs = await activeSubscriptions(user.id);
  const subjects = await prisma.subject.findMany({
    where: { id: { in: [...subs.keys()] } },
    select: { id: true, name: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json({
    user: publicUser(user),
    subscriptions: subjects.map((s) => ({
      subjectId: s.id,
      subjectName: s.name,
      subjectSlug: s.slug,
      planName: subs.get(s.id)!.planName,
      endAt: subs.get(s.id)!.endAt,
    })),
  });
});

const updateSchema = z.object({ name: registerSchema.shape.name });

authRouter.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error), "VALIDATION");
  const user = await prisma.user.update({ where: { id: req.userId! }, data: { name: parsed.data.name } });
  res.json({ user: publicUser(user) });
});

const passwordSchema = z.object({
  currentPassword: z.string({ required_error: "Одоогийн нууц үгээ оруулна уу." }).min(1, "Одоогийн нууц үгээ оруулна уу."),
  newPassword: registerSchema.shape.password,
});

authRouter.post("/change-password", authLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error), "VALIDATION");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    throw new HttpError(400, "Одоогийн нууц үг буруу байна.", "INVALID_CREDENTIALS");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  res.json({ ok: true });
});
