import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";

const TOKEN_KEY = "exam_prep_token";

// expo-secure-store has no web implementation (its native module is a stub
// there), so use it on iOS/Android and fall back to AsyncStorage — which has
// its own web backing — for the web target.
const store =
  Platform.OS === "web"
    ? { getItemAsync: AsyncStorage.getItem, setItemAsync: AsyncStorage.setItem, deleteItemAsync: AsyncStorage.removeItem }
    : SecureStore;

export async function getToken(): Promise<string | null> {
  return store.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await store.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await store.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, public body: any) {
    super(typeof body?.error === "string" ? body.error : `Request failed (${status})`);
  }
}

// A generic "Something went wrong" for every non-ApiError catch (a request
// that never got an HTTP response at all — DNS failure, connection reset,
// timeout) throws the real cause away right when it's most needed. Screens
// should show this instead of a hardcoded fallback string.
export function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message || "Something went wrong";
  return "Something went wrong";
}

// Generous, but bounded — free-tier hosting cold starts can genuinely take
// tens of seconds, and a file upload on top of that longer still. Without
// this, a hung connection looks identical to the app doing nothing, with
// no error ever surfacing.
const REQUEST_TIMEOUT_MS = 45000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // A failed token read (e.g. no entry yet, or an unsupported storage backend)
  // should not block the request — treat it as unauthenticated rather than throwing.
  const token = await getToken().catch(() => null);
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The server didn't respond in time. If it's been idle, it may be waking up — try again in a moment.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

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

  uploadExam: async (
    subjectId: string,
    file: { uri: string; name: string; mimeType?: string; webFile?: File }
  ) => {
    const form = new FormData();
    if (file.webFile) {
      // Browser FormData needs an actual Blob/File — the RN {uri,name,type}
      // shape below isn't valid here (only the RN FormData polyfill accepts it).
      form.append("file", file.webFile, file.name);
    } else {
      form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as any);
    }
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
