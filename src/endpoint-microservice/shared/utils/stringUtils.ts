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

export const hasDuplicateKeyCaseInsensitive = (
  arr: string[],
  key: string,
): boolean => {
  const lowerKey = key.toLowerCase();
  let count = 0;
  for (const item of arr) {
    if (item.toLowerCase() === lowerKey) {
      count++;
      if (count > 1) {
        return true;
      }
    }
  }
  return false;
};
