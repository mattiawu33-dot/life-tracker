/**
 * Short unique id like "lq3k9x2a7f1".
 *
 * We don't use crypto.randomUUID() because browsers only allow it on https or
 * localhost, and opening the dev server from your phone uses a plain http
 * address on your Wi-Fi.
 */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
