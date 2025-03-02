import { StringUtils } from './string-utils';

describe('StringUtils', () => {
  describe('toCamelCase', () => {
    it('should convert a simple string to camel case', () => {
      expect(StringUtils.toCamelCase('hello world')).toBe('helloWorld');
    });

    it('should handle strings with multiple spaces', () => {
      expect(StringUtils.toCamelCase('hello  world  test')).toBe('helloWorldTest');
    });

    it('should handle already camel case strings', () => {
      expect(StringUtils.toCamelCase('helloWorld')).toBe('helloWorld');
    });

    it('should handle uppercase strings', () => {
      expect(StringUtils.toCamelCase('HELLO WORLD')).toBe('helloWorld');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.toCamelCase('')).toBe('');
    });
  });

  describe('toPascalCase', () => {
    it('should convert a simple string to pascal case', () => {
      expect(StringUtils.toPascalCase('hello world')).toBe('HelloWorld');
    });

    it('should handle strings with multiple spaces', () => {
      expect(StringUtils.toPascalCase('hello  world  test')).toBe('HelloWorldTest');
    });

    it('should handle already pascal case strings', () => {
      expect(StringUtils.toPascalCase('HelloWorld')).toBe('HelloWorld');
    });

    it('should handle uppercase strings', () => {
      expect(StringUtils.toPascalCase('HELLO WORLD')).toBe('HELLOWORLD');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.toPascalCase('')).toBe('');
    });
  });

  describe('toKebabCase', () => {
    it('should convert a simple string to kebab case', () => {
      expect(StringUtils.toKebabCase('hello world')).toBe('hello-world');
    });

    it('should handle strings with multiple spaces', () => {
      expect(StringUtils.toKebabCase('hello  world  test')).toBe('hello-world-test');
    });

    it('should handle camel case strings', () => {
      expect(StringUtils.toKebabCase('helloWorld')).toBe('hello-world');
    });

    it('should handle pascal case strings', () => {
      expect(StringUtils.toKebabCase('HelloWorld')).toBe('hello-world');
    });

    it('should handle uppercase strings', () => {
      expect(StringUtils.toKebabCase('HELLO WORLD')).toBe('hello-world');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.toKebabCase('')).toBe('');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert a simple string to snake case', () => {
      expect(StringUtils.toSnakeCase('hello world')).toBe('hello_world');
    });

    it('should handle strings with multiple spaces', () => {
      expect(StringUtils.toSnakeCase('hello  world  test')).toBe('hello_world_test');
    });

    it('should handle camel case strings', () => {
      expect(StringUtils.toSnakeCase('helloWorld')).toBe('hello_world');
    });

    it('should handle pascal case strings', () => {
      expect(StringUtils.toSnakeCase('HelloWorld')).toBe('hello_world');
    });

    it('should handle uppercase strings', () => {
      expect(StringUtils.toSnakeCase('HELLO WORLD')).toBe('hello_world');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.toSnakeCase('')).toBe('');
    });
  });
});