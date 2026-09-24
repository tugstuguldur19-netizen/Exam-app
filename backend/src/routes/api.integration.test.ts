import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

// Runs against the seeded test database (see the pretest script).
const app = createApp();
const FIXTURES = path.join(__dirname, "../../test/fixtures");
const MATH = "subj_math";
const unique = () => `u${Date.now()}${Math.random().toString(36).slice(2, 8)}@example.com`;

async function register() {
  const res = await request(app)
    .post("/auth/register")
    .send({ email: unique(), password: "password123", name: "Бат" })
    .expect(201);
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function subscribe(token: string, subjectId = MATH) {
  const subject = await request(app).get(`/subjects/${subjectId}`).set(auth(token)).expect(200);
  await request(app)
    .post(`/subjects/${subjectId}/subscribe`)
    .set(auth(token))
    .send({ planId: subject.body.plans[0].id })
    .expect(201);
}

type TakeQuestion = { id: string; type: string; choices: { id: string }[] };

// Answers every question with its correct choice (looked up directly in the DB).
async function correctAnswers(questions: TakeQuestion[]) {
  const choices = await prisma.choice.findMany({
    where: { questionId: { in: questions.map((q) => q.id) }, isCorrect: true },
  });
  return questions.map((q) => ({ questionId: q.id, choiceId: choices.find((c) => c.questionId === q.id)?.id ?? null }));
}

async function wrongAnswers(questions: TakeQuestion[]) {
  const choices = await prisma.choice.findMany({
    where: { questionId: { in: questions.map((q) => q.id) }, isCorrect: false },
  });
  return questions.map((q) => ({ questionId: q.id, choiceId: choices.find((c) => c.questionId === q.id)!.id }));
}

afterAll(() => prisma.$disconnect());

describe("auth", () => {
  it("registers, logs in and returns the profile, with Mongolian errors", async () => {
    const email = unique();
    await request(app).post("/auth/register").send({ email, password: "password123", name: "Сараа" }).expect(201);
    const dup = await request(app).post("/auth/register").send({ email, password: "password123", name: "Сараа" });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe("EMAIL_TAKEN");

    const short = await request(app).post("/auth/register").send({ email: unique(), password: "123", name: "A" });
    expect(short.status).toBe(400);
    expect(short.body.error).toBe("Нууц үг хамгийн багадаа 8 тэмдэгт байна.");

    const bad = await request(app).post("/auth/login").send({ email, password: "wrong-password" });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe("И-мэйл эсвэл нууц үг буруу байна.");

    // Email is case-insensitive.
    const login = await request(app).post("/auth/login").send({ email: email.toUpperCase(), password: "password123" }).expect(200);
    const me = await request(app).get("/auth/me").set(auth(login.body.token)).expect(200);
    expect(me.body.user.name).toBe("Сараа");
    expect(me.body.subscriptions).toEqual([]);
  });

  it("rejects a valid token whose user no longer exists with SESSION_EXPIRED", async () => {
    const { token, userId } = await register();
    await prisma.user.delete({ where: { id: userId } });
    const res = await request(app).get("/subjects").set(auth(token));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("SESSION_EXPIRED");
  });

  it("changes name and password", async () => {
    const { token } = await register();
    await request(app).patch("/auth/me").set(auth(token)).send({ name: "Шинэ нэр" }).expect(200);
    const wrong = await request(app)
      .post("/auth/change-password")
      .set(auth(token))
      .send({ currentPassword: "nope", newPassword: "newpassword1" });
    expect(wrong.status).toBe(400);
    await request(app)
      .post("/auth/change-password")
      .set(auth(token))
      .send({ currentPassword: "password123", newPassword: "newpassword1" })
      .expect(200);
  });
});

describe("subjects", () => {
  it("lists the three subjects with lessons, trial counts and MNT plans", async () => {
    const { token } = await register();
    const res = await request(app).get("/subjects").set(auth(token)).expect(200);
    expect(res.body.map((s: { name: string }) => s.name)).toEqual(["Математик", "Биологи", "Англи хэл"]);
    const math = res.body[0];
    expect(math.lessonCount).toBe(4);
    expect(math.trialQuestionCount).toBeGreaterThan(0);
    expect(math.subscription).toBeNull();
    expect(math.plans[0]).toMatchObject({ currency: "MNT", durationDays: 30 });
  });

  it("extends an active subscription instead of overlapping it", async () => {
    const { token } = await register();
    await subscribe(token);
    const first = (await request(app).get("/auth/me").set(auth(token))).body.subscriptions[0].endAt;
    await subscribe(token);
    const second = (await request(app).get("/auth/me").set(auth(token))).body.subscriptions[0].endAt;
    expect(new Date(second).getTime() - new Date(first).getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("tests", () => {
  it("gives a free trial test without a subscription and grades it with explanations", async () => {
    const { token } = await register();
    const created = await request(app).post("/tests").set(auth(token)).send({ mode: "TRIAL", subjectId: MATH }).expect(201);
    expect(created.body.status).toBe("IN_PROGRESS");
    expect(created.body.questions.length).toBeGreaterThan(0);
    // Answer key is hidden while taking.
    expect(created.body.questions[0].choices[0]).not.toHaveProperty("isCorrect");
    expect(created.body.questions[0]).not.toHaveProperty("explanation");

    const answers = await correctAnswers(created.body.questions);
    answers[0].choiceId = null; // skip one
    const result = await request(app)
      .post(`/tests/${created.body.id}/submit`)
      .set(auth(token))
      .send({ answers, durationSec: 42 })
      .expect(200);
    const n = created.body.questions.length;
    expect(result.body).toMatchObject({ status: "SUBMITTED", scorePoints: n - 1, totalPoints: n, durationSec: expect.any(Number) });
    expect(result.body.questions[0].isCorrect).toBe(false);
    expect(result.body.questions[1].explanation).toBeTruthy();

    const again = await request(app).post(`/tests/${created.body.id}/submit`).set(auth(token)).send({ answers });
    expect(again.status).toBe(409);
  });

  it("requires a subscription for lesson, mixed and mistakes tests", async () => {
    const { token } = await register();
    for (const body of [
      { mode: "LESSON", lessonId: "les_math_numbers" },
      { mode: "MIXED", subjectId: MATH, lessons: [{ lessonId: "les_math_numbers", count: 2 }] },
      { mode: "MISTAKES", subjectId: MATH },
    ]) {
      const res = await request(app).post("/tests").set(auth(token)).send(body);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("SUBSCRIPTION_REQUIRED");
    }
  });

  it("builds lesson tests with a chosen count and mixed tests with per-lesson counts", async () => {
    const { token } = await register();
    await subscribe(token);

    const lesson = await request(app)
      .post("/tests")
      .set(auth(token))
      .send({ mode: "LESSON", lessonId: "les_math_geometry", count: 5 })
      .expect(201);
    expect(lesson.body.questions).toHaveLength(5);
    expect(lesson.body.title).toBe("Геометр");

    const mixed = await request(app)
      .post("/tests")
      .set(auth(token))
      .send({
        mode: "MIXED",
        subjectId: MATH,
        lessons: [
          { lessonId: "les_math_numbers", count: 3 },
          { lessonId: "les_math_functions", count: 2 },
          { lessonId: "les_math_geometry", count: 0 },
        ],
      })
      .expect(201);
    expect(mixed.body.questions).toHaveLength(5);
    const ids: string[] = mixed.body.questions.map((q: { id: string }) => q.id);
    expect(ids.filter((id) => id.startsWith("q_math_numbers_"))).toHaveLength(3);
    expect(ids.filter((id) => id.startsWith("q_math_functions_"))).toHaveLength(2);

    const foreign = await request(app)
      .post("/tests")
      .set(auth(token))
      .send({ mode: "MIXED", subjectId: MATH, lessons: [{ lessonId: "les_biology_cell", count: 2 }] });
    expect(foreign.status).toBe(400);
  });

  it("collects mistakes and drops them once answered correctly", async () => {
    const { token } = await register();
    await subscribe(token);
    const t = await request(app)
      .post("/tests")
      .set(auth(token))
      .send({ mode: "LESSON", lessonId: "les_math_numbers", count: 4 })
      .expect(201);
    await request(app)
      .post(`/tests/${t.body.id}/submit`)
      .set(auth(token))
      .send({ answers: await wrongAnswers(t.body.questions) })
      .expect(200);

    const subject = await request(app).get(`/subjects/${MATH}`).set(auth(token)).expect(200);
    expect(subject.body.mistakeCount).toBe(4);
    expect(subject.body.lessons[0].stats).toMatchObject({ attempted: 4, correct: 0, accuracy: 0 });

    const m = await request(app).post("/tests").set(auth(token)).send({ mode: "MISTAKES", subjectId: MATH }).expect(201);
    expect(m.body.questions).toHaveLength(4);
    await request(app)
      .post(`/tests/${m.body.id}/submit`)
      .set(auth(token))
      .send({ answers: await correctAnswers(m.body.questions) })
      .expect(200);

    const after = await request(app).get(`/subjects/${MATH}`).set(auth(token)).expect(200);
    expect(after.body.mistakeCount).toBe(0);
    const none = await request(app).post("/tests").set(auth(token)).send({ mode: "MISTAKES", subjectId: MATH });
    expect(none.status).toBe(400);

    // Retake makes a new session with the same questions.
    const retake = await request(app).post(`/tests/${t.body.id}/retake`).set(auth(token)).expect(201);
    expect(retake.body.id).not.toBe(t.body.id);
    expect([...retake.body.questions.map((q: { id: string }) => q.id)].sort()).toEqual(
      [...t.body.questions.map((q: { id: string }) => q.id)].sort()
    );

    const history = await request(app).get("/tests").set(auth(token)).expect(200);
    expect(history.body).toHaveLength(2);
    expect(history.body[0]).toMatchObject({ mode: "MISTAKES", percent: 100 });

    const stats = await request(app).get("/stats").set(auth(token)).expect(200);
    expect(stats.body).toMatchObject({ testsTaken: 2, questionsAnswered: 8, correctAnswers: 4, streakDays: 1, activeToday: true });
    expect(stats.body.last7Days).toHaveLength(7);
    expect(stats.body.subjects[0].weakestLesson.name).toBe("Тоо ба илэрхийлэл");
  });

  it("hides other users' tests", async () => {
    const a = await register();
    const b = await register();
    const t = await request(app).post("/tests").set(auth(a.token)).send({ mode: "TRIAL", subjectId: MATH }).expect(201);
    await request(app).get(`/tests/${t.body.id}`).set(auth(b.token)).expect(404);
  });
});

describe("uploads", () => {
  it("parses a Mongolian .docx, allows one free upload a week, and lifts the limit with a subscription", async () => {
    const { token } = await register();
    const quota0 = await request(app).get("/uploads/quota").set(auth(token)).expect(200);
    expect(quota0.body).toMatchObject({ unlimited: false, used: 0, remaining: 1, limit: 1, windowDays: 7 });

    const up = await request(app)
      .post("/uploads")
      .set(auth(token))
      .attach("file", path.join(FIXTURES, "mongolian_exam.docx"))
      .expect(201);
    expect(up.body).toMatchObject({ title: "Физикийн сорил", questionCount: 3, gradableCount: 3, warnings: [] });
    expect(up.body.quota.remaining).toBe(0);

    const blocked = await request(app)
      .post("/uploads")
      .set(auth(token))
      .attach("file", path.join(FIXTURES, "sample_exam.docx"));
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("UPLOAD_LIMIT_REACHED");
    expect(blocked.body.quota.nextAvailableAt).toBeTruthy();

    // Take the uploaded test: one correct MC, one wrong MC, a short answer.
    const t = await request(app).post("/tests").set(auth(token)).send({ mode: "UPLOAD", uploadId: up.body.id }).expect(201);
    const [q1, q2, q3] = t.body.questions;
    expect(q1.choices.map((c: { label: string }) => c.label)).toEqual(["А", "Б", "В", "Г"]);
    const result = await request(app)
      .post(`/tests/${t.body.id}/submit`)
      .set(auth(token))
      .send({
        answers: [
          { questionId: q1.id, choiceId: q1.choices[1].id },
          { questionId: q2.id, choiceId: q2.choices[0].id },
          { questionId: q3.id, answerText: "  ньютон " },
        ],
      })
      .expect(200);
    expect(result.body).toMatchObject({ scorePoints: 2, totalPoints: 3 });
    expect(result.body.questions[0].explanation).toBe("Хурд = зам / хугацаа.");

    const list = await request(app).get("/uploads").set(auth(token)).expect(200);
    expect(list.body[0]).toMatchObject({ questionCount: 3, lastResult: { percent: 67 } });

    // Deleting doesn't refund the weekly upload.
    await request(app).delete(`/uploads/${up.body.id}`).set(auth(token)).expect(200);
    expect((await request(app).get("/uploads").set(auth(token))).body).toEqual([]);
    expect((await request(app).get("/uploads/quota").set(auth(token))).body.remaining).toBe(0);

    await subscribe(token);
    const quota = await request(app).get("/uploads/quota").set(auth(token)).expect(200);
    expect(quota.body.unlimited).toBe(true);
    await request(app)
      .post("/uploads")
      .set(auth(token))
      .attach("file", path.join(FIXTURES, "sample_exam.docx"))
      .expect(201);
  });

  it("rejects non-docx files and documents without questions, without using the free upload", async () => {
    const { token } = await register();
    const wrongType = await request(app)
      .post("/uploads")
      .set(auth(token))
      .attach("file", Buffer.from("hello"), "notes.txt");
    expect(wrongType.status).toBe(400);
    expect(wrongType.body.code).toBe("BAD_FILE_TYPE");

    const garbage = await request(app)
      .post("/uploads")
      .set(auth(token))
      .attach("file", Buffer.from("not really a docx"), "broken.docx");
    expect(garbage.status).toBe(422);

    expect((await request(app).get("/uploads/quota").set(auth(token))).body.remaining).toBe(1);
  });
});

beforeAll(async () => {
  // Sanity check that the seed ran.
  expect(await prisma.subject.count()).toBe(3);
});
