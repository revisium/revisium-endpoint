import {
  capitalize,
  hasDuplicateKeysCaseInsensitive,
  pluralize,
} from 'src/endpoint-microservice/shared/utils/stringUtils';

describe('stringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize', () => {
      expect(capitalize('test')).toBe('Test');
      expect(capitalize('Test')).toBe('Test');
      expect(capitalize('tEST')).toBe('Test');
      expect(capitalize('t')).toBe('T');
      expect(capitalize('_Test')).toBe('_test');
      expect(capitalize('t_Test')).toBe('T_test');
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

  describe('hasDuplicateKeysCaseInsensitive', () => {
    it('returns false for empty object', () => {
      expect(hasDuplicateKeysCaseInsensitive({})).toBe(false);
    });

    it('returns false when all keys unique ignoring case', () => {
      expect(hasDuplicateKeysCaseInsensitive({ a: 1, B: 2, c: 3 })).toBe(false);
    });

    it('returns true when keys differ only by case', () => {
      expect(hasDuplicateKeysCaseInsensitive({ a: 1, A: 2 })).toBe(true);
      expect(hasDuplicateKeysCaseInsensitive({ foo: 1, FOO: 2, bar: 3 })).toBe(
        true,
      );
    });

    it('detects multiple pairs of duplicates', () => {
      const obj = { x: 1, X: 2, y: 3, Y: 4, z: 5 };
      expect(hasDuplicateKeysCaseInsensitive(obj)).toBe(true);
    });

    it('ignores truly distinct keys', () => {
      expect(
        hasDuplicateKeysCaseInsensitive({ apple: 1, banana: 2, Cherry: 3 }),
      ).toBe(false);
    });
  });
});
