// Imports a .docx (or .txt) test into the curated question bank:
//
//   npm run import:docx -- <subject> <lesson> <file.docx> [--append]
//
// Writes prisma/content/<subject>/<lesson>.json (replacing it unless
// --append), which `npm run seed` then loads. Uses the same parser as user
// uploads, so the same formats work (see src/services/docxParser.ts).
import fs from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { parseExamText } from "../src/services/docxParser";
import { SUBJECTS } from "../prisma/seedData";
import { FIDIC_SUBJECT } from "../prisma/seedFidic";
import { ContentQuestion, contentPath, loadContent } from "../prisma/content";

// How many questions per lesson go into the subject's free trial test.
const TRIAL_PER_LESSON = 1;

async function main() {
  const args = process.argv.slice(2);
  const append = args.includes("--append");
  const [subjectKey, lessonKey, file] = args.filter((a) => a !== "--append");
  if (!subjectKey || !lessonKey || !file) {
    console.error("Usage: npm run import:docx -- <subject> <lesson> <file.docx|file.txt> [--append]");
    process.exit(2);
  }

  const subject = [...SUBJECTS, FIDIC_SUBJECT].find((s) => s.key === subjectKey);
  if (!subject) throw new Error(`Unknown subject "${subjectKey}". Known: ${[...SUBJECTS, FIDIC_SUBJECT].map((s) => s.key).join(", ")}`);
  if (!subject.lessons.some((l) => l.key === lessonKey)) {
    throw new Error(`Unknown lesson "${lessonKey}" in ${subjectKey}. Known: ${subject.lessons.map((l) => l.key).join(", ")}`);
  }

  const text = file.toLowerCase().endsWith(".docx")
    ? (await mammoth.extractRawText({ path: file })).value
    : fs.readFileSync(file, "utf8");
  const { questions, warnings } = parseExamText(text);
  if (questions.length === 0) throw new Error(`No numbered questions found in ${file}`);

  const existing = append ? loadContent(subjectKey, lessonKey) : [];
  const imported: ContentQuestion[] = questions.map((q, i) => {
    const answer = q.choices.findIndex((c) => c.isCorrect);
    return {
      q: q.prompt,
      choices: q.choices.map((c) => ({ label: c.label, text: c.text })),
      ...(q.type === "MULTIPLE_CHOICE" ? { answer: answer === -1 ? null : answer } : { correctText: q.correctText }),
      ...(q.explanation ? { explanation: q.explanation } : {}),
      ...(existing.length + i < TRIAL_PER_LESSON ? { trial: true } : {}),
    };
  });

  const out = contentPath(subjectKey, lessonKey);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify([...existing, ...imported], null, 2) + "\n");

  const graded = questions.filter((q) => q.hasKnownAnswer).length;
  console.log(`${path.relative(process.cwd(), out)}: ${append ? "appended" : "wrote"} ${questions.length} questions (${graded} with answers).`);
  for (const w of warnings) console.log(`  ! ${w}`);
  console.log("Run `npm run seed` to load them into the database.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
