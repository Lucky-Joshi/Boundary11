/**
 * Minimal CSV serialiser used by the admin export endpoints.
 *
 * Values are escaped per RFC 4180 (quotes doubled, fields containing a comma,
 * quote or newline wrapped in quotes). Columns describe the header label and
 * how to read the value from each row.
 */
export function toCsv(rows, columns) {
  const escape = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = columns.map((column) => escape(column.label)).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((column) => escape(typeof column.value === 'function' ? column.value(row) : row[column.value]))
        .join(','),
    )
    .join('\n');
  return `${header}\n${body}\n`;
}
