/* Client-side upload validation — mirrors backend FilePolicy.
   Backend ALWAYS re-validates (MIME sniffing, size, permissions). */
import { UPLOAD_POLICIES } from "@/config/constants";
import { sanitizeFilename } from "./utils";

export interface ValidationResult {
  ok: boolean;
  error?: string;
  safeName?: string;
}

const MAGIC_NUMBERS: { ext: string; sig: number[][] }[] = [
  { ext: "png", sig: [[0x89, 0x50, 0x4e, 0x47]] },
  { ext: "jpg", sig: [[0xff, 0xd8, 0xff]] },
  { ext: "jpeg", sig: [[0xff, 0xd8, 0xff]] },
  { ext: "webp", sig: [[0x52, 0x49, 0x46, 0x46]] }, // RIFF....WEBP (prefix check)
  { ext: "gif", sig: [[0x47, 0x49, 0x46, 0x38]] },
  { ext: "pdf", sig: [[0x25, 0x50, 0x44, 0x46]] },
  { ext: "zip", sig: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]] },
];

async function sniffMatches(file: File, ext: string): Promise<boolean> {
  const rule = MAGIC_NUMBERS.find((r) => r.ext === ext.toLowerCase());
  if (!rule) return true; // unknown type -> let backend decide
  try {
    const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    return rule.sig.some((sig) => sig.every((b, i) => buf[i] === b));
  } catch {
    return false;
  }
}

export async function validateUpload(policyKey: string, file: File): Promise<ValidationResult> {
  const policy = UPLOAD_POLICIES[policyKey];
  if (!policy) return { ok: false, error: "سیاست آپلود نامعتبر است." };

  const safeName = sanitizeFilename(file.name);
  const ext = safeName.split(".").pop()?.toLowerCase() ?? "";

  if (!ext || !policy.extensions.includes(ext)) {
    return { ok: false, error: `فرمت «${ext || "نامشخص"}» مجاز نیست. فرمت‌های مجاز: ${policy.extensions.join("، ")}` };
  }
  if (file.size > policy.maxSizeBytes) {
    const mb = (policy.maxSizeBytes / 1024 / 1024).toFixed(0);
    return { ok: false, error: `حجم فایل بیش از حد مجاز است (حداکثر ${mb} مگابایت).` };
  }
  if (file.size === 0) return { ok: false, error: "فایل خالی است." };

  // Content sniffing for image/pdf/zip families (never trust client MIME alone)
  const sniffable = ["png", "jpg", "jpeg", "webp", "gif", "pdf", "zip"];
  if (sniffable.includes(ext)) {
    const match = await sniffMatches(file, ext);
    if (!match) return { ok: false, error: "محتوای فایل با پسوند آن مطابقت ندارد؛ فایل رد شد." };
  }
  return { ok: true, safeName };
}

export function validateFileList(policyKey: string, files: File[]): { ok: boolean; error?: string } {
  const policy = UPLOAD_POLICIES[policyKey];
  if (!policy) return { ok: false, error: "سیاست آپلود نامعتبر است." };
  if (files.length > policy.maxFiles) {
    return { ok: false, error: `حداکثر ${policy.maxFiles} فایل می‌توانید انتخاب کنید.` };
  }
  return { ok: true };
}
