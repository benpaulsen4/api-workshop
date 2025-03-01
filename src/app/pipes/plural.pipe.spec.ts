import { PluralPipe } from './plural.pipe';

describe('PluralPipe', () => {
  let pipe: PluralPipe;

  beforeEach(() => {
    pipe = new PluralPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return singular form when value is 1', () => {
    expect(pipe.transform(1, 'item')).toBe('1 item');
    expect(pipe.transform(1, 'category')).toBe('1 category');
  });

  it('should return plural form with "s" when value is not 1 and no plural provided', () => {
    expect(pipe.transform(0, 'item')).toBe('0 items');
    expect(pipe.transform(2, 'item')).toBe('2 items');
    expect(pipe.transform(5, 'category')).toBe('5 categorys');
  });

  it('should return custom plural form when value is not 1 and plural is provided', () => {
    expect(pipe.transform(0, 'child', 'children')).toBe('0 children');
    expect(pipe.transform(2, 'person', 'people')).toBe('2 people');
    expect(pipe.transform(5, 'category', 'categories')).toBe('5 categories');
  });
});
