import {
  getSafetyName,
  getProjectName,
  isValidIdentifier,
  START_NAME_PATTERN,
  CONTAIN_NAME_PATTERN,
  IDENTIFIER_PATTERN,
} from '../naming';

describe('naming utils', () => {
  describe('patterns', () => {
    describe('START_NAME_PATTERN', () => {
      it('should match underscore', () => {
        expect(START_NAME_PATTERN.test('_')).toBe(true);
      });

      it('should match lowercase letter', () => {
        expect(START_NAME_PATTERN.test('a')).toBe(true);
      });

      it('should match uppercase letter', () => {
        expect(START_NAME_PATTERN.test('Z')).toBe(true);
      });

      it('should not match digit', () => {
        expect(START_NAME_PATTERN.test('1')).toBe(false);
      });

      it('should not match special character', () => {
        expect(START_NAME_PATTERN.test('-')).toBe(false);
      });
    });

    describe('CONTAIN_NAME_PATTERN', () => {
      it('should match word characters', () => {
        expect(CONTAIN_NAME_PATTERN.test('abc123_XYZ')).toBe(true);
      });

      it('should not match hyphen', () => {
        expect(CONTAIN_NAME_PATTERN.test('abc-def')).toBe(false);
      });

      it('should not match space', () => {
        expect(CONTAIN_NAME_PATTERN.test('abc def')).toBe(false);
      });
    });

    describe('IDENTIFIER_PATTERN', () => {
      it('should match valid identifier starting with letter', () => {
        expect(IDENTIFIER_PATTERN.test('myVar')).toBe(true);
      });

      it('should match valid identifier starting with underscore', () => {
        expect(IDENTIFIER_PATTERN.test('_private')).toBe(true);
      });

      it('should match identifier with digits', () => {
        expect(IDENTIFIER_PATTERN.test('var123')).toBe(true);
      });

      it('should not match identifier starting with digit', () => {
        expect(IDENTIFIER_PATTERN.test('123var')).toBe(false);
      });

      it('should not match identifier with hyphen', () => {
        expect(IDENTIFIER_PATTERN.test('my-var')).toBe(false);
      });
    });
  });

  describe('getSafetyName', () => {
    it('should return name unchanged if valid', () => {
      expect(getSafetyName('validName', 'PREFIX')).toBe('validName');
    });

    it('should return name unchanged if starts with underscore', () => {
      expect(getSafetyName('_private', 'PREFIX')).toBe('_private');
    });

    it('should add prefix if name starts with digit', () => {
      expect(getSafetyName('123name', 'PREFIX')).toBe('PREFIX_123name');
    });

    it('should replace non-word characters with underscore', () => {
      expect(getSafetyName('my-name', 'PREFIX')).toBe('my_name');
    });

    it('should handle multiple non-word characters', () => {
      expect(getSafetyName('my-complex.name!here', 'PREFIX')).toBe(
        'my_complex_name_here',
      );
    });

    it('should handle name starting with special char', () => {
      expect(getSafetyName('-invalid', 'PREFIX')).toBe('PREFIX__invalid');
    });

    it('should handle name starting with digit and containing special chars', () => {
      expect(getSafetyName('123-test', 'PREFIX')).toBe('PREFIX_123_test');
    });

    it('should handle name with all special chars by converting to underscores', () => {
      const specialCharsName = '!!!';
      expect(getSafetyName(specialCharsName, 'P')).toBe('P____');
    });
  });

  describe('getProjectName', () => {
    it('should capitalize first letter', () => {
      expect(getProjectName('myproject')).toBe('Myproject');
    });

    it('should preserve existing capitalization', () => {
      expect(getProjectName('myProject')).toBe('MyProject');
    });

    it('should handle already capitalized name', () => {
      expect(getProjectName('MyProject')).toBe('MyProject');
    });

    it('should sanitize invalid project name starting with digit', () => {
      expect(getProjectName('123project')).toBe(
        'INVALID_PROJECT_NAME_123project',
      );
    });

    it('should sanitize project name with special characters', () => {
      expect(getProjectName('my-project')).toBe('My_project');
    });

    it('should handle single character', () => {
      expect(getProjectName('a')).toBe('A');
    });

    it('should throw for empty string due to infinite recursion', () => {
      expect(() => getProjectName('')).toThrow(
        'Maximum recursion depth exceeded',
      );
    });
  });

  describe('isValidIdentifier', () => {
    it('should return true for empty string', () => {
      expect(isValidIdentifier('')).toBe(true);
    });

    it('should return true for valid identifier', () => {
      expect(isValidIdentifier('myVar')).toBe(true);
    });

    it('should return true for identifier starting with underscore', () => {
      expect(isValidIdentifier('_private')).toBe(true);
    });

    it('should return true for identifier with digits', () => {
      expect(isValidIdentifier('var123')).toBe(true);
    });

    it('should return true for single underscore', () => {
      expect(isValidIdentifier('_')).toBe(true);
    });

    it('should return true for single letter', () => {
      expect(isValidIdentifier('A')).toBe(true);
    });

    it('should return false for identifier starting with digit', () => {
      expect(isValidIdentifier('123var')).toBe(false);
    });

    it('should return false for identifier with hyphen', () => {
      expect(isValidIdentifier('my-var')).toBe(false);
    });

    it('should return false for identifier with space', () => {
      expect(isValidIdentifier('my var')).toBe(false);
    });

    it('should return false for identifier with dot', () => {
      expect(isValidIdentifier('my.var')).toBe(false);
    });
  });
});
