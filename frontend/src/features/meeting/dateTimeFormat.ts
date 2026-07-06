/**
 * Форматы дат встреч для backend (жёсткий контракт "yyyy-MM-ddTHH:mm:ss").
 * Единая точка вместо локальных копий в календаре/голосе (DRY, ТП-165).
 */

/** datetime-local ("yyyy-MM-ddTHH:mm") → с секундами. */
export function withSeconds(local: string): string {
  return local.length === 16 ? `${local}:00` : local
}

/** ISO-строка (в т.ч. с миллисекундами) → строго 19 символов backend-формата. */
export function toBackendDateTime(iso: string): string {
  return withSeconds(iso).slice(0, 19)
}
