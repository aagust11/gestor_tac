function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function ensureRequiredFields(payload, requiredFields) {
  const errors = [];

  for (const field of requiredFields) {
    if (!hasValue(payload[field])) {
      errors.push(`El camp ${field} és obligatori.`);
    }
  }

  return errors;
}

export function validateEnumValue(value, acceptedValues, fieldName) {
  if (value === undefined) {
    return [];
  }

  if (!acceptedValues.includes(value)) {
    return [`El camp ${fieldName} ha de ser un valor vàlid.`];
  }

  return [];
}

export function normalizeComparableString(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function buildValidationError(errors) {
  const error = new Error('Error de validació');
  error.status = 400;
  error.details = errors;
  return error;
}
