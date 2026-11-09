import { dialog } from 'electron'
import { writeFile } from 'node:fs/promises'

type CsvValue = string | number

function escapeCell(value: CsvValue): string {
  const text = String(value ?? '')
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * Guarda un CSV con BOM (Excel en español) y separador punto y coma.
 * Devuelve la ruta elegida o null si el usuario cancela.
 */
export async function saveCsv(
  filename: string,
  headers: string[],
  rows: CsvValue[][]
): Promise<string | null> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar datos',
    defaultPath: filename,
    filters: [{ name: 'Archivo CSV', extensions: ['csv'] }]
  })
  if (canceled || !filePath) return null

  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(';'))
  await writeFile(filePath, `\uFEFF${lines.join('\r\n')}`, 'utf8')
  return filePath
}
