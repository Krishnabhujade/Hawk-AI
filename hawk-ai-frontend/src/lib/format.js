// Number and text formatting shared by every screen.

const MINUS = '−'; // proper minus sign, lines up in tabular numbers

/** 24214.5 -> "24,214.50" (Indian digit grouping) */
export function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 1.234 -> "+1.23", -0.4 -> "−0.40" */
export function signed(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const text = fmt(Math.abs(value), digits);
  if (value > 0) return `+${text}`;
  if (value < 0) return `${MINUS}${text}`;
  return text;
}

/** 1.234 -> "+1.23%" */
export const pct = (value, digits = 2) => `${signed(value, digits)}%`;

/** 4120 -> "₹4,120" */
export const rupees = (value, digits = 0) => `₹${fmt(value, digits)}`;

/** Direction arrow for UP / DOWN / FLAT */
export function glyph(dir) {
  if (dir === 'UP') return '▲';
  if (dir === 'DOWN') return '▼';
  return '■';
}

/** Arrow for a signed number */
export const changeGlyph = (value) => (value >= 0 ? '▲' : '▼');

/** Colour for a signed number: steel blue for gains, graphite for losses */
export const changeTone = (value) =>
  value >= 0 ? 'var(--color-accent-700)' : 'var(--color-neutral-800)';

/** Epoch ms -> "14:05" in India time */
export function timeIST(ms, withSeconds = false) {
  return new Date(ms).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  });
}

/** Epoch ms -> "Tue 16 Sep" in India time */
export function dayIST(ms) {
  return new Date(ms).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).replace(',', '');
}

/** "Krishna Bhujade" -> "KB" */
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'HA';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}
