/** Placeholders para cláusulas IN (?) seguras con better-sqlite3. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ')
}
