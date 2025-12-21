export const START_NAME_PATTERN = /[_a-zA-Z]/;
export const CONTAIN_NAME_PATTERN = /^\w+$/;
export const IDENTIFIER_PATTERN = /^[_A-Za-z]\w*$/;

export const getSafetyName = (
  name: string,
  prefix: string,
  depth = 0,
): string => {
  if (depth > 100) {
    throw new Error(
      `Maximum recursion depth exceeded for name sanitization: ${name}`,
    );
  }
  if (!START_NAME_PATTERN.test(name[0])) {
    return getSafetyName(`${prefix}_${name}`, prefix, depth + 1);
  }
  if (!CONTAIN_NAME_PATTERN.test(name)) {
    return getSafetyName(name.replaceAll(/\W/g, '_'), prefix, depth + 1);
  }
  return name;
};

export const getProjectName = (projectName: string): string => {
  const capitalizeFirst = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);
  return getSafetyName(capitalizeFirst(projectName), 'INVALID_PROJECT_NAME');
};

export const isValidIdentifier = (value: string): boolean => {
  return value === '' || IDENTIFIER_PATTERN.test(value);
};
