const ERROR_NAVEGADOR_NO_COMPATIBLE =
  'Aquest navegador no és compatible amb l\'API File System Access.';
const ERROR_PERMIS_DENEGAT =
  'Permís denegat per accedir al fitxer local en mode lectura/escriptura.';
const ERROR_FITXER_INACCESSIBLE =
  'Fitxer inaccessible: no s\'ha pogut llegir o escriure el fitxer local.';

function comprovarEntornNavegador() {
  if (typeof window === 'undefined') {
    throw new Error(ERROR_NAVEGADOR_NO_COMPATIBLE);
  }
}

export function teSuportOpenFilePicker() {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';
}

export function teSuportSaveFilePicker() {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

export function comprovarCompatibilitatFileSystemAPI() {
  comprovarEntornNavegador();

  if (!teSuportOpenFilePicker() || !teSuportSaveFilePicker()) {
    throw new Error(ERROR_NAVEGADOR_NO_COMPATIBLE);
  }
}

export async function consultarPermis(fileHandle, mode = 'readwrite') {
  if (!fileHandle || typeof fileHandle.queryPermission !== 'function') {
    throw new Error(ERROR_FITXER_INACCESSIBLE);
  }

  const permission = await fileHandle.queryPermission({ mode });
  return permission;
}

export async function demanarPermis(fileHandle, mode = 'readwrite') {
  if (!fileHandle || typeof fileHandle.requestPermission !== 'function') {
    throw new Error(ERROR_FITXER_INACCESSIBLE);
  }

  const permission = await fileHandle.requestPermission({ mode });
  return permission;
}

export async function assegurarPermis(fileHandle, mode = 'readwrite') {
  const currentPermission = await consultarPermis(fileHandle, mode);

  if (currentPermission === 'granted') {
    return true;
  }

  const requestedPermission = await demanarPermis(fileHandle, mode);

  if (requestedPermission !== 'granted') {
    throw new Error(ERROR_PERMIS_DENEGAT);
  }

  return true;
}

export async function seleccionarFitxerLocal(options = {}) {
  comprovarEntornNavegador();

  if (!teSuportOpenFilePicker()) {
    throw new Error(ERROR_NAVEGADOR_NO_COMPATIBLE);
  }

  const [fileHandle] = await window.showOpenFilePicker({ multiple: false, ...options });

  if (!fileHandle) {
    throw new Error(ERROR_FITXER_INACCESSIBLE);
  }

  return fileHandle;
}

export async function seleccionarFitxerPerDesar(options = {}) {
  comprovarEntornNavegador();

  if (!teSuportSaveFilePicker()) {
    throw new Error(ERROR_NAVEGADOR_NO_COMPATIBLE);
  }

  const fileHandle = await window.showSaveFilePicker(options);

  if (!fileHandle) {
    throw new Error(ERROR_FITXER_INACCESSIBLE);
  }

  return fileHandle;
}

export async function llegirFitxerLocal(fileHandle, parser = 'text') {
  try {
    await assegurarPermis(fileHandle, 'read');
    const file = await fileHandle.getFile();

    if (parser === 'arrayBuffer') {
      return file.arrayBuffer();
    }

    const content = await file.text();

    if (parser === 'json') {
      return JSON.parse(content);
    }

    return content;
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_PERMIS_DENEGAT) {
      throw error;
    }

    throw new Error(ERROR_FITXER_INACCESSIBLE);
  }
}

export async function escriureFitxerLocal(fileHandle, content) {
  try {
    await assegurarPermis(fileHandle, 'readwrite');

    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    return true;
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_PERMIS_DENEGAT) {
      throw error;
    }

    throw new Error(ERROR_FITXER_INACCESSIBLE);
  }
}

export {
  ERROR_NAVEGADOR_NO_COMPATIBLE,
  ERROR_PERMIS_DENEGAT,
  ERROR_FITXER_INACCESSIBLE,
};
