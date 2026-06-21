export class ValidationError extends Error {
  public readonly fieldErrors: Record<string, string[]>

  constructor(fieldErrors: Record<string, string[]>) {
    super('Validation error')
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

export function isValidationErrorPayload(
  value: unknown,
): value is Record<string, string[]> {
  if (!value || typeof value !== 'object') return false
  const objectValues = Object.values(value as Record<string, unknown>)
  if (objectValues.length === 0) return false
  return objectValues.every(
    (v) => Array.isArray(v) && v.every((m) => typeof m === 'string'),
  )
}
