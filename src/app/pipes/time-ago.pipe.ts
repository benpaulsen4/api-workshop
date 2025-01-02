import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  pure: false,
})
export class TimeAgoPipe implements PipeTransform {
  static intervals: Record<string, number> = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  /**
   * Pipe for transforming unix epoch timestamps into human-friendly 'ago-isms'
   * @param value Unix epoch timestamp
   * @returns String stating how long ago the time was
   */
  transform(value: number): string {
    const seconds = Math.floor((Date.now() - value) / 1000);

    // Handle future dates
    if (seconds < 0) {
      return 'in the future';
    }

    // Just now
    if (seconds < 30) {
      return 'just now';
    }

    // Handle each time interval
    for (const [unit, secondsInUnit] of Object.entries(TimeAgoPipe.intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);

      if (interval >= 1) {
        // Special cases for better readability
        if (unit === 'year' && interval === 1) {
          return 'last year';
        }

        if (unit === 'month' && interval === 1) {
          return 'last month';
        }

        if (unit === 'week' && interval === 1) {
          return 'last week';
        }

        if (unit === 'day' && interval === 1) {
          return 'yesterday';
        }

        // Regular cases
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }

    return 'Just now';
  }
}
