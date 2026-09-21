import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const STARTER_SUBJECTS = [
  { slug: "math", name: "Mathematics", description: "Algebra, geometry, and calculus fundamentals." },
  { slug: "biology", name: "Biology", description: "Cell biology, genetics, and ecology." },
  { slug: "english", name: "English", description: "Reading comprehension, grammar, and writing." },
];

const PLAN_TEMPLATES = [
  { name: "1 Month", durationDays: 30, priceCents: 499 },
  { name: "3 Months", durationDays: 90, priceCents: 1299 },
  { name: "1 Year", durationDays: 365, priceCents: 3999 },
];

async function main() {
  for (let i = 0; i < STARTER_SUBJECTS.length; i++) {
    const s = STARTER_SUBJECTS[i];
    const subject = await prisma.subject.upsert({
      where: { slug: s.slug },
      update: {},
      create: { ...s, isStarter: true, sortOrder: i },
    });

    for (const plan of PLAN_TEMPLATES) {
      const existing = await prisma.subscriptionPlan.findFirst({
        where: { subjectId: subject.id, name: plan.name },
      });
      if (!existing) {
        await prisma.subscriptionPlan.create({ data: { ...plan, subjectId: subject.id } });
      }
    }
  }

  const demoEmail = "demo@example.com";
  const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: demoEmail,
        name: "Demo Student",
        passwordHash: await bcrypt.hash("password123", 10),
      },
    });
    console.log(`Seeded demo user: ${demoEmail} / password123`);
  }

  console.log("Seed complete: 3 starter subjects with 3 plans each.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
