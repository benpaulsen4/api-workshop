export class StringUtils {
  static toCamelCase(str: string): string {
    // If string has no spaces, just make sure that the first letter is lowercase
    if (!/\s/.test(str)) {
      const firstLetter = str.charAt(0).toLowerCase();
      str = firstLetter + str.slice(1);
      return str;
    }

    return str
      .toLowerCase()
      .replace(/(?:^|\s+)\w/g, (letter, index) =>
        index === 0 ? letter.toLowerCase() : letter.toUpperCase(),
      )
      .replace(/\s+/g, '');
  }

  static toPascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
      .replace(/\s+/g, '');
  }

  static toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  static toSnakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }
}
