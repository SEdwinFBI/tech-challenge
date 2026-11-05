export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('502')) digits = digits.slice(3);
  if (digits.length === 8) return `+502 ${digits.slice(0, 4)} ${digits.slice(4)}`;
  return raw;
}
