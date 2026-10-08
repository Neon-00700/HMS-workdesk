/* ─── Central task-state helpers ───────────────────────────────────
   One definition of "done" and of derived progress, shared by the API
   layer and the UI. "Done" is a property of the COLUMN the task sits in
   (`column.isDoneColumn`), never a hardcoded `status` string — a board
   may mark any column as its completion column. */
import type { Board, Task } from "@/types/models";

/** Finds the task's column on its own board. */
export function columnOf(task: Task, board?: Board) {
  return board?.columns.find((c) => c.id === task.columnId);
}

/** The single source of truth for "is this task finished?" */
export function isTaskDone(task: Task, board?: Board): boolean {
  return columnOf(task, board)?.isDoneColumn === true;
}

/** The completion column of a board, if it has one. */
export function doneColumnOf(board?: Board) {
  return board?.columns.find((c) => c.isDoneColumn);
}

/* ── Progress ──────────────────────────────────────────────────────
   A task in the done column is always 100%. Otherwise progress is the
   mean completion of its subtasks and checklist items — whichever exist.
   When there are no child items there is nothing to measure, so 0. */
export function recomputeProgress(task: Task, board?: Board): number {
  if (isTaskDone(task, board)) return 100;
  const children = [...task.subtasks, ...task.checklist];
  if (!children.length) return 0;
  const done = children.filter((c) => c.isDone).length;
  return Math.round((done / children.length) * 100);
}

/** Recomputes in place — for use inside a db.update() block. */
export function syncProgress(task: Task, board?: Board): Task {
  task.progress = recomputeProgress(task, board);
  return task;
}

/** Is the completion date set in sync with the current column? */
export function syncCompletion(task: Task, board?: Board): Task {
  const done = isTaskDone(task, board);
  if (done && !task.completedAt) task.completedAt = new Date().toISOString();
  if (!done) task.completedAt = undefined;
  return task;
}

/* ── Time state ────────────────────────────────────────────────────
   The four states a task can be in with respect to its deadline. */
export type TaskTimeState = "done" | "overdue" | "scheduled" | "unscheduled";

export function taskTimeState(task: Task, board?: Board): TaskTimeState {
  if (isTaskDone(task, board)) return "done";
  if (!task.dueDate) return "unscheduled";
  return new Date(task.dueDate).getTime() < Date.now() ? "overdue" : "scheduled";
}

export function isOverdueTask(task: Task, board?: Board): boolean {
  return taskTimeState(task, board) === "overdue";
}

/* ── Search normalisation ───────────────────────────────────────────
   Persian keyboards, Arabic codepoints and Arabic-Indic digits all type
   the same characters differently. Normalise both sides so "کار" also
   matches "كار", and "۱۲" matches "12". */
const CHAR_MAP: Record<string, string> = {
  "ي": "ی", // ARABIC YEH -> FARSI YEH
  "ى": "ی", // ALEF MAKSURA -> FARSI YEH
  "ك": "ک", // ARABIC KAF -> KEHEH
  "ڪ": "ک", // SWASH KAF -> KEHEH
  "ۀ": "ه", // HEH WITH YEH ABOVE -> HEH
  "ة": "ه", // TEH MARBUTA -> HEH
  "أ": "ا", // ALEF WITH HAMZA ABOVE -> ALEF
  "إ": "ا", // ALEF WITH HAMZA BELOW -> ALEF
  "آ": "ا", // ALEF WITH MADDA -> ALEF
  "ؤ": "و", // WAW WITH HAMZA -> WAW
  "ئ": "ی", // YEH WITH HAMZA -> FARSI YEH
  "ـ": "", // TATWEEL
};

const DIGIT_MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function normalizeText(input: string): string {
  let out = "";
  for (const ch of input) out += DIGIT_MAP[ch] ?? CHAR_MAP[ch] ?? ch;
  return out
    .toLowerCase()
    .replace(/[\u200c\u200f\u200e\u064b-\u0652]/g, "") // ZWNJ/RLM + harakat
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalised substring match — use for every user-typed search. */
export function matchesText(haystack: string | undefined, needle: string): boolean {
  const q = normalizeText(needle);
  if (!q) return true;
  return normalizeText(haystack ?? "").includes(q);
}

/** Orders tasks the way a board column shows them. */
export function byOrder(a: Task, b: Task): number {
  return a.order - b.order;
}