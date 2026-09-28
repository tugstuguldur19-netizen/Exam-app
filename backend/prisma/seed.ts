import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PLAN_TEMPLATES, SUBJECTS as BASE_SUBJECTS } from "./seedData";
import { EXTRA_QUESTIONS } from "./seedDataExtra";
import { FIDIC_SUBJECT } from "./seedFidic";
import { loadContent } from "./content";

const prisma = new PrismaClient();
const SUBJECTS = [...BASE_SUBJECTS, FIDIC_SUBJECT];

// Built-in questions display Mongolian labels (А Б В Г); ids keep Latin
// suffixes so they stay stable and ASCII.
const LABELS = ["А", "Б", "В", "Г"];
const ID_SUFFIX = "ABCDEFGHIJ";

type SeedQuestion = {
  id: string;
  prompt: string;
  choices: { label: string; text: string; isCorrect: boolean }[];
  correctText: string | null;
  explanation: string | null;
  trial: boolean;
};

function lessonQuestions(subjectKey: string, lesson: (typeof SUBJECTS)[number]["lessons"][number]): SeedQuestion[] {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const builtIn = [...lesson.questions, ...(EXTRA_QUESTIONS[`${subjectKey}/${lesson.key}`] ?? [])].map((q, i) => ({
    id: `q_${subjectKey}_${lesson.key}_${pad2(i + 1)}`,
    prompt: q.q,
    choices: q.choices.map((text, ci) => ({ label: LABELS[ci], text, isCorrect: ci === q.answer })),
    correctText: null,
    explanation: q.explanation,
    trial: Boolean(q.trial),
  }));
  // Imported questions get their own id namespace ("c" + position in file).
  const imported = loadContent(subjectKey, lesson.key).map((q, i) => ({
    id: `q_${subjectKey}_${lesson.key}_c${String(i + 1).padStart(3, "0")}`,
    prompt: q.q.trim(),
    choices: q.choices.map((c, ci) => ({ label: c.label, text: c.text, isCorrect: ci === q.answer })),
    correctText: q.choices.length === 0 ? (q.correctText?.trim() || null) : null,
    explanation: q.explanation?.trim() || null,
    trial: Boolean(q.trial),
  }));
  return [...builtIn, ...imported];
}

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

      const questions = lessonQuestions(s.key, l);
      for (const [qi, q] of questions.entries()) {
        const fields = {
          lessonId,
          order: qi,
          type: q.choices.length ? ("MULTIPLE_CHOICE" as const) : ("SHORT_ANSWER" as const),
          prompt: q.prompt,
          correctText: q.correctText,
          explanation: q.explanation,
          isTrial: q.trial,
        };
        await prisma.question.upsert({ where: { id: q.id }, update: fields, create: { id: q.id, ...fields } });

        const choiceIds: string[] = [];
        for (const [ci, c] of q.choices.entries()) {
          const choiceId = `${q.id}_${ID_SUFFIX[ci] ?? ci}`;
          choiceIds.push(choiceId);
          const choice = { order: ci, label: c.label, text: c.text, isCorrect: c.isCorrect };
          await prisma.choice.upsert({ where: { id: choiceId }, update: choice, create: { id: choiceId, questionId: q.id, ...choice } });
        }
        await prisma.choice.deleteMany({ where: { questionId: q.id, id: { notIn: choiceIds } } });
        questionCount++;
      }
      // Questions removed from the bank (e.g. a shorter re-import) go away.
      await prisma.question.deleteMany({ where: { lessonId, id: { notIn: questions.map((q) => q.id) } } });
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
