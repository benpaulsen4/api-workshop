import {
  ArrayOptions,
  EnumOptions,
  NumberOptions,
  ObjectOptions,
  Property,
  PropertyType,
} from '../../models/schema';

interface PropertyParseResult {
  baseType?: PropertyType;
  qualifier?: string;
  nullable: boolean;
  error?: string;
}

export class PropertyTypeaheadEngine {
  private static MandatoryQualifierTypes = new Set([
    PropertyType.Number,
    PropertyType.Object,
    PropertyType.Array,
    PropertyType.Enum,
  ]);

  private static AssignableTypes = Object.values(PropertyType).filter(
    (t) => t !== PropertyType.Unknown,
  );

  constructor(
    private availableSchemas: Record<string, string> = {},
    private availableEnums: Record<string, string> = {},
  ) {}

  parse(input: string): PropertyParseResult {
    input = input.trim();

    if (!input) {
      return { baseType: undefined, nullable: false, error: 'Empty input' };
    }

    // Check for nullable marker
    const nullable = input.endsWith('?');
    if (nullable) {
      input = input.slice(0, -1).trim();
    }

    // Find the first opening parenthesis
    const openParenIndex = input.indexOf('(');

    // If no parenthesis, it's a simple type
    if (openParenIndex === -1) {
      const baseType = PropertyTypeaheadEngine.AssignableTypes.find(
        (type) => type.toLowerCase() === input.toLowerCase(),
      );

      if (!baseType) {
        return {
          baseType: undefined,
          nullable,
          error: 'Invalid base type',
        };
      }

      // Check if qualifier is required
      if (PropertyTypeaheadEngine.MandatoryQualifierTypes.has(baseType)) {
        return {
          baseType,
          nullable,
          error: `Type ${baseType} requires a qualifier`,
        };
      }

      return { baseType, nullable };
    }

    // Extract base type and qualifier
    const baseTypeStr = input.slice(0, openParenIndex).trim();
    const baseType = PropertyTypeaheadEngine.AssignableTypes.find(
      (type) => type.toLowerCase() === baseTypeStr.toLowerCase(),
    );

    if (!baseType) {
      return {
        baseType: undefined,
        nullable,
        error: 'Invalid base type',
      };
    }

    // Extract qualifier by finding matching parenthesis
    let parenthesesCount = 0;
    let qualifierEnd = -1;

    for (let i = openParenIndex; i < input.length; i++) {
      if (input[i] === '(') parenthesesCount++;
      if (input[i] === ')') parenthesesCount--;
      if (parenthesesCount === 0) {
        qualifierEnd = i;
        break;
      }
    }

    if (qualifierEnd === -1 || parenthesesCount !== 0) {
      return {
        baseType,
        nullable,
        error: 'Mismatched parentheses',
      };
    }

    const qualifier = input.slice(openParenIndex + 1, qualifierEnd).trim();

    // Validate qualifiers based on type
    const qualifierError = this.validateQualifier(baseType, qualifier);
    if (qualifierError) {
      return { baseType, nullable, error: qualifierError };
    }

    return { baseType, qualifier, nullable };
  }

  getSuggestions(input: string): string[] {
    input = input.trim();

    if (!input) {
      return this.getQualifiedBaseSuggestions(
        PropertyTypeaheadEngine.AssignableTypes,
      );
    }

    // If partial type name without parenthesis
    if (!input.includes('(')) {
      const matchingTypes = PropertyTypeaheadEngine.AssignableTypes.filter(
        (type) => type.toLowerCase().startsWith(input.toLowerCase()),
      );

      return this.getQualifiedBaseSuggestions(matchingTypes);
    }

    // Get the type context at cursor position
    const typeContext = this.getTypeContextAtCursor(input);
    if (!typeContext) return [];

    const { currentType, partialQualifier } = typeContext;

    switch (currentType.toLowerCase()) {
      case PropertyType.Number:
        return ['int', 'double']
          .filter((q) => q.startsWith(partialQualifier))
          .map((q) => this.completeTypeString(input, q));

      case PropertyType.Object:
        return ['inline', ...Object.keys(this.availableSchemas)]
          .filter((q) => q.startsWith(partialQualifier))
          .map((q) => this.completeTypeString(input, q));

      case PropertyType.Array:
        return this.getQualifiedBaseSuggestions(
          PropertyTypeaheadEngine.AssignableTypes.filter((type) =>
            type.toLowerCase().startsWith(partialQualifier.toLowerCase()),
          ),
        ).map((q) => this.completeTypeString(input, q));

      case PropertyType.Enum:
        return ['string', 'int', ...Object.keys(this.availableEnums)]
          .filter((q) => q.startsWith(partialQualifier))
          .map((q) => this.completeTypeString(input, q));
    }

    return [];
  }

