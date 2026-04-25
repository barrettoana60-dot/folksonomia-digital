export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeText(text).split(' ').filter(t => t.length > 2);
}
