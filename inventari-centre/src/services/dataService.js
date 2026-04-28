import { CANONICAL_JSON_STRUCTURE } from '../utils/constants'
import { nowTimestamp } from '../utils/dates'
import { llegirFitxerLocal, escriureFitxerLocal } from './fileSystemService'

const ERROR_JSON_INVALID = 'El contingut de data.json és buit o no té un JSON vàlid.'

function cloneCanonicalStructure() {
  return {
    ...CANONICAL_JSON_STRUCTURE,
    devices: [],
    people: [],
    assignments: [],
    incidents: [],
    metadata: {
      ...CANONICAL_JSON_STRUCTURE.metadata,
      sourceFiles: {
        ...CANONICAL_JSON_STRUCTURE.metadata.sourceFiles,
      },
      updatedAt: nowTimestamp(),
    },
  }
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeDataShape(data) {
  const defaults = cloneCanonicalStructure()
  const source = isPlainObject(data) ? data : {}
  const sourceMetadata = isPlainObject(source.metadata) ? source.metadata : {}

  return {
    ...defaults,
    ...source,
    devices: Array.isArray(source.devices) ? source.devices : [],
    people: Array.isArray(source.people) ? source.people : [],
    assignments: Array.isArray(source.assignments) ? source.assignments : [],
    incidents: Array.isArray(source.incidents) ? source.incidents : [],
    metadata: {
      ...defaults.metadata,
      ...sourceMetadata,
      sourceFiles: {
        ...defaults.metadata.sourceFiles,
        ...(isPlainObject(sourceMetadata.sourceFiles) ? sourceMetadata.sourceFiles : {}),
      },
      updatedAt: sourceMetadata.updatedAt || defaults.metadata.updatedAt,
    },
  }
}

async function confirmarSobreescriptura(confirmOverwrite, reason) {
  if (typeof confirmOverwrite !== 'function') {
    return false
  }

  const result = await confirmOverwrite(reason)
  return result === true
}

export async function carregarDataDesDeHandle(fileHandle, options = {}) {
  const { confirmOverwrite } = options

  let rawContent = ''
  try {
    rawContent = await llegirFitxerLocal(fileHandle, 'text')
  } catch (error) {
    rawContent = ''
  }

  const content = rawContent?.toString?.().trim?.() || ''

  if (!content) {
    const defaultData = cloneCanonicalStructure()
    const confirmed = await confirmarSobreescriptura(confirmOverwrite, ERROR_JSON_INVALID)

    if (!confirmed) {
      return {
        data: defaultData,
        hasWrittenDefaults: false,
        requiresUserConfirmation: true,
      }
    }

    await escriureFitxerLocal(fileHandle, JSON.stringify(defaultData, null, 2))

    return {
      data: defaultData,
      hasWrittenDefaults: true,
      requiresUserConfirmation: false,
    }
  }

  try {
    const parsed = JSON.parse(content)
    return {
      data: normalizeDataShape(parsed),
      hasWrittenDefaults: false,
      requiresUserConfirmation: false,
    }
  } catch (error) {
    const defaultData = cloneCanonicalStructure()
    const confirmed = await confirmarSobreescriptura(confirmOverwrite, ERROR_JSON_INVALID)

    if (!confirmed) {
      return {
        data: defaultData,
        hasWrittenDefaults: false,
        requiresUserConfirmation: true,
      }
    }

    await escriureFitxerLocal(fileHandle, JSON.stringify(defaultData, null, 2))

    return {
      data: defaultData,
      hasWrittenDefaults: true,
      requiresUserConfirmation: false,
    }
  }
}

export async function guardarDataAtomicament(fileHandle, data) {
  const normalized = normalizeDataShape(data)
  const payload = {
    ...normalized,
    metadata: {
      ...normalized.metadata,
      updatedAt: nowTimestamp(),
    },
  }

  await escriureFitxerLocal(fileHandle, JSON.stringify(payload, null, 2))
  return payload
}

export function exportarCopiaSeguretatJson(data) {
  const normalized = normalizeDataShape(data)

  return JSON.stringify(
    {
      ...normalized,
      metadata: {
        ...normalized.metadata,
        updatedAt: nowTimestamp(),
      },
    },
    null,
    2,
  )
}

export function importarCopiaSeguretatJson(rawJson) {
  if (typeof rawJson !== 'string') {
    throw new Error('La còpia de seguretat ha de ser un JSON en format text.')
  }

  const parsed = JSON.parse(rawJson)
  return normalizeDataShape(parsed)
}

export {
  ERROR_JSON_INVALID,
  cloneCanonicalStructure,
  normalizeDataShape,
}
