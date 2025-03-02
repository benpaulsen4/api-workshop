import { CustomValidators } from './custom-validators';
import { signal } from '@angular/core';
import { FormControl } from '@angular/forms';

describe('CustomValidators', () => {
  describe('noDuplicates', () => {
    it('should return error when value already exists in the array', () => {
      // Given
      const existingValues = signal(['apple', 'banana', 'orange']);
      const validator = CustomValidators.noDuplicates(existingValues);
      const control = new FormControl('banana');

      // When
      const result = validator(control);

      // Then
      expect(result).toEqual({ duplicate: true });
    });

    it('should return null when value does not exist in the array', () => {
      // Given
      const existingValues = signal(['apple', 'banana', 'orange']);
      const validator = CustomValidators.noDuplicates(existingValues);
      const control = new FormControl('grape');

      // When
      const result = validator(control);

      // Then
      expect(result).toBeNull();
    });

    it('should return null when array is empty', () => {
      // Given
      const existingValues = signal([]);
      const validator = CustomValidators.noDuplicates(existingValues);
      const control = new FormControl('apple');

      // When
      const result = validator(control);

      // Then
      expect(result).toBeNull();
    });

    it('should return null when array is undefined', () => {
      // Given
      const existingValues = signal(undefined);
      const validator = CustomValidators.noDuplicates(existingValues);
      const control = new FormControl('apple');

      // When
      const result = validator(control);

      // Then
      expect(result).toBeNull();
    });

    it('should handle case-sensitive comparisons correctly', () => {
      // Given
      const existingValues = signal(['Apple', 'Banana', 'Orange']);
      const validator = CustomValidators.noDuplicates(existingValues);
      const control = new FormControl('apple');

      // When
      const result = validator(control);

      // Then
      expect(result).toBeNull(); // Should be null as 'apple' !== 'Apple'
    });

    it('should handle number values correctly', () => {
      // Given
      const existingValues = signal([1, 2, 3]);
      const validator = CustomValidators.noDuplicates(existingValues);
      const control = new FormControl(2);

      // When
      const result = validator(control);

      // Then
      expect(result).toEqual({ duplicate: true });
    });
  });
});
