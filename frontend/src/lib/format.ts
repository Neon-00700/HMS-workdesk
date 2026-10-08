import { toFaDigits } from "./utils";

const FA_MONTHS = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];

const FA_WEEKDAYS = [
  "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه",
];

/** Format: ۱۲ مهر ۱۴۰۵ — uses Intl fa-IR when available w/ fallback. */
export function formatDateFa(d: Date | string | number): string {
  const date = new Date(d);
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return `${toFaDigits(date.getDate())} ${FA_MONTHS[date.getMonth()]} ${toFaDigits(date.getFullYear())}`;
  }
}

export function formatShortDateFa(d: Date | string | number): string {
  const date = new Date(d);
  try {
    return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(date);
  } catch {
    return `${toFaDigits(date.getDate())} ${FA_MONTHS[date.getMonth()]}`;
  }
}

export function formatTimeFa(d: Date | string | number): string {
  const date = new Date(d);
  try {
    return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(date);
  } catch {
    const p = (n: number) => toFaDigits(String(n).padStart(2, "0"));
    return `${p(date.getHours())}:${p(date.getMinutes())}`;
  }
}

export function formatDateTimeFa(d: Date | string | number): string {
  return `${formatDateFa(d)}، ساعت ${formatTimeFa(d)}`;
}

export function weekdayFa(d: Date | string | number): string {
  return FA_WEEKDAYS[new Date(d).getDay()];
}

/** Relative time in Persian: «۵ دقیقه پیش»، «فردا»، ... */
export function timeAgoFa(d: Date | string | number, now = new Date()): string {
  const date = new Date(d);
  const diffMs = now.getTime() - date.getTime();
  const abs = Math.abs(diffMs);
  const future = diffMs < 0;
  const min = Math.floor(abs / 60000);
  if (min < 1) return "لحظاتی پیش";
  if (min < 60) return future ? `${toFaDigits(min)} دقیقه بعد` : `${toFaDigits(min)} دقیقه پیش`;
  const h = Math.floor(min / 60);
  if (h < 24) return future ? `${toFaDigits(h)} ساعت بعد` : `${toFaDigits(h)} ساعت پیش`;
  const days = Math.floor(h / 24);
  if (days === 1) return future ? "فردا" : "دیروز";
  if (days < 7) return future ? `${toFaDigits(days)} روز بعد` : `${toFaDigits(days)} روز پیش`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return future ? `${toFaDigits(w)} هفته بعد` : `${toFaDigits(w)} هفته پیش`;
  }
  if (days < 365) {
    const mo = Math.floor(days / 30);
    return future ? `${toFaDigits(mo)} ماه بعد` : `${toFaDigits(mo)} ماه پیش`;
  }
  const y = Math.floor(days / 365);
  return future ? `${toFaDigits(y)} سال بعد` : `${toFaDigits(y)} سال پیش`;
}

export function isOverdue(dueDate?: string | null, status?: string): boolean {
  if (!dueDate) return false;
  if (status === "done" || status === "released") return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function isDueSoon(dueDate?: string | null, withinHours = 48): boolean {
  if (!dueDate) return false;
  const t = new Date(dueDate).getTime() - Date.now();
  return t > 0 && t < withinHours * 3600_000;
}
