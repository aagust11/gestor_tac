const DB_NAME = 'inventari-centre-db';
const DB_VERSION = 1;
const STORE_NAME = 'handles';

const ERROR_INDEXEDDB_NO_DISPONIBLE =
  "IndexedDB no està disponible en aquest entorn o navegador.";

function comprovarIndexedDbDisponible() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    throw new Error(ERROR_INDEXEDDB_NO_DISPONIBLE);
  }
}

function obrirBaseDades() {
  return new Promise((resolve, reject) => {
    try {
      comprovarIndexedDbDisponible();
    } catch (error) {
      reject(error);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('No s\'ha pogut obrir la base de dades IndexedDB.'));
    };
  });
}

async function withStore(mode, operation) {
  const db = await obrirBaseDades();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    let result;

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('S\'ha produït un error en la transacció d\'IndexedDB.'));
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('La transacció d\'IndexedDB s\'ha cancel·lat.'));
    };

    try {
      result = operation(store);
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

export async function setHandle(key, handle) {
  return withStore('readwrite', (store) => {
    store.put(handle, key);
    return handle;
  });
}

export async function getHandle(key) {
  return withStore('readonly', (store) =>
    new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () =>
        reject(request.error || new Error('No s\'ha pogut recuperar el handle des d\'IndexedDB.'));
    }),
  );
}

export async function removeHandle(key) {
  return withStore('readwrite', (store) => {
    store.delete(key);
    return true;
  });
}

export const HANDLE_KEYS = {
  dataJsonHandle: 'dataJsonHandle',
  indicAssignacionsHandle: 'indicAssignacionsHandle',
  indicEstatsHandle: 'indicEstatsHandle',
};

export { DB_NAME, STORE_NAME };
