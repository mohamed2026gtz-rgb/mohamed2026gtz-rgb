/** Minimal CSV parser for import uploads (quoted fields supported). */
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsv(text) {
  const normalized = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.trim());
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    if (!cols.some((c) => c.trim())) continue;
    const row = { __rowNumber: i + 1 };
    headers.forEach((header, idx) => {
      if (header) row[header] = cols[idx] != null ? cols[idx].trim() : '';
    });
    rows.push(row);
  }

  return rows;
}

module.exports = { parseCsv, splitCsvLine, normalizeHeader };