/* ─── Session-only binary store for uploaded files ───────────────
   File *metadata* persists to localStorage, but the bytes live here in memory
   so downloads work without blowing the ~5MB localStorage quota.
   After a page reload the bytes are gone and the UI says so honestly. */

const blobs = new Map<string, Blob>();

export function storeFileBlob(id: string, blob: Blob): void {
  blobs.set(id, blob);
}

/** Downloads the stored blob. Returns false when the bytes are unavailable. */
export function downloadStoredFile(id: string, fileName: string): boolean {
  const blob = blobs.get(id);
  if (!blob || typeof document === "undefined") return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

export function hasStoredFile(id: string): boolean {
  return blobs.has(id);
}

/** Returns the stored bytes, if this session still holds them. */
export function getStoredBlob(id: string): Blob | undefined {
  return blobs.get(id);
}
