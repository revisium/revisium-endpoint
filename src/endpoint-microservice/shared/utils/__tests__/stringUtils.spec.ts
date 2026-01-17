import {
  capitalize,
  hasDuplicateKeyCaseInsensitive,
  isAllUpperCase,
  lowerFirst,
  pluralize,
  toCamelCaseFieldName,
  upperFirst,
} from 'src/endpoint-microservice/shared/utils/stringUtils';

describe('stringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize first letter and preserve rest', () => {
      expect(capitalize('test')).toBe('Test');
      expect(capitalize('Test')).toBe('Test');
      expect(capitalize('tEST')).toBe('TEST');
      expect(capitalize('t')).toBe('T');
      expect(capitalize('_Test')).toBe('_Test');
      expect(capitalize('myTable')).toBe('MyTable');
    });
  });

  describe('lowerFirst', () => {
    it('should lowercase first letter and preserve rest', () => {
      expect(lowerFirst('Test')).toBe('test');
      expect(lowerFirst('TEST')).toBe('tEST');
      expect(lowerFirst('MyTable')).toBe('myTable');
      expect(lowerFirst('myTable')).toBe('myTable');
      expect(lowerFirst('')).toBe('');
    });
  });

  describe('upperFirst', () => {
    it('should uppercase first letter and preserve rest', () => {
      expect(upperFirst('test')).toBe('Test');
      expect(upperFirst('TEST')).toBe('TEST');
      expect(upperFirst('myTable')).toBe('MyTable');
      expect(upperFirst('')).toBe('');
    });
  });

  describe('isAllUpperCase', () => {
    it('should return true for all uppercase strings', () => {
      expect(isAllUpperCase('TEST')).toBe(true);
      expect(isAllUpperCase('USER')).toBe(true);
      expect(isAllUpperCase('A')).toBe(true);
    });

    it('should return false for mixed case or lowercase', () => {
      expect(isAllUpperCase('Test')).toBe(false);
      expect(isAllUpperCase('test')).toBe(false);
      expect(isAllUpperCase('tEST')).toBe(false);
      expect(isAllUpperCase('')).toBe(false);
    });
  });

  describe('toCamelCaseFieldName', () => {
    it('should convert to lowerCamelCase for field names', () => {
      expect(toCamelCaseFieldName('MyTable')).toBe('myTable');
      expect(toCamelCaseFieldName('User')).toBe('user');
      expect(toCamelCaseFieldName('user')).toBe('user');
    });

    it('should convert all uppercase to lowercase', () => {
      expect(toCamelCaseFieldName('USER')).toBe('user');
      expect(toCamelCaseFieldName('TEST')).toBe('test');
    });

    it('should preserve camelCase for mixed case starting with lowercase', () => {
      expect(toCamelCaseFieldName('myTable')).toBe('myTable');
      expect(toCamelCaseFieldName('userPost')).toBe('userPost');
    });

    it('should handle empty string', () => {
      expect(toCamelCaseFieldName('')).toBe('');
    });
  });

  describe('pluralize', () => {
    it('should pluralize regular words', () => {
      expect(pluralize('cat')).toBe('cats');
      expect(pluralize('dog')).toBe('dogs');
    });

    it('should not change words already ending with s', () => {
      expect(pluralize('bus')).toBe('buses');
      expect(pluralize('glass')).toBe('glasses');
    });

    it('should add "es" for ch, sh, x, z endings', () => {
      expect(pluralize('box')).toBe('boxes');
      expect(pluralize('church')).toBe('churches');
      expect(pluralize('bush')).toBe('bushes');
      expect(pluralize('buzz')).toBe('buzzes');
    });

    it('should replace consonant+y with ies', () => {
      expect(pluralize('baby')).toBe('babies');
      expect(pluralize('city')).toBe('cities');
    });

    it('should add s for vowel+y endings', () => {
      expect(pluralize('ray')).toBe('rays');
      expect(pluralize('key')).toBe('keys');
    });
  });

  describe('hasDuplicateKeyCaseInsensitive', () => {
    it('returns false when key not present', () => {
      expect(hasDuplicateKeyCaseInsensitive([], 'a')).toBe(false);
      expect(hasDuplicateKeyCaseInsensitive(['b'], 'a')).toBe(false);
    });

    it('returns false when key present only once', () => {
      expect(hasDuplicateKeyCaseInsensitive(['a'], 'a')).toBe(false);
      expect(hasDuplicateKeyCaseInsensitive(['A'], 'a')).toBe(false);
    });

    it('returns true when key appears at least twice', () => {
      expect(hasDuplicateKeyCaseInsensitive(['a', 'A'], 'a')).toBe(true);
      expect(hasDuplicateKeyCaseInsensitive(['x', 'y', 'X'], 'x')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(hasDuplicateKeyCaseInsensitive(['Key', 'key', 'KEY'], 'kEy')).toBe(
        true,
      );
    });

    it('returns false when other items repeat but not the key', () => {
      expect(hasDuplicateKeyCaseInsensitive(['b', 'b', 'c'], 'a')).toBe(false);
    });
  });
});
