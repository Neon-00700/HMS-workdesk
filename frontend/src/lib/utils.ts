import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** Clamp a number between min and max. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Persian digit formatting (presentation only). */
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** File size humanizer (Persian units). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${toFaDigits(bytes)} بایت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${toFaDigits(kb.toFixed(kb < 10 ? 1 : 0))} کیلوبایت`;
  const mb = kb / 1024;
  if (mb < 1024) return `${toFaDigits(mb.toFixed(mb < 10 ? 1 : 0))} مگابایت`;
  const gb = mb / 1024;
  return `${toFaDigits(gb.toFixed(1))} گیگابایت`;
}

/** Duration minutes -> «۲ ساعت و ۱۵ دقیقه». */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 1) return "کمتر از یک دقیقه";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${toFaDigits(m)} دقیقه`;
  if (m === 0) return `${toFaDigits(h)} ساعت`;
  return `${toFaDigits(h)} ساعت و ${toFaDigits(m)} دقیقه`;
}

/** Initials for avatar fallback (supports Persian names). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).slice(0, 2);
}

/** Deterministic hue from string (avatar/project colors). */
export function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function avatarStyle(seed: string): React.CSSProperties {
  const h = hueOf(seed);
  return {
    backgroundColor: `hsl(${h} 45% 88%)`,
    color: `hsl(${h} 55% 28%)`,
  };
}

/** Safe filename sanitizer (mirrors backend policy). */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
