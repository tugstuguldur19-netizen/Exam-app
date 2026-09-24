import { ZodError } from "zod";

// Thrown from route handlers; the app's error handler turns it into
// `{ error, code? }` with the given status. Messages are user-facing
// (Mongolian) — the mobile app shows them as-is.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public extra?: Record<string, unknown>
  ) {
    super(message);
  }
}

export const notFound = (what = "Мэдээлэл") => new HttpError(404, `${what} олдсонгүй.`, "NOT_FOUND");

export function zodMessage(err: ZodError): string {
  return err.issues[0]?.message ?? "Илгээсэн мэдээлэл буруу байна.";
}
