export const DEVICE_TYPES = Object.freeze({
  LAPTOP: 'laptop',
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  PHONE: 'phone',
  MONITOR: 'monitor',
  PRINTER: 'printer',
  NETWORK: 'network',
  OTHER: 'other',
})

export const DEVICE_STATUSES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  IN_REPAIR: 'in_repair',
  RETIRED: 'retired',
  LOST: 'lost',
})

export const ASSIGNMENT_STATUSES = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
})

export const INCIDENT_STATUSES = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
})

export const EXPECTED_FILE_NAMES = Object.freeze({
  DATA_JSON: 'data.json',
  INDIC_ASSIGNMENTS_XLSX: 'indic_assignacions.xlsx',
  INDIC_STATUSES_XLSX: 'indic_estats.xlsx',
})

/**
 * Estructura canònica de dades JSON per a l'inventari.
 */
export const CANONICAL_JSON_STRUCTURE = Object.freeze({
  devices: [],
  people: [],
  assignments: [],
  incidents: [],
  metadata: {
    generatedAt: null,
    sourceFiles: {
      data: EXPECTED_FILE_NAMES.DATA_JSON,
      assignments: EXPECTED_FILE_NAMES.INDIC_ASSIGNMENTS_XLSX,
      statuses: EXPECTED_FILE_NAMES.INDIC_STATUSES_XLSX,
    },
    version: 1,
  },
})
