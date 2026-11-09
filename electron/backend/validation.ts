/** Error de datos de entrada: su mensaje se muestra directamente al usuario. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new ValidationError(`${field} debe ser un número entero`)
  }
  return value
}

export function positiveInt(value: unknown, field: string): number {
  const result = integer(value, field)
  if (result <= 0) throw new ValidationError(`${field} debe ser mayor que cero`)
  return result
}

export function nonNegativeInt(value: unknown, field: string): number {
  const result = integer(value, field)
  if (result < 0) throw new ValidationError(`${field} no puede ser negativo`)
  return result
}

export function id(value: unknown, field = 'El identificador'): number {
  return positiveInt(value, field)
}

/** Valida una lista de IDs para operaciones masivas (eliminar/exportar). */
export function idList(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError('Seleccione al menos un registro')
  }
  return [...new Set(value.map((item) => id(item)))]
}

export function text(value: unknown, field: string, maxLength = 120): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} es obligatorio`)
  }
  const result = value.trim()
  if (result.length > maxLength) {
    throw new ValidationError(`${field} no puede superar ${maxLength} caracteres`)
  }
  return result
}

export function optionalText(value: unknown, maxLength = 120): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') throw new ValidationError('El texto enviado no es válido')
  const result = value.trim()
  if (result.length > maxLength) {
    throw new ValidationError(`El texto no puede superar ${maxLength} caracteres`)
  }
  return result
}

export function timestampOrNow(value: unknown): number {
  if (value === undefined || value === null) return Date.now()
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError('La fecha no es válida')
  }
  const min = Date.UTC(2000, 0, 1)
  if (value < min || value > Date.now() + 86_400_000) {
    throw new ValidationError('La fecha está fuera del rango permitido')
  }
  return Math.trunc(value)
}

export function bool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new ValidationError(`${field} debe ser verdadero o falso`)
  return value
}

/** Verifica que el payload IPC sea un objeto antes de leer sus campos. */
export function record(value: unknown, field = 'Los datos'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${field} no son válidos`)
  }
  return value as Record<string, unknown>
}
