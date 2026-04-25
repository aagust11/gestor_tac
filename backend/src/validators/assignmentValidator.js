import {
  ESTATS_ASSIGNACIO,
  ESTATS_ASSIGNACIO_VALUES
} from '../constants/domainConstants.js';
import {
  ensureRequiredFields,
  validateEnumValue
} from './commonValidator.js';

export function validateAssignment(payload, context, { currentId = null } = {}) {
  const { people, devices, assignments } = context;
  const errors = ensureRequiredFields(payload, ['personId', 'deviceId']);

  errors.push(...validateEnumValue(payload.estat, ESTATS_ASSIGNACIO_VALUES, 'estat'));

  if (payload.personId && !people.some((person) => person.id === payload.personId)) {
    errors.push('La persona indicada a personId no existeix.');
  }

  if (payload.deviceId && !devices.some((device) => device.id === payload.deviceId)) {
    errors.push('El dispositiu indicat a deviceId no existeix.');
  }

  const status = payload.estat ?? ESTATS_ASSIGNACIO.ACTIVA;
  if (payload.deviceId && status === ESTATS_ASSIGNACIO.ACTIVA) {
    const hasActiveAssignment = assignments.some((assignment) => (
      assignment.id !== currentId
      && assignment.deviceId === payload.deviceId
      && assignment.estat === ESTATS_ASSIGNACIO.ACTIVA
    ));

    if (hasActiveAssignment) {
      errors.push('No es pot assignar un dispositiu amb una assignació activa.');
    }
  }

  return errors;
}
