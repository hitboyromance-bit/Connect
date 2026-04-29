type CsvValue = string | number | boolean | null | undefined | Date;

function escapeCsvValue(value: CsvValue) {
  const normalized = value instanceof Date ? value.toISOString() : value ?? '';
  const text = String(normalized);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, rows: Record<string, CsvValue>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
