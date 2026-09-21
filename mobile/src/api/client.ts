import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config";

const TOKEN_KEY = "exam_prep_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, public body: any) {
    super(typeof body?.error === "string" ? body.error : `Request failed (${status})`);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // A failed token read (e.g. no entry yet, or an unsupported storage backend)
  // should not block the request — treat it as unauthenticated rather than throwing.
  const token = await getToken().catch(() => null);
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string; name: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  listSubjects: () => request<import("../types").Subject[]>("/subjects"),

  subscribe: (subjectId: string, planId: string) =>
    request<{ subscriptionId: string; subjectId: string; endAt: string }>(
      `/subjects/${subjectId}/subscribe`,
      { method: "POST", body: JSON.stringify({ planId }) }
    ),

  listExams: (subjectId: string) =>
    request<import("../types").ExamSummary[]>(`/subjects/${subjectId}/exams`),

  uploadExam: async (subjectId: string, file: { uri: string; name: string; mimeType?: string }) => {
    const form = new FormData();
    // React Native's FormData accepts { uri, name, type } for file parts.
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as any);
    return request<{ examId: string; status: string; questionCount: number; warnings: string[] }>(
      `/subjects/${subjectId}/exams`,
      { method: "POST", body: form }
    );
  },

  getExam: (examId: string) => request<import("../types").ExamDetail>(`/exams/${examId}`),

  startAttempt: (examId: string) =>
    request<{ attemptId: string; examId: string; status: string }>(`/exams/${examId}/attempts`, {
      method: "POST",
    }),

  submitAttempt: (
    attemptId: string,
    answers: { questionId: string; choiceId?: string; answerText?: string }[]
  ) =>
    request<{ attemptId: string; scorePoints: number; totalPoints: number }>(
      `/attempts/${attemptId}/submit`,
      { method: "POST", body: JSON.stringify({ answers }) }
    ),

  getAttempt: (attemptId: string) =>
    request<import("../types").AttemptResult>(`/attempts/${attemptId}`),
};
