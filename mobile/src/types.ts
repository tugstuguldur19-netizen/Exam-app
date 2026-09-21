export type Plan = {
  id: string;
  name: string;
  durationDays: number;
  priceCents: number;
  currency: string;
};

export type Subject = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isStarter: boolean;
  plans: Plan[];
  subscription: { active: boolean; endAt?: string };
};

export type ExamSummary = {
  id: string;
  title: string;
  questionCount: number;
  createdAt: string;
  warnings: string[];
};

export type Choice = { id: string; label: string; text: string };

export type ExamQuestion = {
  id: string;
  order: number;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  prompt: string;
  choices: Choice[];
};

export type ExamDetail = {
  id: string;
  title: string;
  questions: ExamQuestion[];
};

export type AttemptResultResponse = {
  questionId: string;
  prompt: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  choices: Choice[];
  yourChoiceId: string | null;
  yourChoiceLabel: string | null;
  yourAnswerText: string | null;
  isCorrect: boolean | null;
  correctChoiceId?: string | null;
  correctChoiceLabel?: string | null;
  correctText?: string | null;
};

export type AttemptResult = {
  id: string;
  examId: string;
  examTitle: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  scorePoints: number | null;
  totalPoints: number | null;
  responses: AttemptResultResponse[];
};
