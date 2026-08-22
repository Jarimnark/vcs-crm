// Shared list conventions: every module list takes ?q= (search), module
// filters, and ?page= — 20 rows per page (review round 1).
export const PAGE_SIZE = 20

export interface Paged<T> {
  rows: T[]
  total: number
  page: number
  pageCount: number
}

export function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export function offsetFor(page: number): number {
  return (page - 1) * PAGE_SIZE
}

export function paged<T>(rows: T[], total: number, page: number): Paged<T> {
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

/** Escape LIKE wildcards in user input, then wrap for a contains match. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}
