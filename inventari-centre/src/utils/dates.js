/**
 * Converteix una data a ISO-8601 amb consistència UTC.
 */
export function toIsoTimestamp(date = new Date()) {
  const parsed = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data invàlida: no es pot convertir a timestamp ISO.')
  }

  return parsed.toISOString()
}

export function nowTimestamp() {
  return toIsoTimestamp(new Date())
}

export function isValidIsoTimestamp(value) {
  if (typeof value !== 'string') return false

  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value
}

export function startOfDayIso(date = new Date()) {
  const parsed = date instanceof Date ? new Date(date) : new Date(date)
  parsed.setUTCHours(0, 0, 0, 0)
  return toIsoTimestamp(parsed)
}

export function endOfDayIso(date = new Date()) {
  const parsed = date instanceof Date ? new Date(date) : new Date(date)
  parsed.setUTCHours(23, 59, 59, 999)
  return toIsoTimestamp(parsed)
}
