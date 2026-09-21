// End-to-end integration test against the real Express app + a real SQLite
// test database (see package.json's pretest/test scripts for the dedicated
// DATABASE_URL). Steps are intentionally sequential and share state — this
// mirrors one realistic user journey (register → subscribe → upload a real
// .docx → take the exam → get graded) rather than testing routes in
// isolation, which is what the unit tests already cover for the parsing/
// grading logic itself.
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

const app = createApp();
const fixtureDocx = path.join(__dirname, "../../test/fixtures/sample_exam.docx");

describe("exam flow: register -> subscribe -> upload -> take -> grade", () => {
  const runId = Date.now();
  let subjectId: string;
  let planId: string;
  let token: string;
  let otherToken: string;
  let examId: string;
  let attemptId: string;

  beforeAll(async () => {
    const subject = await prisma.subject.create({
      data: {
        slug: `test-subject-${runId}`,
        name: "Integration Test Subject",
        description: "Created by the integration test suite.",
        isStarter: false,
        sortOrder: 999,
      },
    });
    subjectId = subject.id;
    const plan = await prisma.subscriptionPlan.create({
      data: { subjectId, name: "1 Month", durationDays: 30, priceCents: 100 },
    });
    planId = plan.id;
  });

  afterAll(async () => {
    await prisma.answerResponse.deleteMany({ where: { attempt: { exam: { subjectId } } } });
    await prisma.examAttempt.deleteMany({ where: { exam: { subjectId } } });
    await prisma.exam.deleteMany({ where: { subjectId } });
    await prisma.subscription.deleteMany({ where: { subjectId } });
    await prisma.subscriptionPlan.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    await prisma.user.deleteMany({ where: { email: { contains: `it-${runId}` } } });
    await prisma.$disconnect();
  });

  it("registers a user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: `it-${runId}@example.com`, password: "password123", name: "Integration Test" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    token = res.body.token;
  });

  it("registers a second user for cross-user ownership checks", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: `it-${runId}-other@example.com`, password: "password123", name: "Other User" });
    expect(res.status).toBe(201);
    otherToken = res.body.token;
  });

  it("rejects registration with a too-short password", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: `it-${runId}-shortpw@example.com`, password: "short", name: "Nope" });
    expect(res.status).toBe(400);
  });

  it("rejects registering the same email twice", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: `it-${runId}@example.com`, password: "password123", name: "Duplicate" });
    expect(res.status).toBe(409);
  });

  it("rejects a wrong password on login", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: `it-${runId}@example.com`, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("rejects requests with no auth token", async () => {
    const res = await request(app).get("/subjects");
    expect(res.status).toBe(401);
  });

  it("lists subjects with the new subject locked", async () => {
    const res = await request(app).get("/subjects").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const found = res.body.find((s: any) => s.id === subjectId);
    expect(found).toBeTruthy();
    expect(found.subscription.active).toBe(false);
  });

  it("blocks exam upload before subscribing", async () => {
    const res = await request(app)
      .post(`/subjects/${subjectId}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", fixtureDocx);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SUBSCRIPTION_REQUIRED");
  });

  it("subscribes to the subject", async () => {
    const res = await request(app)
      .post(`/subjects/${subjectId}/subscribe`)
      .set("Authorization", `Bearer ${token}`)
      .send({ planId });
    expect(res.status).toBe(201);
    expect(new Date(res.body.endAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects a non-docx upload with a specific 400, not a generic 500", async () => {
    const res = await request(app)
      .post(`/subjects/${subjectId}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("not a docx"), "notes.txt");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Only .docx files are accepted");
  });

  it("rejects an oversized upload with 413, not a generic 500", async () => {
    const res = await request(app)
      .post(`/subjects/${subjectId}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.alloc(16 * 1024 * 1024), "huge.docx");
    expect(res.status).toBe(413);
  });

  it("uploads and parses the docx exam", async () => {
    const res = await request(app)
      .post(`/subjects/${subjectId}/exams`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", fixtureDocx);
    expect(res.status).toBe(201);
    expect(res.body.questionCount).toBe(4);
    expect(res.body.warnings).toEqual([]);
    examId = res.body.examId;
  });

  it("lists the exam with its parse warnings (empty for a clean fixture)", async () => {
    const res = await request(app).get(`/subjects/${subjectId}/exams`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const listed = res.body.find((e: any) => e.id === examId);
    expect(listed).toBeTruthy();
    expect(listed.warnings).toEqual([]);
  });

  it("serves exam questions without leaking correct answers", async () => {
    const res = await request(app).get(`/exams/${examId}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(4);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("isCorrect");
    expect(raw).not.toContain("correctText");
  });

  it("blocks a non-subscriber from seeing the exam", async () => {
    const res = await request(app).get(`/exams/${examId}`).set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it("starts an attempt and grades a submission against the fixture's known answer key", async () => {
    const examRes = await request(app).get(`/exams/${examId}`).set("Authorization", `Bearer ${token}`);
    const questions = examRes.body.questions;

    const startRes = await request(app).post(`/exams/${examId}/attempts`).set("Authorization", `Bearer ${token}`);
    expect(startRes.status).toBe(201);
    attemptId = startRes.body.attemptId;

    // Fixture's answer key is B, C, [exact short-answer text], C. Answering
    // every MCQ with its first listed choice ("A") is wrong for all three;
    // the short answer is submitted verbatim, so it's the only correct one.
    const answers = questions.map((q: any) =>
      q.type === "MULTIPLE_CHOICE"
        ? { questionId: q.id, choiceId: q.choices[0].id }
        : { questionId: q.id, answerText: "A symbol that represents an unknown or changeable value." }
    );

    const submitRes = await request(app)
      .post(`/attempts/${attemptId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answers });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.totalPoints).toBe(4);
    expect(submitRes.body.scorePoints).toBe(1);
  });

  it("rejects a second submission of the same attempt", async () => {
    const res = await request(app)
      .post(`/attempts/${attemptId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answers: [] });
    expect(res.status).toBe(409);
  });

  it("reveals correct answers only after submission", async () => {
    const res = await request(app).get(`/attempts/${attemptId}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.scorePoints).toBe(1);
    expect(res.body.totalPoints).toBe(4);
    const shortAnswerResult = res.body.responses.find((r: any) => r.type === "SHORT_ANSWER");
    expect(shortAnswerResult.isCorrect).toBe(true);
    expect(shortAnswerResult.correctText).toBeTruthy();
  });

  it("blocks a different user from reading someone else's attempt", async () => {
    const res = await request(app).get(`/attempts/${attemptId}`).set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});
