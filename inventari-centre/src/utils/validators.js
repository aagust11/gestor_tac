import { ASSIGNMENT_STATUSES, INCIDENT_STATUSES } from './constants'
import { isValidIsoTimestamp } from './dates'

const values = (obj) => Object.values(obj)

export function validateUniqueSace(devices = []) {
  const seen = new Set()
  const duplicates = new Set()

  for (const device of devices) {
    const sace = device?.sace?.trim?.()
    if (!sace) continue

    if (seen.has(sace)) {
      duplicates.add(sace)
    } else {
      seen.add(sace)
    }
  }

  return {
    isValid: duplicates.size === 0,
    duplicates: [...duplicates],
  }
}

export function validateUniquePersonIdentifier(people = [], identifierField = 'id') {
  const seen = new Set()
  const duplicates = new Set()

  for (const person of people) {
    const identifier = person?.[identifierField]?.toString?.().trim?.()
    if (!identifier) continue

    if (seen.has(identifier)) {
      duplicates.add(identifier)
    } else {
      seen.add(identifier)
    }
  }

  return {
    isValid: duplicates.size === 0,
    duplicates: [...duplicates],
  }
}

export function validateAssignment(assignment, context = {}) {
  const { devices = [], people = [] } = context

  if (!assignment || typeof assignment !== 'object') {
    return { isValid: false, errors: ['Assignació inexistent o invàlida.'] }
  }

  const errors = []
  const validStatuses = values(ASSIGNMENT_STATUSES)

  const deviceSace = assignment.deviceSace?.toString?.().trim?.()
  const personId = assignment.personId?.toString?.().trim?.()

  if (!deviceSace) errors.push('Falta deviceSace.')
  if (!personId) errors.push('Falta personId.')

  if (assignment.status && !validStatuses.includes(assignment.status)) {
    errors.push(`Estat d'assignació invàlid: ${assignment.status}.`)
  }

  if (assignment.startAt && !isValidIsoTimestamp(assignment.startAt)) {
    errors.push('startAt no és un timestamp ISO vàlid.')
  }

  if (assignment.endAt && !isValidIsoTimestamp(assignment.endAt)) {
    errors.push('endAt no és un timestamp ISO vàlid.')
  }

  if (assignment.startAt && assignment.endAt) {
    const start = new Date(assignment.startAt)
    const end = new Date(assignment.endAt)
    if (start > end) {
      errors.push('startAt no pot ser posterior a endAt.')
    }
  }

  if (deviceSace && !devices.some((d) => d?.sace === deviceSace)) {
    errors.push(`No existeix cap dispositiu amb SACE ${deviceSace}.`)
  }

  if (personId && !people.some((p) => p?.id?.toString?.() === personId)) {
    errors.push(`No existeix cap persona amb id ${personId}.`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateIncident(incident, context = {}) {
  const { devices = [] } = context

  if (!incident || typeof incident !== 'object') {
    return { isValid: false, errors: ['Incidència inexistent o invàlida.'] }
  }

  const errors = []
  const validStatuses = values(INCIDENT_STATUSES)

  const deviceSace = incident.deviceSace?.toString?.().trim?.()

  if (!incident.id) errors.push('Falta id d\'incidència.')
  if (!deviceSace) errors.push('Falta deviceSace.')
  if (!incident.description?.toString?.().trim?.()) {
    errors.push('Falta descripció d\'incidència.')
  }

  if (incident.status && !validStatuses.includes(incident.status)) {
    errors.push(`Estat d'incidència invàlid: ${incident.status}.`)
  }

  if (incident.openedAt && !isValidIsoTimestamp(incident.openedAt)) {
    errors.push('openedAt no és un timestamp ISO vàlid.')
  }

  if (incident.closedAt && !isValidIsoTimestamp(incident.closedAt)) {
    errors.push('closedAt no és un timestamp ISO vàlid.')
  }

  if (incident.openedAt && incident.closedAt) {
    const opened = new Date(incident.openedAt)
    const closed = new Date(incident.closedAt)
    if (opened > closed) {
      errors.push('openedAt no pot ser posterior a closedAt.')
    }
  }

  if (deviceSace && !devices.some((d) => d?.sace === deviceSace)) {
    errors.push(`No existeix cap dispositiu amb SACE ${deviceSace}.`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
