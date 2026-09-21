import { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "./auth";

// Blocks access to a subject's content unless the user has a currently
// active (non-expired) subscription for it. subjectId is read from
// req.params.subjectId — routes that gate by exam should resolve the
// exam's subjectId first and set req.params.subjectId before calling this.
export async function requireActiveSubscription(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const { subjectId } = req.params;
  const userId = req.userId!;

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      subjectId,
      status: "active",
      endAt: { gt: new Date() },
    },
  });

  if (!subscription) {
    return res.status(403).json({
      error: "No active subscription for this subject",
      code: "SUBSCRIPTION_REQUIRED",
    });
  }

  next();
}