  private getQualifiedBaseSuggestions(types: PropertyType[]): string[] {
    return types.flatMap((type) => {
      // For types requiring qualifiers, return full type strings with qualifiers
      if (PropertyTypeaheadEngine.MandatoryQualifierTypes.has(type)) {
        switch (type) {
          case PropertyType.Number:
            return ['number (int)', 'number (double)'];
          case PropertyType.Object:
            return [
              'object (inline)',
              ...Object.keys(this.availableSchemas).map(
                (schema) => `object (${schema})`,
              ),
            ];
          //For arrays, initially only suggest unqualified types to prevent infinite suggestions
          case PropertyType.Array:
            return PropertyTypeaheadEngine.AssignableTypes.filter(
              (t) => !PropertyTypeaheadEngine.MandatoryQualifierTypes.has(t),
            ).map((t) => `array (${t})`);
          case PropertyType.Enum:
            return [
              'enum (string)',
              'enum (int)',
              ...Object.keys(this.availableEnums).map(
                (enumName) => `enum (${enumName})`,
              ),
            ];
          default:
            return [];
        }
      }
      // For types not requiring qualifiers, return just the type name
      return [type];
    });
  }

  private getTypeContextAtCursor(
    input: string,
  ): { currentType: string; partialQualifier: string } | null {
    // Count open and closed parentheses up to cursor
    const parenStack: number[] = []; // Stack of indices of opening parentheses
    const matchedParens = new Set<number>(); // Set of indices of matched parentheses

    // First pass: match parentheses
    for (let i = 0; i < input.length; i++) {
      if (input[i] === '(') {
        parenStack.push(i);
      } else if (input[i] === ')' && parenStack.length > 0) {
        const openIndex = parenStack.pop()!;
        matchedParens.add(openIndex);
        matchedParens.add(i);
      }
    }

    // No unmatched parentheses
    if (parenStack.length === 0) return null;

    // Get the last unmatched opening parenthesis
    const lastOpenIndex = Math.max(...parenStack);

    // Get the text before this parenthesis, excluding any matched pairs
    let beforeText = '';
    let i = lastOpenIndex - 1;
    while (i >= 0) {
      if (!matchedParens.has(i)) {
        beforeText = input[i] + beforeText;
      }
      i--;
    }

    // Extract the current type
    const currentType =
      beforeText.trim().split(/\s+/).pop()?.replace('(', '') ?? '';

    // Get the partial qualifier text after the last open parenthesis
    const partialQualifier = input.slice(lastOpenIndex + 1).trim();

    return { currentType, partialQualifier };
  }

  private completeTypeString(input: string, qualifier: string): string {
    // Count unclosed parentheses
    let openCount = 0;
    let closeCount = 0;

    for (const char of input) {
      if (char === '(') openCount++;
      if (char === ')') closeCount++;
    }

    const lastOpenParen = input.lastIndexOf('(');
    const base = input.slice(0, lastOpenParen + 1);
    const closingParens = ')'.repeat(openCount - closeCount);

    return `${base}${qualifier}${closingParens}`;
  }

  private validateQualifier(
    baseType: PropertyType,
    qualifier: string,
  ): string | null {
    // First check if the type requires a qualifier
    if (
      PropertyTypeaheadEngine.MandatoryQualifierTypes.has(baseType) &&
      !qualifier
    ) {
      return `Type ${baseType} requires a qualifier`;
    }

    switch (baseType) {
      case PropertyType.Number:
        if (!['int', 'double'].includes(qualifier)) {
          return 'Number type must have qualifier "int" or "double"';
        }
        break;
      case PropertyType.Object:
        if (qualifier !== 'inline' && !this.availableSchemas[qualifier]) {
          return 'Invalid object reference';
        }
        break;
      case PropertyType.Array: {
        const childParse = this.parse(qualifier);
        if (childParse.error) {
          return `Invalid array child type: ${childParse.error}`;
        }
        break;
      }
      case PropertyType.Enum:
        if (
          !['string', 'int'].includes(qualifier) &&
          !this.availableEnums[qualifier]
        ) {
          return 'Enum must have the type "string" or "int" or be a valid reference';
        }
        break;
      default:
        if (qualifier) {
          return 'This type does not accept qualifiers';
        }
    }
    return null;
  }

  toProperty(parseResult: PropertyParseResult, name: string): Property | null {
    if (parseResult.error) return null;

    const property: Property = {
      name,
      type: parseResult.baseType!,
      nullable: parseResult.nullable,
    };

    if (parseResult.qualifier) {
      switch (parseResult.baseType) {
        case PropertyType.Number:
          property.options = {
            doublePrecision: parseResult.qualifier === 'double',
          } as NumberOptions;
          break;

        case PropertyType.Object:
          if (parseResult.qualifier === 'inline') {
            property.options = {
              objectType: 'inline',
              childProperties: [],
            } as ObjectOptions;
          } else {
            property.options = {
              objectType: 'ref',
              refId: this.availableSchemas[parseResult.qualifier],
            } as ObjectOptions;
          }
          break;

        case PropertyType.Array: {
          const childParse = this.parse(parseResult.qualifier);
          property.options = {
            childType: childParse.baseType,
            childOptions: childParse.qualifier
              ? this.toProperty(childParse, '')?.options
              : undefined,
          } as ArrayOptions;
          break;
        }

        case PropertyType.Enum:
          if (
            parseResult.qualifier !== 'string' &&
            parseResult.qualifier !== 'int'
          ) {
            property.options = {
              enumType: 'ref',
              refId: this.availableEnums[parseResult.qualifier],
            } as EnumOptions;
          } else {
            property.options = {
              enumType: parseResult.qualifier,
              values: [],
            } as EnumOptions;
          }
          break;
      }
    }

    return property;
  }
}
