import fs from 'fs-extra';
import xlsx from 'xlsx';

const SHEET_REGISTRE = 'Registre';

class XlsxServiceError extends Error {
  constructor(message, status = 500, cause) {
    super(message);
    this.name = 'XlsxServiceError';
    this.status = status;
    this.cause = cause;
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function getLastUsedRowIndex(worksheet) {
  if (!worksheet['!ref']) {
    return -1;
  }

  const range = xlsx.utils.decode_range(worksheet['!ref']);

  for (let row = range.e.r; row >= range.s.r; row -= 1) {
    let rowHasValues = false;

    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];

      if (cell && hasValue(cell.v)) {
        rowHasValues = true;
        break;
      }
    }

    if (rowHasValues) {
      return row;
    }
  }

  return -1;
}

function mapXlsxError(error, filePath) {
  if (!(error instanceof Error)) {
    return new XlsxServiceError('Error inesperat gestionant l\'arxiu Excel.');
  }

  if (error instanceof XlsxServiceError) {
    return error;
  }

  if (error.code === 'ENOENT') {
    return new XlsxServiceError(
      `No s'ha trobat el fitxer Excel: ${filePath}`,
      404,
      error
    );
  }

  if (error.code === 'EACCES' || error.code === 'EPERM') {
    return new XlsxServiceError(
      `No tens permisos per llegir o escriure el fitxer Excel: ${filePath}`,
      403,
      error
    );
  }

  if (error.code === 'EBUSY') {
    return new XlsxServiceError(
      `El fitxer Excel està bloquejat i no es pot modificar ara mateix: ${filePath}`,
      423,
      error
    );
  }

  return new XlsxServiceError(
    `No s'ha pogut actualitzar el fitxer Excel (${filePath}). ${error.message}`,
    500,
    error
  );
}

async function appendToRegistre(filePath, row) {
  try {
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      throw new XlsxServiceError(`No s'ha trobat el fitxer Excel: ${filePath}`, 404);
    }

    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[SHEET_REGISTRE];

    if (!worksheet) {
      throw new XlsxServiceError(
        `No s'ha trobat el full "${SHEET_REGISTRE}" dins del fitxer: ${filePath}`,
        400
      );
    }

    const lastUsedRow = getLastUsedRowIndex(worksheet);
    const nextRow = lastUsedRow + 1;

    xlsx.utils.sheet_add_aoa(worksheet, [row], {
      origin: { r: nextRow, c: 0 }
    });

    xlsx.writeFile(workbook, filePath);
  } catch (error) {
    throw mapXlsxError(error, filePath);
  }
}

export async function appendAssignacio(filePath, identificador, sace) {
  await appendToRegistre(filePath, [identificador ?? '', '', sace ?? '']);
}

export async function appendEstat(filePath, sace, estat) {
  await appendToRegistre(filePath, ['', sace ?? '', estat ?? '']);
}

export { SHEET_REGISTRE, XlsxServiceError };
