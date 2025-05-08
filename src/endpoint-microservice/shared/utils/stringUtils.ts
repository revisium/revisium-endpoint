export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const pluralize = (str: string): string => {
  if (str.endsWith('s')) {
    return str + 'es';
  }
  const lower = str.toLowerCase();
  const last = lower.slice(-1);
  const last2 = lower.slice(-2);

  // ch, sh, x, z
  if (['ch', 'sh'].includes(last2) || ['x', 'z'].includes(last)) {
    return str + 'es';
  }

  // consonant + y -> ies
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  if (last === 'y' && !vowels.includes(lower.charAt(lower.length - 2))) {
    return str.slice(0, -1) + 'ies';
  }

  return str + 's';
};

export const hasDuplicateKeysCaseInsensitive = (
  obj: Record<string, any>,
): boolean => {
  const seen = new Set<string>();
  for (const key of Object.keys(obj)) {
    const lower = key.toLowerCase();
    if (seen.has(lower)) {
      return true;
    }
    seen.add(lower);
  }
  return false;
};
