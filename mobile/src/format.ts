// Mongolian formatting helpers.

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatMNT(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}₮`;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDate(iso: string | Date): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function formatDateTime(iso: string | Date): string {
  const d = new Date(iso);
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "5 мин 12 сек", "1 цаг 3 мин"
export function formatDuration(totalSec: number | null | undefined): string {
  const s = Math.max(0, Math.round(totalSec ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} цаг ${m} мин`;
  if (m > 0) return sec ? `${m} мин ${sec} сек` : `${m} мин`;
  return `${sec} сек`;
}

// "04:07" for the in-test clock.
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const mm = pad(Math.floor((s % 3600) / 60));
  const ss = pad(s % 60);
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));
}

// Relative time for "next free upload" etc.
export function formatUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "одоо";
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.ceil((ms % DAY_MS) / (60 * 60 * 1000));
  if (days > 0) return hours > 0 && hours < 24 ? `${days} өдөр ${hours} цагийн дараа` : `${days} өдрийн дараа`;
  return `${Math.max(1, hours)} цагийн дараа`;
}

export const WEEKDAYS_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Оройн мэнд";
  if (h < 12) return "Өглөөний мэнд";
  if (h < 18) return "Өдрийн мэнд";
  return "Оройн мэнд";
}

export function scoreMessage(percent: number | null): string {
  if (percent === null) return "Тест дууслаа";
  if (percent >= 90) return "Гайхалтай! 🎉";
  if (percent >= 75) return "Маш сайн байна!";
  if (percent >= 50) return "Сайн байна, үргэлжлүүлээрэй!";
  return "Дахин давтаад үзээрэй 💪";
}

export const MODE_LABELS: Record<string, string> = {
  TRIAL: "Туршилт",
  LESSON: "Сэдэв",
  MIXED: "Холимог",
  MISTAKES: "Алдаа засах",
  UPLOAD: "Миний файл",
};
