import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";
import type {
  ActiveSubscription,
  CreateTestRequest,
  Stats,
  Subject,
  SubjectDetail,
  TestSession,
  TestSummary,
  UploadQuota,
  UploadResult,
  UploadSummary,
  User,
} from "../types";

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
    super(typeof body?.error === "string" ? body.error : `Серверийн алдаа (${status}). Дахин оролдоно уу.`);
  }
  get code(): string | undefined {
    return typeof this.body?.code === "string" ? this.body.code : undefined;
  }
}

// Screens show this instead of a hardcoded fallback so the real cause
// (server message, timeout, no connection) reaches the user.
export function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError || (err instanceof Error && /network|fetch/i.test(err.message))) {
    return "Сервертэй холбогдож чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Алдаа гарлаа. Дахин оролдоно уу.";
}

// Called when the server says the session is no longer valid, so the app can
// drop back to the login screen instead of failing every request.
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

// Generous, but bounded — free-tier hosting cold starts can take tens of
// seconds, and a file upload on top of that longer still.
const REQUEST_TIMEOUT_MS = 60000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken().catch(() => null);
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Сервер хариу өгсөнгүй. Сервер унтаж байсан бол сэрэхэд хэдэн секунд шаардлагатай — дахин оролдоно уу.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const error = new ApiError(res.status, body);
    if (res.status === 401 && error.code === "SESSION_EXPIRED" && token) onSessionExpired?.();
    if (res.status === 502 || res.status === 503) {
      throw new ApiError(res.status, { error: "Сервер түр ачаалж байна. Хэдэн секундийн дараа дахин оролдоно уу." });
    }
    throw error;
  }
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});

type AuthResponse = { token: string; user: User };

export type PickedFile = { uri: string; name: string; mimeType?: string; webFile?: File };

export const api = {
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>("/auth/register", json("POST", { email, password, name })),
  login: (email: string, password: string) => request<AuthResponse>("/auth/login", json("POST", { email, password })),
  me: () => request<{ user: User; subscriptions: ActiveSubscription[] }>("/auth/me"),
  updateMe: (name: string) => request<{ user: User }>("/auth/me", json("PATCH", { name })),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>("/auth/change-password", json("POST", { currentPassword, newPassword })),

  subjects: () => request<Subject[]>("/subjects"),
  subject: (id: string) => request<SubjectDetail>(`/subjects/${id}`),
  subscribe: (subjectId: string, planId: string) =>
    request<{ id: string; endAt: string; planName: string }>(`/subjects/${subjectId}/subscribe`, json("POST", { planId })),

  createTest: (body: CreateTestRequest) => request<TestSession>("/tests", json("POST", body)),
  test: (id: string) => request<TestSession>(`/tests/${id}`),
  submitTest: (
    id: string,
    answers: { questionId: string; choiceId?: string | null; answerText?: string | null }[],
    durationSec: number
  ) => request<TestSession>(`/tests/${id}/submit`, json("POST", { answers, durationSec })),
  retakeTest: (id: string) => request<TestSession>(`/tests/${id}/retake`, json("POST")),
  history: (limit = 30) => request<TestSummary[]>(`/tests?limit=${limit}`),

  stats: () => request<Stats>("/stats"),

  uploads: () => request<UploadSummary[]>("/uploads"),
  uploadQuota: () => request<UploadQuota>("/uploads/quota"),
  deleteUpload: (id: string) => request<{ ok: true }>(`/uploads/${id}`, json("DELETE")),
  upload: (file: PickedFile) => {
    const form = new FormData();
    if (file.webFile) {
      // Browser FormData needs a real Blob/File; the RN {uri,name,type} shape
      // is only understood by React Native's FormData.
      form.append("file", file.webFile, file.name);
    } else {
      form.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      } as any);
    }
    return request<UploadResult>("/uploads", { method: "POST", body: form });
  },
};
