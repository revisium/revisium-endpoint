import {
  capitalize,
  hasDuplicateKeyCaseInsensitive,
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
