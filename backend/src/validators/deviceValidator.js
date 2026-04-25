import {
  ESTATS_DISPOSITIU_VALUES,
  TIPUS_DISPOSITIU_VALUES
} from '../constants/domainConstants.js';
import {
  ensureRequiredFields,
  normalizeComparableString,
  validateEnumValue
} from './commonValidator.js';

export function validateDevice(payload, devices, { currentId = null } = {}) {
  const errors = ensureRequiredFields(payload, ['sace']);

  errors.push(...validateEnumValue(payload.tipus, TIPUS_DISPOSITIU_VALUES, 'tipus'));
  errors.push(...validateEnumValue(payload.estat, ESTATS_DISPOSITIU_VALUES, 'estat'));

  const saceValue = normalizeComparableString(payload.sace);
  const duplicated = devices.some((device) => (
    device.id !== currentId
    && normalizeComparableString(device.sace) === saceValue
  ));

  if (saceValue && duplicated) {
    errors.push('El camp sace ha de ser únic entre dispositius.');
  }

  return errors;
}
