export type User = { id: string; email: string; name: string; createdAt?: string };

export type Accuracy = { attempted: number; correct: number; accuracy: number | null };

export type Plan = { id: string; name: string; durationDays: number; price: number; currency: string };

export type Lesson = {
  id: string;
  name: string;
  description: string | null;
  questionCount: number;
  stats: Accuracy;
};

export type Subject = {
  id: string;
  slug: string;
  name: string;
  description: string;
  lessonCount: number;
  questionCount: number;
  trialQuestionCount: number;
  subscription: { active: boolean; endAt: string; planName: string } | null;
  plans: Plan[];
  stats: Accuracy;
  lessons: Lesson[];
};

export type SubjectDetail = Subject & { mistakeCount: number };

export type ActiveSubscription = {
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  planName: string;
  endAt: string;
};

export type TestMode = "TRIAL" | "LESSON" | "MIXED" | "MISTAKES" | "UPLOAD";

export type Choice = { id: string; label: string; text: string; isCorrect?: boolean };

export type Question = {
  id: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  prompt: string;
  choices: Choice[];
  // Present once the test is submitted:
  correctText?: string | null;
  explanation?: string | null;
  gradable?: boolean;
  selectedChoiceId?: string | null;
  answerText?: string | null;
  isCorrect?: boolean | null;
};

export type TestSummary = {
  id: string;
  mode: TestMode;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  lessonId: string | null;
  uploadId: string | null;
  status: "IN_PROGRESS" | "SUBMITTED";
  startedAt: string;
  submittedAt: string | null;
  durationSec: number | null;
  scorePoints: number | null;
  totalPoints: number | null;
  percent: number | null;
  questionCount: number;
};

export type TestSession = TestSummary & { questions: Question[] };

export type CreateTestRequest =
  | { mode: "TRIAL"; subjectId: string }
  | { mode: "LESSON"; lessonId: string; count?: number }
  | { mode: "MIXED"; subjectId: string; lessons: { lessonId: string; count: number }[]; shuffle?: boolean }
  | { mode: "MISTAKES"; subjectId: string; count?: number }
  | { mode: "UPLOAD"; uploadId: string; shuffle?: boolean };

export type UploadQuota = {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
  windowDays: number;
  nextAvailableAt: string | null;
};

export type UploadSummary = {
  id: string;
  title: string;
  sourceFileName: string;
  questionCount: number;
  warnings: string[];
  extractionMode: string;
  createdAt: string;
  lastResult: { scorePoints: number | null; totalPoints: number | null; percent: number | null; submittedAt: string } | null;
};

export type UploadResult = {
  id: string;
  title: string;
  questionCount: number;
  gradableCount: number;
  warnings: string[];
  extractionMode: string;
  quota: UploadQuota;
};

export type Stats = {
  testsTaken: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number | null;
  totalTimeSec: number;
  streakDays: number;
  activeToday: boolean;
  last7Days: { date: string; tests: number; correct: number; total: number }[];
  subjects: {
    id: string;
    slug: string;
    name: string;
    stats: Accuracy;
    weakestLesson: { id: string; name: string; accuracy: number | null } | null;
    lessons: { id: string; name: string; stats: Accuracy }[];
  }[];
};
