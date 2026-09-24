import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PLAN_TEMPLATES, SUBJECTS } from "./seedData";

const prisma = new PrismaClient();
const LABELS = ["A", "B", "C", "D"];

async function main() {
  let questionCount = 0;

  for (const [si, s] of SUBJECTS.entries()) {
    const subjectId = `subj_${s.key}`;
    await prisma.subject.upsert({
      where: { id: subjectId },
      update: { name: s.name, description: s.description, sortOrder: si, slug: s.key },
      create: { id: subjectId, slug: s.key, name: s.name, description: s.description, sortOrder: si },
    });

    for (const p of PLAN_TEMPLATES) {
      const planId = `plan_${s.key}_${p.key}`;
      await prisma.subscriptionPlan.upsert({
        where: { id: planId },
        update: { name: p.name, durationDays: p.durationDays, price: p.price },
        create: { id: planId, subjectId, name: p.name, durationDays: p.durationDays, price: p.price },
      });
    }

    for (const [li, l] of s.lessons.entries()) {
      const lessonId = `les_${s.key}_${l.key}`;
      await prisma.lesson.upsert({
        where: { id: lessonId },
        update: { name: l.name, description: l.description, sortOrder: li },
        create: { id: lessonId, subjectId, name: l.name, description: l.description, sortOrder: li },
      });

      for (const [qi, q] of l.questions.entries()) {
        const questionId = `q_${s.key}_${l.key}_${String(qi + 1).padStart(2, "0")}`;
        const fields = {
          lessonId,
          order: qi,
          type: "MULTIPLE_CHOICE" as const,
          prompt: q.q,
          explanation: q.explanation,
          isTrial: Boolean(q.trial),
        };
        await prisma.question.upsert({
          where: { id: questionId },
          update: fields,
          create: { id: questionId, ...fields },
        });

        for (const [ci, text] of q.choices.entries()) {
          const choiceId = `${questionId}_${LABELS[ci]}`;
          const choice = { order: ci, label: LABELS[ci], text, isCorrect: ci === q.answer };
          await prisma.choice.upsert({
            where: { id: choiceId },
            update: choice,
            create: { id: choiceId, questionId, ...choice },
          });
        }
        questionCount++;
      }
    }
  }

  const demoEmail = "demo@example.com";
  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      id: "user_demo",
      email: demoEmail,
      name: "Туршилтын хэрэглэгч",
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });

  console.log(`Seed complete: ${SUBJECTS.length} subjects, ${questionCount} bank questions, demo user ${demoEmail}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
