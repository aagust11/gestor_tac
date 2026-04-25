import {
  ensureRequiredFields,
  normalizeComparableString
} from './commonValidator.js';

export function validatePerson(payload, people, { currentId = null } = {}) {
  const errors = ensureRequiredFields(payload, ['identificador']);

  const identificadorValue = normalizeComparableString(payload.identificador);
  const duplicated = people.some((person) => (
    person.id !== currentId
    && normalizeComparableString(person.identificador) === identificadorValue
  ));

  if (identificadorValue && duplicated) {
    errors.push('El camp identificador ha de ser únic entre persones.');
  }

  return errors;
}
