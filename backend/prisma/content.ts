import fs from "node:fs";
import path from "node:path";

// A question as stored in content/<subject>/<lesson>.json.
export type ContentQuestion = {
  q: string;
  choices: { label: string; text: string }[];
  answer?: number | null;
  correctText?: string | null;
  explanation?: string | null;
  trial?: boolean;
};

export const CONTENT_DIR = path.join(__dirname, "content");

export function contentPath(subjectKey: string, lessonKey: string) {
  return path.join(CONTENT_DIR, subjectKey, `${lessonKey}.json`);
}

// Returns [] when the lesson has no imported file. Throws with the file name
// and question number on malformed content, so a bad import fails the seed
// loudly instead of silently dropping questions.
export function loadContent(subjectKey: string, lessonKey: string): ContentQuestion[] {
  const file = contentPath(subjectKey, lessonKey);
  if (!fs.existsSync(file)) return [];
  const rel = path.relative(process.cwd(), file);
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${rel}: invalid JSON (${(e as Error).message})`);
  }
  if (!Array.isArray(data)) throw new Error(`${rel}: expected a JSON array of questions`);
  data.forEach((q: ContentQuestion, i) => {
    const where = `${rel}, question ${i + 1}`;
    if (!q || typeof q.q !== "string" || !q.q.trim()) throw new Error(`${where}: missing "q"`);
    if (!Array.isArray(q.choices)) throw new Error(`${where}: "choices" must be an array`);
    if (q.choices.length === 1) throw new Error(`${where}: a multiple-choice question needs at least 2 choices`);
    q.choices.forEach((c, ci) => {
      if (!c || typeof c.text !== "string" || typeof c.label !== "string") {
        throw new Error(`${where}: choice ${ci + 1} needs "label" and "text"`);
      }
    });
    if (q.answer !== undefined && q.answer !== null) {
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) {
        throw new Error(`${where}: "answer" ${q.answer} doesn't point to one of its ${q.choices.length} choices`);
      }
    }
  });
  return data as ContentQuestion[];
}
