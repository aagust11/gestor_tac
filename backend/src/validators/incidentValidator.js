import { ESTATS_INCIDENCIA_VALUES } from '../constants/domainConstants.js';
import {
  ensureRequiredFields,
  validateEnumValue
} from './commonValidator.js';

export function validateIncident(payload, { devices }) {
  const errors = ensureRequiredFields(payload, ['deviceId', 'REQ', 'explicacio']);

  errors.push(...validateEnumValue(payload.estat, ESTATS_INCIDENCIA_VALUES, 'estat'));

  if (payload.deviceId && !devices.some((device) => device.id === payload.deviceId)) {
    errors.push('El dispositiu indicat a deviceId no existeix.');
  }

  return errors;
}
