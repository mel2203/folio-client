export function formatCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (!match) return '—'

  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

export function getTodayCalendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getFirstDayOfMonth(date) {
  return `${date.slice(0, 7)}-01`
}

export function addCalendarDays(value, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match || !Number.isInteger(days)) return ''
  const [, year, month, day] = match
  // Use UTC as a Gregorian calendar arithmetic engine; the input is never parsed as an instant.
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + days))
  return date.toISOString().slice(0, 10)
}
