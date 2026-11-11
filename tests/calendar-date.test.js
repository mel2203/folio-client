import { describe, expect, it } from 'vitest'
import {
  formatCalendarDate,
  addCalendarDays,
  getFirstDayOfMonth,
  getTodayCalendarDate,
} from '../src/utils/calendar-date.js'

describe('formatCalendarDate', () => {
  it('formats a date-only value as dd/mm/yyyy', () => {
    expect(formatCalendarDate('2026-11-04')).toBe('04/11/2026')
  })

  it('uses the calendar date prefix of a timestamp without timezone conversion', () => {
    expect(formatCalendarDate('2026-11-04T16:00:00.000Z')).toBe('04/11/2026')
  })

  it('returns a placeholder for invalid values', () => {
    expect(formatCalendarDate('not-a-date')).toBe('—')
  })
})

describe('report date defaults', () => {
  it('gets today in Kuala Lumpur time', () => {
    expect(getTodayCalendarDate(new Date('2026-11-07T16:00:00.000Z'))).toBe('2026-11-08')
  })

  it('gets the first day of the selected month without parsing through a timezone', () => {
    expect(getFirstDayOfMonth('2026-11-08')).toBe('2026-11-01')
  })

  it('adds due-date terms as calendar days', () => {
    expect(addCalendarDays('2026-11-30', 30)).toBe('2026-12-30')
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29')
  })
})
