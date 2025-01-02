import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'plural',
})
export class PluralPipe implements PipeTransform {
  /**
   * Pipe to handle plural grammar
   * @param value Number of items to check for plurality
   * @param singular Singular word
   * @param plural Plural word, only required if plural != singular + 's'
   * @returns Number with word using correct grammar
   */
  transform(value: number, singular: string, plural?: string): string {
    if (value === 1) {
      return `${value} ${singular}`;
    } else {
      return `${value} ${plural ?? singular + 's'}`;
    }
  }
}
